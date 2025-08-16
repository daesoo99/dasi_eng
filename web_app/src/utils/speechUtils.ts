// Speech utilities for STT and TTS functionality

export interface STTOptions {
  language?: string;
  continuous?: boolean;
  interim?: boolean;
  maxAlternatives?: number;
}

export interface STTResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

// Browser-based Speech-to-Text using Web Speech API
export class BrowserSTT {
  private recognition: SpeechRecognition | null = null;
  private isSupported = false;

  constructor() {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.isSupported = true;
      this.setupRecognition();
    }
  }

  private setupRecognition() {
    if (!this.recognition) return;

    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;
    this.recognition.lang = 'en-US';
  }

  isAvailable(): boolean {
    return this.isSupported;
  }

  async startRecording(options: STTOptions = {}): Promise<STTResult> {
    if (!this.recognition || !this.isSupported) {
      throw new Error('Speech recognition not supported in this browser');
    }

    return new Promise((resolve, reject) => {
      this.recognition!.lang = options.language || 'en-US';
      this.recognition!.continuous = options.continuous || false;
      this.recognition!.interimResults = options.interim || false;

      this.recognition!.onresult = (event) => {
        const result = event.results[0];
        if (result) {
          const transcript = result[0].transcript.trim();
          const confidence = result[0].confidence || 0.8;
          resolve({
            transcript,
            confidence,
            isFinal: result.isFinal
          });
        }
      };

      this.recognition!.onerror = (event) => {
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      this.recognition!.onend = () => {
        // Recognition ended without result
      };

      try {
        this.recognition!.start();
      } catch (error) {
        reject(error);
      }
    });
  }

  stopRecording(): void {
    if (this.recognition) {
      this.recognition.stop();
    }
  }
}

// Text-to-Speech utilities
export class BrowserTTS {
  private synth: SpeechSynthesis;
  private isSupported = false;

  constructor() {
    if ('speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.isSupported = true;
    }
  }

  isAvailable(): boolean {
    return this.isSupported;
  }

  getVoices(): SpeechSynthesisVoice[] {
    if (!this.isSupported) return [];
    return this.synth.getVoices();
  }

  speak(text: string, options: {
    lang?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
    voice?: SpeechSynthesisVoice;
  } = {}): Promise<void> {
    if (!this.isSupported) {
      return Promise.reject(new Error('Speech synthesis not supported'));
    }

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      utterance.lang = options.lang || 'en-US';
      utterance.rate = options.rate || 0.9;
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume || 1.0;
      
      if (options.voice) {
        utterance.voice = options.voice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(new Error(`TTS error: ${event.error}`));

      // Cancel any ongoing speech
      this.synth.cancel();
      this.synth.speak(utterance);
    });
  }

  stop(): void {
    if (this.isSupported) {
      this.synth.cancel();
    }
  }
}

// Cloud STT (via backend proxy)
export class CloudSTT {
  private apiBaseUrl: string;

  constructor(apiBaseUrl: string) {
    this.apiBaseUrl = apiBaseUrl;
  }

  async transcribeAudio(audioBlob: Blob, options: {
    language?: string;
    phraseHints?: string[];
  } = {}): Promise<STTResult> {
    try {
      // Convert blob to base64
      const base64Audio = await this.blobToBase64(audioBlob);
      
      const response = await fetch(`${this.apiBaseUrl}/stt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioBase64: base64Audio,
          languageCode: options.language || 'en-US',
          phraseHints: options.phraseHints || []
        })
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'STT service error');
      }

      return {
        transcript: data.transcript || '',
        confidence: data.confidence || 0,
        isFinal: true
      };

    } catch (error) {
      throw new Error(`Cloud STT error: ${error}`);
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (data:audio/webm;base64,)
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

// Audio recording utilities
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async startRecording(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
    } catch (error) {
      throw new Error(`Failed to start recording: ${error}`);
    }
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.cleanup();
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }
}

// Declare global speech recognition interfaces
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}
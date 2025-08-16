export class ASRClient {
  private recognition: any = null;
  private isListening: boolean = false;
  private isPaused: boolean = false;
  private currentTranscript: string = '';
  private sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.initializeRecognition();
  }

  private initializeRecognition(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      throw new Error('Speech recognition not supported in this browser');
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
  }

  async startListening(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not initialized'));
        return;
      }

      this.currentTranscript = '';
      this.isListening = true;
      this.isPaused = false;

      this.recognition.onstart = () => resolve();
      this.recognition.onerror = (event: any) => {
        this.isListening = false;
        reject(new Error(`ASR Error: ${event.error}`));
      };

      this.recognition.onresult = (event: any) => {
        if (this.isPaused) return;

        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        this.currentTranscript = transcript;
      };

      this.recognition.start();
    });
  }

  async stopListening(): Promise<string> {
    return new Promise((resolve) => {
      if (!this.recognition || !this.isListening) {
        resolve(this.currentTranscript);
        return;
      }

      this.recognition.onend = () => {
        this.isListening = false;
        resolve(this.currentTranscript);
      };

      this.recognition.stop();
    });
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }

  cancel(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
    this.isListening = false;
    this.isPaused = false;
    this.currentTranscript = '';
  }

  getCurrentTranscript(): string {
    return this.currentTranscript;
  }

  isActive(): boolean {
    return this.isListening && !this.isPaused;
  }
}
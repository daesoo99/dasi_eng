import { AudioSession } from './AudioSession';
import type { AudioConfig, SessionCallbacks } from './types';

export class AudioSessionFactory {
  private static levelConfigs: Record<number, Partial<AudioConfig>> = {
    1: {
      thinkTime: 3,
      recordTime: 10,
      promptDelay: 1000,
      beepDuration: 300,
      enableVAD: false,
      vadThreshold: 0.1,
      preRollTime: 500,
      graceLateTime: 1000
    },
    2: {
      thinkTime: 3,
      recordTime: 12,
      promptDelay: 800,
      beepDuration: 250,
      enableVAD: true,
      vadThreshold: 0.15,
      preRollTime: 400,
      graceLateTime: 800
    },
    3: {
      thinkTime: 2,
      recordTime: 15,
      promptDelay: 600,
      beepDuration: 200,
      enableVAD: true,
      vadThreshold: 0.2,
      preRollTime: 300,
      graceLateTime: 600
    },
    4: {
      thinkTime: 2,
      recordTime: 20,
      promptDelay: 500,
      beepDuration: 150,
      enableVAD: true,
      vadThreshold: 0.25,
      preRollTime: 200,
      graceLateTime: 400
    },
    5: {
      thinkTime: 1,
      recordTime: 25,
      promptDelay: 300,
      beepDuration: 100,
      enableVAD: true,
      vadThreshold: 0.3,
      preRollTime: 150,
      graceLateTime: 300
    },
    6: {
      thinkTime: 1,
      recordTime: 30,
      promptDelay: 200,
      beepDuration: 100,
      enableVAD: true,
      vadThreshold: 0.35,
      preRollTime: 100,
      graceLateTime: 200
    }
  };

  static async create(level: number, callbacks: SessionCallbacks = {}): Promise<AudioSession> {
    // Validate browser compatibility
    await this.checkBrowserCompatibility();

    // Get level-specific configuration
    const levelConfig = this.levelConfigs[level] || this.levelConfigs[1];
    
    const config: AudioConfig = {
      level,
      ...levelConfig
    } as AudioConfig;

    // Generate unique session ID
    const sessionId = `session_${level}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return new AudioSession(sessionId, config, callbacks);
  }

  private static async checkBrowserCompatibility(): Promise<void> {
    const issues: string[] = [];

    // Check MediaRecorder
    if (!window.MediaRecorder) {
      issues.push('MediaRecorder API not supported');
    }

    // Check getUserMedia
    if (!navigator.mediaDevices?.getUserMedia) {
      issues.push('getUserMedia API not supported');
    }

    // Check Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      issues.push('Speech Recognition API not supported');
    }

    // Check Speech Synthesis
    if (!window.speechSynthesis) {
      issues.push('Speech Synthesis API not supported');
    }

    // Check Web Audio API
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) {
      issues.push('Web Audio API not supported');
    }

    if (issues.length > 0) {
      throw new Error(`Browser compatibility issues: ${issues.join(', ')}`);
    }

    // Test microphone access
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
    } catch (_error) {
      throw new Error('Microphone access denied or not available');
    }
  }

  static getSupportedLevels(): number[] {
    return Object.keys(this.levelConfigs).map(Number).sort((a, b) => a - b);
  }

  static getLevelConfig(level: number): Partial<AudioConfig> {
    return { ...this.levelConfigs[level] } || { ...this.levelConfigs[1] };
  }
}
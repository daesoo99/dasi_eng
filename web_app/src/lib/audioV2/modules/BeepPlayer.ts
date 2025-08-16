export class BeepPlayer {
  private audioContext: AudioContext | null = null;
  private currentOscillator: OscillatorNode | null = null;
  private isInitialized: boolean = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.isInitialized = true;
    } catch (error) {
      throw new Error('Failed to initialize audio context for beep player');
    }
  }

  async playBeep(frequency: number = 800, duration: number = 200): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.audioContext) {
      throw new Error('Audio context not available');
    }

    return new Promise((resolve) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();

      this.currentOscillator = oscillator;

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);

      oscillator.frequency.setValueAtTime(frequency, this.audioContext!.currentTime);
      gainNode.gain.setValueAtTime(0.3, this.audioContext!.currentTime);

      oscillator.start();
      oscillator.stop(this.audioContext!.currentTime + duration / 1000);

      oscillator.onended = () => {
        this.currentOscillator = null;
        resolve();
      };
    });
  }

  stop(): void {
    if (this.currentOscillator) {
      this.currentOscillator.stop();
      this.currentOscillator = null;
    }
  }

  cleanup(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.isInitialized = false;
  }
}
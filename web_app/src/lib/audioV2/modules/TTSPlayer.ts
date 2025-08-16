export class TTSPlayer {
  private synthesis: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private sessionId: string;
  private isSuspended: boolean = false;

  constructor(sessionId: string) {
    this.synthesis = window.speechSynthesis;
    this.sessionId = sessionId;
  }

  async speak(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isSuspended) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance;

      utterance.onend = () => {
        this.currentUtterance = null;
        resolve();
      };

      utterance.onerror = (event) => {
        this.currentUtterance = null;
        reject(new Error(`TTS Error: ${event.error}`));
      };

      this.synthesis.speak(utterance);
    });
  }

  suspend(): void {
    this.isSuspended = true;
    if (this.currentUtterance) {
      this.synthesis.cancel();
      this.currentUtterance = null;
    }
  }

  resume(): void {
    this.isSuspended = false;
  }

  stop(): void {
    this.synthesis.cancel();
    this.currentUtterance = null;
  }
}
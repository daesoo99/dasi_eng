import { StageClock } from './modules/StageClock';
import { TTSPlayer } from './modules/TTSPlayer';
import { BeepPlayer } from './modules/BeepPlayer';
import { Recorder } from './modules/Recorder';
import { ASRClient } from './modules/ASRClient';
import type { SessionState, SessionCallbacks, AudioConfig, AudioError, SessionResult } from './types';

export class AudioSession {
  private sessionId: string;
  private state: SessionState = 'IDLE';
  private callbacks: SessionCallbacks;
  private config: AudioConfig;
  private isPaused: boolean = false;
  private isActive: boolean = false;

  // Modules
  private clock: StageClock;
  private tts: TTSPlayer;
  private beep: BeepPlayer;
  private recorder: Recorder;
  private asr: ASRClient;

  constructor(sessionId: string, config: AudioConfig, callbacks: SessionCallbacks = {}) {
    this.sessionId = sessionId;
    this.config = config;
    this.callbacks = callbacks;

    // Initialize modules
    this.clock = new StageClock();
    this.tts = new TTSPlayer(sessionId);
    this.beep = new BeepPlayer();
    this.recorder = new Recorder(config);
    this.asr = new ASRClient(sessionId);
  }

  async start(): Promise<void> {
    if (this.isActive) {
      throw new Error('Session already active');
    }

    this.isActive = true;
    this.setState('INIT');
    this.clock.start();

    try {
      await this.runLifecycle();
    } catch (error) {
      this.handleError({
        code: 'LIFECYCLE_ERROR',
        message: error instanceof Error ? error.message : 'Unknown lifecycle error',
        severity: 'high',
        timestamp: Date.now()
      });
    }
  }

  private async runLifecycle(): Promise<void> {
    // PREPARE
    this.setState('PREPARE');
    await this.preparePage();

    // PROMPT
    this.setState('PROMPT');
    await this.playPrompt();

    // THINK
    this.setState('THINK');
    await this.thinkTime();

    // BEEP
    this.setState('BEEP');
    await this.playBeep();

    // RECORD
    this.setState('RECORD');
    await this.recordAudio();

    // ASR
    this.setState('ASR');
    const transcript = await this.processASR();

    // SCORE
    this.setState('SCORE');
    const result = await this.scoreResponse(transcript);

    // FEEDBACK
    this.setState('FEEDBACK');
    await this.provideFeedback(result);

    // COMPLETE
    this.setState('COMPLETE');
    this.callbacks.onResult?.(result);
  }

  private async preparePage(): Promise<void> {
    if (this.isPaused) await this.waitForResume();
    await new Promise(resolve => setTimeout(resolve, this.config.promptDelay));
  }

  private async playPrompt(): Promise<void> {
    if (this.isPaused) await this.waitForResume();
    await this.tts.speak("Please answer the following question.");
  }

  private async thinkTime(): Promise<void> {
    if (this.isPaused) await this.waitForResume();
    await new Promise(resolve => setTimeout(resolve, this.config.thinkTime * 1000));
  }

  private async playBeep(): Promise<void> {
    if (this.isPaused) await this.waitForResume();
    await this.beep.playBeep(800, this.config.beepDuration);
  }

  private async recordAudio(): Promise<Blob> {
    if (this.isPaused) await this.waitForResume();
    
    await this.recorder.startRecording();
    await new Promise(resolve => setTimeout(resolve, this.config.recordTime * 1000));
    
    return await this.recorder.stopRecording();
  }

  private async processASR(): Promise<string> {
    if (this.isPaused) await this.waitForResume();
    
    await this.asr.startListening();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Process for 2 seconds
    
    return await this.asr.stopListening();
  }

  private async scoreResponse(transcript: string): Promise<SessionResult> {
    if (this.isPaused) await this.waitForResume();
    
    // Mock scoring
    return {
      transcript,
      confidence: Math.random() * 0.3 + 0.7, // 70-100%
      duration: this.clock.getElapsed(),
      metadata: { level: this.config.level }
    };
  }

  private async provideFeedback(result: SessionResult): Promise<void> {
    if (this.isPaused) await this.waitForResume();
    await this.tts.speak(`Your response was: ${result.transcript}`);
  }

  private async waitForResume(): Promise<void> {
    while (this.isPaused && this.isActive) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  pause(): void {
    if (!this.isActive) return;
    
    this.isPaused = true;
    this.clock.pause();
    this.tts.suspend();
    this.recorder.pause();
    this.asr.pause();
    this.beep.stop();
  }

  resume(): void {
    if (!this.isActive) return;
    
    this.isPaused = false;
    this.clock.resume();
    this.tts.resume();
    this.recorder.resume();
    this.asr.resume();
  }

  cancel(): void {
    this.isActive = false;
    this.isPaused = false;
    
    this.clock.stop();
    this.tts.stop();
    this.beep.stop();
    this.recorder.cleanup();
    this.asr.cancel();
    
    this.setState('CANCELLED');
  }

  private setState(newState: SessionState): void {
    this.state = newState;
    this.callbacks.onStateChange?.(newState);
  }

  private handleError(error: AudioError): void {
    this.setState('ERROR');
    this.callbacks.onError?.(error);
  }

  getState(): SessionState {
    return this.state;
  }

  isPausedState(): boolean {
    return this.isPaused;
  }

  getSessionId(): string {
    return this.sessionId;
  }
}
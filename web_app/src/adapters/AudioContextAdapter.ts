/**
 * AudioContextAdapter - Web Audio API 래핑
 * 목적: Web Audio Context API를 추상화하여 비프음 생성과 오디오 제어 분리
 */

import {
  IAudioContextAdapter,
  AdapterResult,
  BeepOptions
} from './BrowserAPIAdapter';

export class AudioContextAdapter implements IAudioContextAdapter {
  private audioContext: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    try {
      // AudioContext 지원 확인
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      
      if (!AudioContextClass) {
        console.warn('[AudioContextAdapter] Web Audio API not supported');
        return;
      }

      this.isInitialized = true;
      console.log('[AudioContextAdapter] Initialized successfully');
    } catch (error) {
      console.error('[AudioContextAdapter] Initialization failed:', error);
      this.isInitialized = false;
    }
  }

  private createAudioContext(): AudioContext | null {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      return new AudioContextClass();
    } catch (error) {
      console.error('[AudioContextAdapter] Failed to create AudioContext:', error);
      return null;
    }
  }

  // Public Methods

  isSupported(): boolean {
    return this.isInitialized && (window.AudioContext || (window as any).webkitAudioContext);
  }

  async createBeep(options: BeepOptions = {}): Promise<AdapterResult<void>> {
    if (!this.isSupported()) {
      return {
        success: false,
        error: 'Web Audio API not supported'
      };
    }

    try {
      // 기존 비프음 정지
      this.stopBeep();

      // 새 오디오 컨텍스트 생성
      this.audioContext = this.createAudioContext();
      if (!this.audioContext) {
        return {
          success: false,
          error: 'Failed to create AudioContext'
        };
      }

      // 기본 옵션 설정
      const beepOptions = {
        frequency: options.frequency || 800,
        duration: options.duration || 0.5,
        volume: options.volume || 0.3,
        waveType: (options.waveType || 'sine') as ('sine' | 'square' | 'sawtooth' | 'triangle')
      };

      return new Promise((resolve) => {
        try {
          // 오디오 노드 생성
          this.oscillator = this.audioContext!.createOscillator();
          this.gainNode = this.audioContext!.createGain();

          // 노드 연결
          this.oscillator.connect(this.gainNode);
          this.gainNode.connect(this.audioContext!.destination);

          // 오실레이터 설정
          this.oscillator.frequency.setValueAtTime(
            beepOptions.frequency,
            this.audioContext!.currentTime
          );
          this.oscillator.type = beepOptions.waveType;

          // 볼륨 설정
          this.gainNode.gain.setValueAtTime(
            beepOptions.volume,
            this.audioContext!.currentTime
          );

          // 완료 이벤트 핸들러
          this.oscillator.onended = () => {
            console.log('[AudioContextAdapter] Beep completed');
            this.cleanup();
            resolve({
              success: true
            });
          };

          // 비프음 재생
          this.oscillator.start();
          this.oscillator.stop(this.audioContext!.currentTime + beepOptions.duration);

          console.log('[AudioContextAdapter] Beep started with options:', beepOptions);

        } catch (error) {
          console.error('[AudioContextAdapter] Error creating beep:', error);
          this.cleanup();
          resolve({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown beep error'
          });
        }
      });

    } catch (error) {
      console.error('[AudioContextAdapter] Failed to create beep:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  stopBeep(): void {
    try {
      if (this.oscillator) {
        this.oscillator.stop();
        console.log('[AudioContextAdapter] Beep stopped');
      }
    } catch (error) {
      // 이미 정지된 경우 에러가 발생할 수 있음
      console.warn('[AudioContextAdapter] Error stopping beep:', error);
    } finally {
      this.cleanupNodes();
    }
  }

  getContext(): AudioContext | null {
    return this.audioContext;
  }

  private cleanupNodes(): void {
    // 오디오 노드 정리
    if (this.oscillator) {
      this.oscillator.onended = null;
      this.oscillator = null;
    }
    
    if (this.gainNode) {
      this.gainNode = null;
    }
  }

  cleanup(): void {
    console.log('[AudioContextAdapter] Cleaning up...');
    
    // 비프음 정지
    this.stopBeep();
    
    // 오디오 컨텍스트 정리
    if (this.audioContext) {
      try {
        // 컨텍스트 상태 확인 후 정리
        if (this.audioContext.state !== 'closed') {
          this.audioContext.close();
        }
      } catch (error) {
        console.warn('[AudioContextAdapter] Error closing AudioContext:', error);
      } finally {
        this.audioContext = null;
      }
    }
    
    this.cleanupNodes();
    console.log('[AudioContextAdapter] Cleanup completed');
  }

  // 오디오 컨텍스트 상태 조회 메서드들
  getState(): 'suspended' | 'running' | 'closed' | null {
    return (this.audioContext?.state as ('suspended' | 'running' | 'closed')) || null;
  }

  async resumeContext(): Promise<boolean> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        return true;
      } catch (error) {
        console.error('[AudioContextAdapter] Failed to resume context:', error);
        return false;
      }
    }
    return true;
  }
}
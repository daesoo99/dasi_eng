/**
 * 🔧 Web Speech API 래퍼 클래스
 * 
 * @description 
 * 이 클래스는 플러그인 시스템의 구현체(Implementation Layer)로
 * Direct Web API 호출이 허용됩니다.
 * 
 * @architecture_note
 * - 이 파일에서 speechSynthesis.* 직접 호출은 정상적인 패턴입니다
 * - 다른 컴포넌트/훅은 이 클래스나 ServiceContainer를 통해 사용해야 합니다
 * - Direct Web API 호출 금지는 비즈니스 로직 레이어에만 적용됩니다
 */
export class SimpleWebSpeechAPI {
  /**
   * TTS 지원 확인
   */
  isTTSSupported(): boolean {
    return 'speechSynthesis' in window;
  }

  /**
   * 음성 합성
   */
  speak(text: string, language = 'ko-KR'): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isTTSSupported()) {
        reject(new Error('브라우저에서 음성 합성을 지원하지 않습니다.'));
        return;
      }

      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language;
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        utterance.onend = () => resolve();
        utterance.onerror = (event) => {
          // interrupted는 사용자가 의도적으로 중단한 경우이므로 에러로 처리하지 않음
          if (event.error === 'interrupted') {
            console.log('음성 합성이 중단되었습니다.');
            resolve();
          } else {
            console.error('음성 합성 오류:', event.error);
            reject(new Error(`음성 합성 오류: ${event.error}`));
          }
        };
        
        speechSynthesis.speak(utterance);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 음성 합성 중지
   */
  stopSpeaking(): void {
    if (this.isTTSSupported()) {
      speechSynthesis.cancel();
    }
  }
}

export const webSpeechAPI = new SimpleWebSpeechAPI();
// 간단한 Web Speech API 래퍼
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
interface InterviewRecord {
  id: string;
  timestamp: Date;
  config: {
    company: string;
    position: string;
    experience: string;
    jobDescription: string;
    companyType?: string;
    industryType?: string;
    interviewStyle?: string;
    duration?: number;
    interviewerImage?: string;
  };
  questionsAndAnswers: Array<{
    question: string;
    answer: string;
    answerTime: number; // 답변에 걸린 시간 (초)
    audioBlob?: Blob; // 음성 데이터
  }>;
  statistics: {
    totalTime: number; // 총 면접 시간 (초)
    totalAnswerTime: number; // 총 답변 시간 (초)
    totalThinkingTime: number; // 총 사고 시간 (초)
    questionCount: number;
  };
  audioRecordings?: Blob[]; // 음성 파일들 (추후 구현)
}

class InterviewStorageService {
  private dbName = 'DaSiStartDB';
  private version = 1;
  private storeName = 'interviews';

  /**
   * IndexedDB 연결
   */
  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('company', 'config.company', { unique: false });
          store.createIndex('position', 'config.position', { unique: false });
        }
      };
    });
  }

  /**
   * 면접 기록 저장
   */
  async saveInterview(record: Omit<InterviewRecord, 'id' | 'timestamp'>): Promise<string> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const interviewRecord: InterviewRecord = {
        id: this.generateId(),
        timestamp: new Date(),
        ...record
      };

      return new Promise((resolve, reject) => {
        const request = store.add(interviewRecord);
        request.onsuccess = () => resolve(interviewRecord.id);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('면접 기록 저장 실패:', error);
      throw error;
    }
  }

  /**
   * 모든 면접 기록 조회
   */
  async getAllInterviews(): Promise<InterviewRecord[]> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');

      return new Promise((resolve, reject) => {
        const request = index.getAll();
        request.onsuccess = () => {
          // 최신 순으로 정렬
          const records = request.result.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          resolve(records);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('면접 기록 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 특정 면접 기록 조회
   */
  async getInterview(id: string): Promise<InterviewRecord | undefined> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);

      return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('면접 기록 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 면접 기록 삭제
   */
  async deleteInterview(id: string): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('면접 기록 삭제 실패:', error);
      throw error;
    }
  }

  /**
   * 저장 공간 사용량 확인 (근사치)
   */
  async getStorageUsage(): Promise<{ used: number; quota: number }> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage || 0,
          quota: estimate.quota || 0
        };
      }
    } catch (error) {
      console.warn('저장 공간 정보 조회 실패:', error);
    }

    return { used: 0, quota: 0 };
  }

  /**
   * 고유 ID 생성
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 데이터베이스 초기화 (개발용)
   */
  async clearAllData(): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('데이터 초기화 실패:', error);
      throw error;
    }
  }
}

export const interviewStorage = new InterviewStorageService();
export type { InterviewRecord };
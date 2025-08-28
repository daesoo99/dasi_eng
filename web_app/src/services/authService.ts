import { useAuth } from '../hooks/useAuth';
import { api } from './api';

interface ExpGainParams {
  amount: number;
  type: 'stage_clear' | 'review_success' | 'streak_bonus' | 'daily_login' | 'perfect_score';
}

interface ProgressUpdateParams {
  level?: number;
  stage?: number;
  exp?: number;
  streak?: number;
}

class AuthService {
  /**
   * 백엔드 expService와 연동하여 경험치 추가
   */
  async addExpToBackend(userId: string, params: ExpGainParams): Promise<boolean> {
    try {
      console.log('[DEBUG] 📈 백엔드 경험치 추가 요청:', { userId, ...params });
      
      const response = await api.request('/exp/add', 'POST', {
        userId,
        amount: params.amount,
        type: params.type
      });
      
      console.log('[DEBUG] ✅ 백엔드 경험치 추가 성공:', response);
      return true;
    } catch (error) {
      console.error('[DEBUG] ❌ 백엔드 경험치 추가 실패:', error);
      return false;
    }
  }

  /**
   * 백엔드 스트릭 업데이트
   */
  async updateStreakToBackend(userId: string): Promise<boolean> {
    try {
      console.log('[DEBUG] 🔥 백엔드 스트릭 업데이트 요청:', userId);
      
      const response = await api.request('/exp/streak', 'POST', { userId });
      
      console.log('[DEBUG] ✅ 백엔드 스트릭 업데이트 성공:', response);
      return true;
    } catch (error) {
      console.error('[DEBUG] ❌ 백엔드 스트릭 업데이트 실패:', error);
      return false;
    }
  }

  /**
   * 학습 완료 시 종합적인 진행도 업데이트
   */
  async handleStudyCompletion(userId: string, completionData: {
    level: number;
    stage: number;
    score: number;
    timeSpent: number;
    mistakes: number;
  }): Promise<boolean> {
    try {
      console.log('[DEBUG] 📚 학습 완료 처리:', { userId, ...completionData });

      // 1. 경험치 계산 및 추가
      let expGain = 10; // 기본 경험치
      let expType: ExpGainParams['type'] = 'stage_clear';

      if (completionData.score >= 90) {
        expGain += 5; // 고득점 보너스
        expType = 'perfect_score';
      }

      if (completionData.mistakes === 0) {
        expGain += 3; // 완벽 보너스
      }

      // 2. 백엔드 경험치 추가
      const expSuccess = await this.addExpToBackend(userId, {
        amount: expGain,
        type: expType
      });

      // 3. 스트릭 업데이트
      const streakSuccess = await this.updateStreakToBackend(userId);

      console.log('[DEBUG] ✅ 학습 완료 처리 결과:', { expSuccess, streakSuccess });
      return expSuccess && streakSuccess;
    } catch (error) {
      console.error('[DEBUG] ❌ 학습 완료 처리 실패:', error);
      return false;
    }
  }

  /**
   * 프론트엔드와 백엔드 진행도 동기화
   */
  async syncProgress(userId: string): Promise<boolean> {
    try {
      console.log('[DEBUG] 🔄 진행도 동기화 시작:', userId);
      
      // 백엔드에서 최신 사용자 데이터 가져오기
      const response = await api.request(`/users/${userId}`, 'GET');
      const backendUserData = response;
      
      console.log('[DEBUG] 📊 백엔드 사용자 데이터:', backendUserData);
      
      // 필요시 Firestore 업데이트
      // 이 부분은 useAuth hook에서 처리하거나 별도 함수로 분리 가능
      
      return true;
    } catch (error) {
      console.error('[DEBUG] ❌ 진행도 동기화 실패:', error);
      return false;
    }
  }
}

// 싱글톤 인스턴스
export const authService = new AuthService();

// Hook을 사용하는 커스텀 훅
export const useAuthService = () => {
  const { user, addExp, updateUserProgress } = useAuth();

  const handleStudyComplete = async (completionData: {
    level: number;
    stage: number;
    score: number;
    timeSpent: number;
    mistakes: number;
  }) => {
    if (!user) {
      console.warn('[DEBUG] ⚠️ 로그인되지 않은 상태에서 학습 완료 처리 시도');
      return false;
    }

    try {
      // 1. 프론트엔드 진행도 업데이트 (즉시 반영)
      const expGain = calculateExpGain(completionData);
      const frontendSuccess = await addExp(expGain);

      // 2. 백엔드 동기화 (백그라운드)
      const backendSuccess = await authService.handleStudyCompletion(user.uid, completionData);

      // 3. Stage 진행도 업데이트
      if (completionData.score >= 70) { // 70점 이상 시 다음 스테이지로
        const progressSuccess = await updateUserProgress({
          level: completionData.level,
          stage: completionData.stage + 1
        });
        console.log('[DEBUG] 📈 스테이지 진행도 업데이트:', progressSuccess);
      }

      return frontendSuccess;
    } catch (error) {
      console.error('[DEBUG] ❌ 통합 학습 완료 처리 실패:', error);
      return false;
    }
  };

  return {
    handleStudyComplete,
    isAuthenticated: !!user,
    userId: user?.uid
  };
};

// 경험치 계산 헬퍼
function calculateExpGain(data: { score: number; timeSpent: number; mistakes: number }): number {
  let exp = 10; // 기본

  if (data.score >= 90) exp += 5;
  if (data.mistakes === 0) exp += 3;
  if (data.timeSpent < 60000) exp += 2; // 1분 이내

  return exp;
}

export default authService;
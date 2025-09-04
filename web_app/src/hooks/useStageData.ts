/**
 * useStageData - 스테이지 데이터 로딩 및 관리 훅
 */

import { useState, useCallback } from 'react';

export interface Question {
  ko: string;
  en: string;
}

interface StageData {
  stage_id: string;
  sentences: Sentence[];
  count: number;
}

interface Sentence {
  id: string;
  kr: string;
  en: string;
  form: string;
}

interface UseStageDataConfig {
  levelNumber: number;
  phaseNumber: number;
  stageNumber: number;
}

interface UseStageDataReturn {
  currentQuestions: Question[];
  isLoading: boolean;
  loadingMessage: string;
  loadStageData: () => Promise<void>;
  resetQuestions: () => void;
}

export const useStageData = ({
  levelNumber,
  phaseNumber,
  stageNumber
}: UseStageDataConfig): UseStageDataReturn => {
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');

  /**
   * 스테이지 데이터 로드 (동적 경로 생성)
   */
  const loadStageData = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setLoadingMessage(`Level ${levelNumber} Phase ${phaseNumber} Stage ${stageNumber} 데이터 로딩 중...`);
      
      const bankPath = `/patterns/banks/level_${levelNumber}/Lv${levelNumber}-P${phaseNumber}-S${stageNumber.toString().padStart(2, '0')}_bank.json`;
      console.log(`📂 데이터 로드 시작: ${bankPath} (Level: ${levelNumber}, Phase: ${phaseNumber}, Stage: ${stageNumber})`);
      
      const response = await fetch(bankPath);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      setLoadingMessage('데이터 처리 중...');
      const data: StageData = await response.json();
      console.log(`✅ 데이터 로드 성공:`, data);
      
      if (data.sentences && Array.isArray(data.sentences) && data.sentences.length > 0) {
        // sentences 배열을 questions 형식으로 변환
        const questions: Question[] = data.sentences.map(sentence => ({
          ko: sentence.kr,
          en: sentence.en
        }));
        
        setCurrentQuestions(questions);
        console.log(`📊 총 ${questions.length}개 문제 로드됨`);
        setIsLoading(false);
        setLoadingMessage('');
      } else {
        throw new Error('올바른 문제 데이터가 없습니다.');
      }
    } catch (error) {
      console.error('❌ 데이터 로드 실패:', error);
      
      // 에러 타입별 처리
      if (error instanceof Error) {
        if (error.message.includes('404') || error.message.includes('HTTP 404')) {
          // 파일이 존재하지 않는 경우
          alert(`⚠️ 스테이지 데이터를 찾을 수 없습니다.\n\nLevel ${levelNumber}, Phase ${phaseNumber}, Stage ${stageNumber}에 해당하는 데이터가 아직 준비되지 않았습니다.\n\n다른 스테이지를 선택해주세요.`);
        } else if (error.message.includes('JSON')) {
          // JSON 파싱 오류
          alert(`⚠️ 데이터 형식 오류가 발생했습니다.\n\n스테이지 데이터 파일이 손상되었을 수 있습니다.\n\n잠시 후 다시 시도해주세요.`);
        } else if (error.message.includes('올바른 문제 데이터가 없습니다')) {
          // 데이터 구조 오류
          alert(`⚠️ 스테이지 데이터가 비어있습니다.\n\nLevel ${levelNumber}, Phase ${phaseNumber}, Stage ${stageNumber}의 문장 데이터가 없습니다.\n\n다른 스테이지를 선택해주세요.`);
        } else {
          // 기타 오류
          alert(`❌ 데이터 로드 중 오류가 발생했습니다.\n\n오류: ${error.message}\n\n새로고침 후 다시 시도해주세요.`);
        }
      } else {
        // 알 수 없는 오류
        alert('❌ 알 수 없는 오류가 발생했습니다.\n\n페이지를 새로고침 후 다시 시도해주세요.');
      }
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [levelNumber, phaseNumber, stageNumber]);

  const resetQuestions = useCallback(() => {
    setCurrentQuestions([]);
  }, []);

  return {
    currentQuestions,
    isLoading,
    loadingMessage,
    loadStageData,
    resetQuestions
  };
};
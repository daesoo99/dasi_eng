import React, { useState, useRef, useEffect } from 'react';
import { writingModeService, type WritingFeedback, type GrammarError, type SpellingError } from '@/services/writingMode';

interface WritingModeInputProps {
  question: {
    id: string;
    front_ko: string;
    target_en: string;
    level: number;
    stage: number;
    difficulty: 'easy' | 'medium' | 'hard';
  };
  value?: string;
  onSubmit: (userInput: string, feedback: WritingFeedback) => void;
  onInputChange?: (value: string) => void;
  onCorrectAnswer?: () => void;
  onAutoNext?: () => void;
  disabled?: boolean;
}

export const WritingModeInput: React.FC<WritingModeInputProps> = ({
  question,
  value = '',
  onSubmit,
  onInputChange,
  onCorrectAnswer,
  onAutoNext,
  disabled = false
}) => {
  const [userInput, setUserInput] = useState(value);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRealTimeFeedback, setShowRealTimeFeedback] = useState(false);
  const [realTimeErrors, setRealTimeErrors] = useState<{
    grammar: GrammarError[];
    spelling: SpellingError[];
  }>({ grammar: [], spelling: [] });
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // External value 변경 시 내부 상태 동기화 및 자동 포커스
  useEffect(() => {
    setUserInput(value);
    // 새 카드일 때만 feedbackSubmitted 리셋 (value가 ''일 때)
    if (value === '') {
      setFeedbackSubmitted(false);
    }
    
    // 새 카드로 전환 시 입력창에 자동 포커스
    if (textareaRef.current && value === '') {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 150); // 약간 더 긴 딜레이로 안정성 보장
    }
  }, [value]);

  // 컴포넌트 마운트 시 자동 포커스
  useEffect(() => {
    if (textareaRef.current && !disabled) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 200);
    }
  }, [disabled]);

  // 실시간 문법/맞춤법 체크 (디바운스)
  useEffect(() => {
    if (userInput.length > 3) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      
      debounceRef.current = setTimeout(async () => {
        try {
          const grammarErrors = await writingModeService['detectGrammarErrors'](userInput, question.target_en);
          const spellingErrors = await writingModeService['detectSpellingErrors'](userInput);
          
          setRealTimeErrors({ grammar: grammarErrors, spelling: spellingErrors });
          setShowRealTimeFeedback(grammarErrors.length > 0 || spellingErrors.length > 0);
        } catch (error) {
          console.error('실시간 체크 실패:', error);
        }
      }, 1000);
    } else {
      setShowRealTimeFeedback(false);
      setRealTimeErrors({ grammar: [], spelling: [] });
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [userInput, question.target_en]);

  const handleSubmit = async () => {
    if (!userInput.trim() || isProcessing) return;

    setIsProcessing(true);

    try {
      const feedback = await writingModeService.generateWritingFeedback(
        userInput,
        question.target_en,
        {
          id: question.id,
          front_ko: question.front_ko,
          target_en: question.target_en,
          level: question.level,
          stage: question.stage,
          difficulty: question.difficulty,
          grammarFocus: [],
          vocabularyFocus: []
        }
      );

      onSubmit(userInput, feedback);
      setFeedbackSubmitted(true);
      console.log('✅ 피드백 제출 완료, feedbackSubmitted:', true);

      if (feedback.isCorrect && onCorrectAnswer) {
        onCorrectAnswer();
      }

      // 피드백 처리 완료 - 자동 진행은 두 번째 엔터키로만 가능
      // 더 이상 자동 카운트다운 없음
    } catch (error) {
      console.error('Writing 피드백 생성 실패:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      console.log('🔍 엔터키 눌림:', { feedbackSubmitted, onAutoNext: !!onAutoNext });
      
      if (feedbackSubmitted && onAutoNext) {
        // 피드백이 이미 제출된 상태에서 엔터키 = 즉시 다음 카드로 진행
        console.log('✅ 다음 카드로 진행');
        onAutoNext();
      } else {
        // 첫 번째 엔터키 = 답안 제출
        console.log('📝 답안 제출');
        handleSubmit();
      }
    }
  };

  const insertSuggestion = (suggestion: string, start: number, end: number) => {
    const newText = userInput.substring(0, start) + suggestion + userInput.substring(end);
    setUserInput(newText);
    
    // 포커스 유지
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + suggestion.length, start + suggestion.length);
      }
    }, 10);
  };

  const getInputHighlighting = () => {
    if (!showRealTimeFeedback) return '';

    let highlightedText = userInput;
    const allErrors = [
      ...realTimeErrors.grammar.map(e => ({ ...e, type: 'grammar' as const })),
      ...realTimeErrors.spelling.map(e => ({ ...e, type: 'spelling' as const }))
    ];

    // 에러 위치별로 정렬 (뒤에서부터)
    allErrors
      .sort((a, b) => b.position.start - a.position.start)
      .forEach(error => {
        const errorClass = error.type === 'grammar' ? 'grammar-error' : 'spelling-error';
        const replacement = `<mark class="${errorClass}">${userInput.substring(error.position.start, error.position.end)}</mark>`;
        
        highlightedText = highlightedText.substring(0, error.position.start) +
                         replacement +
                         highlightedText.substring(error.position.end);
      });

    return highlightedText;
  };

  return (
    <div className="space-y-4">
      {/* 입력 영역 */}
      <div className="relative">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={userInput}
            onChange={(e) => {
              const newValue = e.target.value;
              setUserInput(newValue);
              onInputChange?.(newValue);
            }}
            onKeyPress={handleKeyPress}
            className={`w-full px-4 py-4 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-body ${
              disabled ? 'bg-secondary-100 cursor-not-allowed' : ''
            } ${showRealTimeFeedback ? 'border-warning' : 'border-secondary-300'}`}
            placeholder="영어로 작성하세요... (Enter로 제출, Shift+Enter로 줄바꿈)"
            rows={3}
            disabled={disabled || isProcessing}
          />
          
          {/* 실시간 오류 표시 오버레이 */}
          {showRealTimeFeedback && (
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
              <div 
                className="w-full h-full px-4 py-3 text-lg text-transparent whitespace-pre-wrap break-words"
                dangerouslySetInnerHTML={{ __html: getInputHighlighting() }}
              />
            </div>
          )}
        </div>

        {/* 글자 수 표시 */}
        <div className="flex justify-between items-center mt-4 text-caption text-secondary-500">
          <span>{userInput.length} characters</span>
          <span>Enter로 제출</span>
        </div>
      </div>

      {/* 실시간 오류 알림 */}
      {showRealTimeFeedback && (realTimeErrors.grammar.length > 0 || realTimeErrors.spelling.length > 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-800 mb-2">⚠️ 실시간 체크</h4>
          
          {realTimeErrors.grammar.length > 0 && (
            <div className="mb-3">
              <h5 className="text-sm font-medium text-yellow-700 mb-1">문법 체크:</h5>
              <div className="space-y-1">
                {realTimeErrors.grammar.slice(0, 2).map((error, index) => (
                  <div key={index} className="text-sm">
                    <span className="text-red-600">"{error.original}"</span>
                    <span className="mx-2">→</span>
                    <button
                      onClick={() => insertSuggestion(error.corrected, error.position.start, error.position.end)}
                      className="text-green-600 hover:text-green-800 underline"
                    >
                      "{error.corrected}"
                    </button>
                    <span className="text-gray-600 ml-2 text-xs">({error.rule})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {realTimeErrors.spelling.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-yellow-700 mb-1">맞춤법 체크:</h5>
              <div className="space-y-1">
                {realTimeErrors.spelling.slice(0, 2).map((error, index) => (
                  <div key={index} className="text-sm">
                    <span className="text-red-600">"{error.original}"</span>
                    <span className="mx-2">→</span>
                    {error.suggestions.slice(0, 2).map((suggestion, sIndex) => (
                      <button
                        key={sIndex}
                        onClick={() => insertSuggestion(suggestion, error.position.start, error.position.end)}
                        className="text-green-600 hover:text-green-800 underline mr-2"
                      >
                        "{suggestion}"
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 제출 버튼 */}
      <button
        onClick={handleSubmit}
        disabled={!userInput.trim() || isProcessing || disabled}
        className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-secondary-400 text-white py-4 px-8 rounded-lg transition-colors text-h3"
      >
        {isProcessing ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            문법 검사 중...
          </div>
        ) : (
          '작성 완료 및 검사'
        )}
      </button>

      {/* 다음 카드 진행 안내 */}
      {feedbackSubmitted && (
        <div className="bg-accent-50 border border-accent-200 rounded-lg p-4 text-center">
          <div className="text-accent-800">
            <div className="text-h3 mb-4">답변이 제출되었습니다!</div>
            <div className="text-caption">
              <span className="font-medium">Enter키</span>를 눌러 다음 카드로 진행하세요
            </div>
            <div className="mt-2 text-small text-accent-600">
              또는 "다음 카드" 버튼을 클릭하세요
            </div>
          </div>
        </div>
      )}

      {/* 도움말 */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
        <div className="text-caption text-primary-800">
          <div className="text-h3 mb-4">Writing 모드 팁</div>
          <ul className="space-y-2 text-small">
            <li>• 실시간으로 문법과 맞춤법이 체크됩니다</li>
            <li>• 오류가 발견되면 클릭해서 바로 수정할 수 있습니다</li>
            <li>• 제출 후 상세한 개선 제안을 받을 수 있습니다</li>
            <li>• 첫 번째 엔터키로 제출, 두 번째 엔터키로 다음 카드 진행</li>
          </ul>
        </div>
      </div>

      {/* CSS 스타일 */}
      <style jsx>{`
        .grammar-error {
          background-color: rgba(239, 68, 68, 0.2);
          border-bottom: 2px wavy #ef4444;
        }
        .spelling-error {
          background-color: rgba(245, 158, 11, 0.2);
          border-bottom: 2px wavy #f59e0b;
        }
      `}</style>
    </div>
  );
};
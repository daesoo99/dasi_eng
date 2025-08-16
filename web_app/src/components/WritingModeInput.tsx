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
  onSubmit: (userInput: string, feedback: WritingFeedback) => void;
  onCorrectAnswer?: () => void;
  disabled?: boolean;
}

export const WritingModeInput: React.FC<WritingModeInputProps> = ({
  question,
  onSubmit,
  onCorrectAnswer,
  disabled = false
}) => {
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRealTimeFeedback, setShowRealTimeFeedback] = useState(false);
  const [realTimeErrors, setRealTimeErrors] = useState<{
    grammar: GrammarError[];
    spelling: SpellingError[];
  }>({ grammar: [], spelling: [] });
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

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

      if (feedback.isCorrect && onCorrectAnswer) {
        onCorrectAnswer();
      }
    } catch (error) {
      console.error('Writing 피드백 생성 실패:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
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
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-lg ${
              disabled ? 'bg-gray-100 cursor-not-allowed' : ''
            } ${showRealTimeFeedback ? 'border-yellow-400' : 'border-gray-300'}`}
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
        <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
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
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg"
      >
        {isProcessing ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            문법 검사 중...
          </div>
        ) : (
          '✍️ 작성 완료 및 검사'
        )}
      </button>

      {/* 도움말 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="text-sm text-blue-800">
          <strong>💡 Writing 모드 팁:</strong>
          <ul className="mt-1 space-y-1 text-xs">
            <li>• 실시간으로 문법과 맞춤법이 체크됩니다</li>
            <li>• 오류가 발견되면 클릭해서 바로 수정할 수 있습니다</li>
            <li>• 제출 후 상세한 개선 제안을 받을 수 있습니다</li>
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
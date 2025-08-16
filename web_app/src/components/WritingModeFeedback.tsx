import React, { useState } from 'react';
import type { WritingFeedback, GrammarError, SpellingError, WritingSuggestion } from '@/services/writingMode';

interface WritingModeFeedbackProps {
  feedback: WritingFeedback;
  targetAnswer: string;
  onPlayAnswer?: () => void;
  canPlayAnswer?: boolean;
}

export const WritingModeFeedback: React.FC<WritingModeFeedbackProps> = ({
  feedback,
  targetAnswer,
  onPlayAnswer,
  canPlayAnswer = false
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'grammar' | 'suggestions'>('overview');

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 90) return '🎉';
    if (score >= 70) return '👍';
    return '💪';
  };

  const renderGrammarError = (error: GrammarError, index: number) => (
    <div key={index} className="border border-gray-200 rounded-lg p-4 mb-3">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-900">{error.rule}</h4>
        <span className={`text-xs px-2 py-1 rounded ${
          error.type === 'grammar' ? 'bg-red-100 text-red-700' :
          error.type === 'spelling' ? 'bg-orange-100 text-orange-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          {error.type}
        </span>
      </div>
      
      <div className="bg-gray-50 rounded p-3 mb-2">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center">
            <span className="text-red-600 font-medium">❌ 틀린 부분:</span>
            <span className="ml-2 bg-red-100 px-2 py-1 rounded">{error.original}</span>
          </div>
          <div className="flex items-center">
            <span className="text-green-600 font-medium">✅ 올바른 표현:</span>
            <span className="ml-2 bg-green-100 px-2 py-1 rounded">{error.corrected}</span>
          </div>
        </div>
      </div>
      
      <p className="text-sm text-gray-600">{error.explanation}</p>
    </div>
  );

  const renderSpellingError = (error: SpellingError, index: number) => (
    <div key={index} className="border border-gray-200 rounded-lg p-4 mb-3">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-900">맞춤법 오류</h4>
        <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded">
          spelling
        </span>
      </div>
      
      <div className="bg-gray-50 rounded p-3 mb-2">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center">
            <span className="text-red-600 font-medium">❌ 틀린 철자:</span>
            <span className="ml-2 bg-red-100 px-2 py-1 rounded">{error.original}</span>
          </div>
          <div className="flex items-center">
            <span className="text-green-600 font-medium">✅ 올바른 철자:</span>
            <div className="ml-2 flex gap-1">
              {error.suggestions.map((suggestion, sIndex) => (
                <span key={sIndex} className="bg-green-100 px-2 py-1 rounded">
                  {suggestion}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="text-sm text-gray-600">
        정확도: {Math.round(error.confidence * 100)}%
      </div>
    </div>
  );

  const renderSuggestion = (suggestion: WritingSuggestion, index: number) => (
    <div key={index} className="border border-gray-200 rounded-lg p-4 mb-3">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-900">{suggestion.reason}</h4>
        <div className="flex gap-2">
          <span className={`text-xs px-2 py-1 rounded ${
            suggestion.type === 'alternative' ? 'bg-blue-100 text-blue-700' :
            suggestion.type === 'improvement' ? 'bg-green-100 text-green-700' :
            suggestion.type === 'vocabulary' ? 'bg-purple-100 text-purple-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {suggestion.type}
          </span>
          <span className={`text-xs px-2 py-1 rounded ${
            suggestion.priority === 'high' ? 'bg-red-100 text-red-700' :
            suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {suggestion.priority}
          </span>
        </div>
      </div>
      
      <div className="bg-gray-50 rounded p-3">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center">
            <span className="text-gray-600 font-medium">현재:</span>
            <span className="ml-2 bg-gray-200 px-2 py-1 rounded">{suggestion.original}</span>
          </div>
          <div className="flex items-center">
            <span className="text-blue-600 font-medium">추천:</span>
            <span className="ml-2 bg-blue-100 px-2 py-1 rounded">{suggestion.suggested}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* 헤더 - 점수 및 전체 결과 */}
      <div className={`rounded-lg p-6 mb-6 border-2 ${getScoreColor(feedback.score)}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold mb-2">
              {getScoreEmoji(feedback.score)} Writing 검사 결과
            </h3>
            <div className="flex items-center gap-4 text-sm">
              <span>점수: <strong>{feedback.score}/100</strong></span>
              <span>정확성: <strong>{feedback.isCorrect ? '완전 정답' : '개선 필요'}</strong></span>
            </div>
          </div>
          
          {canPlayAnswer && onPlayAnswer && (
            <button
              onClick={onPlayAnswer}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              🔊 정답 듣기
            </button>
          )}
        </div>
      </div>

      {/* 입력 vs 정답 비교 */}
      <div className="mb-6">
        <h4 className="font-semibold text-gray-900 mb-3">📝 작성 내용 비교</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600 mb-2">작성한 내용</div>
            <div className="bg-gray-50 border rounded-lg p-3 min-h-[60px]">
              <span className="text-gray-800">{feedback.originalInput}</span>
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-2">정답</div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 min-h-[60px]">
              <span className="text-green-800 font-medium">{targetAnswer}</span>
            </div>
          </div>
        </div>
        
        {feedback.correctedText !== feedback.originalInput && (
          <div className="mt-4">
            <div className="text-sm text-gray-600 mb-2">교정된 내용</div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <span className="text-blue-800">{feedback.correctedText}</span>
            </div>
          </div>
        )}
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1">
          {[
            { key: 'overview', label: '전체 요약', count: null },
            { key: 'grammar', label: '문법/맞춤법', count: feedback.grammarErrors.length + feedback.spellingErrors.length },
            { key: 'suggestions', label: '개선 제안', count: feedback.suggestions.length }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <span className="ml-2 bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="min-h-[200px]">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">📚 상세 설명</h4>
              <div 
                className="text-blue-800 whitespace-pre-line"
                dangerouslySetInnerHTML={{ 
                  __html: feedback.explanation.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                }}
              />
            </div>
            
            {feedback.score >= 90 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2">🎉 훌륭한 작성!</h4>
                <p className="text-green-800">문법과 맞춤법이 거의 완벽합니다. 계속해서 좋은 실력을 유지하세요!</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'grammar' && (
          <div>
            {feedback.grammarErrors.length === 0 && feedback.spellingErrors.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">✅</div>
                <h4 className="text-xl font-semibold text-green-600 mb-2">완벽한 문법과 맞춤법!</h4>
                <p className="text-gray-600">오류가 발견되지 않았습니다.</p>
              </div>
            ) : (
              <div>
                {feedback.grammarErrors.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-3">📝 문법 오류</h4>
                    {feedback.grammarErrors.map(renderGrammarError)}
                  </div>
                )}
                
                {feedback.spellingErrors.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">✏️ 맞춤법 오류</h4>
                    {feedback.spellingErrors.map(renderSpellingError)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'suggestions' && (
          <div>
            {feedback.suggestions.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">👍</div>
                <h4 className="text-xl font-semibold text-blue-600 mb-2">추가 개선사항 없음</h4>
                <p className="text-gray-600">현재 작성 내용이 좋습니다!</p>
              </div>
            ) : (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">💡 개선 제안</h4>
                {feedback.suggestions.map(renderSuggestion)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
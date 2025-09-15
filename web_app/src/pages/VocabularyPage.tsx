/**
 * VocabularyPage - 단어장 메인 페이지
 * - 레벨별/카테고리별 단어 목록 표시
 * - 검색, 필터링, 정렬 기능
 * - 단어 학습 상태 관리 및 즐겨찾기
 * - SRS 기반 복습 단어 추천
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVocabulary } from '@/hooks/useVocabulary';
import { useAudioManager } from '@/hooks/useAudioManager';
import { VocabularyWord, UserVocabularyProgress } from '@/services/vocabularyService';

export const VocabularyPage: React.FC = () => {
  const navigate = useNavigate();
  const { playEnglishTTS, playKoreanTTS, stopAllAudio, isPlaying } = useAudioManager();
  
  const {
    vocabularyWords,
    filteredWords,
    stats,
    isLoading,
    error,
    filters,
    setFilters,
    clearFilters,
    searchWords,
    updateWordStatus,
    toggleFavorite,
    getWordsForReview,
    getNewWordsToLearn,
    refreshVocabulary
  } = useVocabulary();

  // 로컬 상태
  const [selectedWord, setSelectedWord] = useState<VocabularyWord | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
  const [sortBy, setSortBy] = useState<'frequency' | 'alphabetical' | 'level'>('frequency');

  // 복습 및 신규 단어
  const reviewWords = useMemo(() => getWordsForReview(), [getWordsForReview]);
  const newWords = useMemo(() => getNewWordsToLearn(20), [getNewWordsToLearn]);

  // 정렬된 단어 목록
  const sortedWords = useMemo(() => {
    const sorted = [...filteredWords];
    switch (sortBy) {
      case 'alphabetical':
        return sorted.sort((a, b) => a.word.localeCompare(b.word));
      case 'level':
        return sorted.sort((a, b) => a.level - b.level || b.frequency - a.frequency);
      case 'frequency':
      default:
        return sorted.sort((a, b) => b.frequency - a.frequency);
    }
  }, [filteredWords, sortBy]);

  // 단어 발음 재생 (중복 방지)
  const playWordPronunciation = async (word: VocabularyWord) => {
    stopAllAudio(); // 기존 음성 중단
    setTimeout(() => playEnglishTTS(word.word), 50);
  };

  // 예문 발음 재생 (중복 방지)
  const playExample = async (sentence: string, translation: string) => {
    stopAllAudio(); // 기존 음성 중단
    setTimeout(async () => {
      await playEnglishTTS(sentence);
      setTimeout(() => playKoreanTTS(translation), 2000);
    }, 50);
  };

  // 단어 상태 변경 핸들러
  const handleWordStatusChange = (wordId: string, status: UserVocabularyProgress['status']) => {
    updateWordStatus(wordId, status);
  };

  // 즐겨찾기 토글
  const handleToggleFavorite = (wordId: string) => {
    toggleFavorite(wordId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">단어장을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">오류 발생</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
          <button
            onClick={refreshVocabulary}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">📖 단어장</h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">패턴 학습 기반 어휘 관리</p>
              </div>
            </div>
            
            {/* 통계 요약 */}
            <div className="flex items-center gap-6 text-sm">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{stats.totalWords}</div>
                <div className="text-gray-600 dark:text-gray-300">전체</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">{stats.knownWords}</div>
                <div className="text-gray-600 dark:text-gray-300">학습완료</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-600">{reviewWords.length}</div>
                <div className="text-gray-600 dark:text-gray-300">복습필요</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">{newWords.length}</div>
                <div className="text-gray-600 dark:text-gray-300">신규학습</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* 빠른 액션 버튼 */}
        {(reviewWords.length > 0 || newWords.length > 0) && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">📚 추천 학습</h2>
            <div className="flex gap-4">
              {reviewWords.length > 0 && (
                <button className="flex-1 p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors">
                  <div className="text-left">
                    <div className="text-orange-800 font-semibold">복습하기</div>
                    <div className="text-orange-600 text-sm">{reviewWords.length}개 단어가 복습을 기다리고 있습니다</div>
                  </div>
                </button>
              )}
              {newWords.length > 0 && (
                <button className="flex-1 p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                  <div className="text-left">
                    <div className="text-blue-800 font-semibold">새 단어 학습</div>
                    <div className="text-blue-600 text-sm">{newWords.length}개 새 단어를 학습할 수 있습니다</div>
                  </div>
                </button>
              )}
            </div>
          </div>
        )}

        {/* 검색 및 필터 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg transition-colors duration-300 shadow p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* 검색창 */}
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="단어 검색... (영어 또는 한국어)"
                  value={filters.searchQuery || ''}
                  onChange={(e) => searchWords(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* 필터 */}
            <div className="flex gap-2">
              <select
                value={filters.level || ''}
                onChange={(e) => setFilters({ level: e.target.value ? parseInt(e.target.value) : undefined })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">모든 레벨</option>
                {Array.from({length: 10}, (_, i) => (
                  <option key={i + 1} value={i + 1}>Level {i + 1}</option>
                ))}
              </select>

              <select
                value={filters.category || ''}
                onChange={(e) => setFilters({ category: e.target.value as VocabularyWord['category'] || undefined })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">모든 품사</option>
                <option value="noun">명사</option>
                <option value="verb">동사</option>
                <option value="adjective">형용사</option>
                <option value="adverb">부사</option>
                <option value="pronoun">대명사</option>
                <option value="preposition">전치사</option>
              </select>

              <select
                value={filters.status || ''}
                onChange={(e) => setFilters({ status: e.target.value as UserVocabularyProgress['status'] || undefined })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">모든 상태</option>
                <option value="unknown">모름</option>
                <option value="learning">학습중</option>
                <option value="known">알고 있음</option>
                <option value="review">복습 필요</option>
              </select>

              <button
                onClick={() => setFilters({ onlyFavorites: !filters.onlyFavorites })}
                className={`px-3 py-2 border rounded-lg transition-colors ${
                  filters.onlyFavorites 
                    ? 'bg-yellow-100 border-yellow-300 text-yellow-800' 
                    : 'border-gray-300 text-gray-600 dark:text-gray-300 hover:bg-gray-50'
                }`}
              >
                ⭐ 즐겨찾기
              </button>

              <button
                onClick={clearFilters}
                className="px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:text-white transition-colors"
              >
                초기화
              </button>
            </div>
          </div>

          {/* 정렬 및 뷰 모드 */}
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">정렬:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="frequency">빈도순</option>
                <option value="alphabetical">알파벳순</option>
                <option value="level">레벨순</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">{sortedWords.length}개 단어</span>
              <div className="flex border border-gray-300 rounded overflow-hidden">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 text-sm ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50'}`}
                >
                  목록
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-1 text-sm ${viewMode === 'cards' ? 'bg-blue-500 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50'}`}
                >
                  카드
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 단어 목록 */}
        {sortedWords.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📝</div>
            <p className="text-gray-600 dark:text-gray-300">조건에 맞는 단어를 찾을 수 없습니다.</p>
            <button
              onClick={clearFilters}
              className="mt-4 px-4 py-2 text-blue-600 hover:text-blue-800 transition-colors"
            >
              필터 초기화
            </button>
          </div>
        ) : (
          <div className={`grid gap-4 ${viewMode === 'cards' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
            {sortedWords.map((word) => (
              <VocabularyWordItem
                key={word.id}
                word={word}
                viewMode={viewMode}
                onStatusChange={handleWordStatusChange}
                onToggleFavorite={handleToggleFavorite}
                onPlayWord={() => playWordPronunciation(word)}
                onPlayExample={playExample}
                onSelectWord={() => setSelectedWord(word)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 단어 상세 모달 */}
      {selectedWord && (
        <VocabularyWordModal
          word={selectedWord}
          onClose={() => setSelectedWord(null)}
          onStatusChange={handleWordStatusChange}
          onToggleFavorite={handleToggleFavorite}
          onPlayWord={() => playWordPronunciation(selectedWord)}
          onPlayExample={playExample}
        />
      )}
    </div>
  );
};

// 단어 아이템 컴포넌트
interface VocabularyWordItemProps {
  word: VocabularyWord;
  viewMode: 'list' | 'cards';
  onStatusChange: (wordId: string, status: UserVocabularyProgress['status']) => void;
  onToggleFavorite: (wordId: string) => void;
  onPlayWord: () => void;
  onPlayExample: (sentence: string, translation: string) => void;
  onSelectWord: () => void;
}

const VocabularyWordItem: React.FC<VocabularyWordItemProps> = ({
  word,
  viewMode,
  onStatusChange,
  onToggleFavorite,
  onPlayWord,
  onPlayExample,
  onSelectWord
}) => {
  if (viewMode === 'cards') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg transition-colors duration-300 shadow hover:shadow-md transition-shadow p-4 cursor-pointer" onClick={onSelectWord}>
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{word.word}</h3>
              <button 
                onClick={(e) => { e.stopPropagation(); onPlayWord(); }}
                className={`p-1 transition-colors ${
                  isPlaying 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-blue-500 hover:text-blue-700'
                }`}
                disabled={isPlaying}
              >
                {isPlaying ? '⏸️' : '🔊'}
              </button>
            </div>
            <p className="text-gray-600 dark:text-gray-300">{word.translation}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-2 py-1 text-xs rounded ${
                word.difficulty === 'basic' ? 'bg-green-100 text-green-800' :
                word.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {word.difficulty}
              </span>
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 dark:text-white rounded">
                Lv.{word.level}
              </span>
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                {word.category}
              </span>
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(word.id); }}
            className="text-yellow-500 hover:text-yellow-600 transition-colors"
          >
            ⭐
          </button>
        </div>
        {word.examples.length > 0 && (
          <div className="border-t pt-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">{word.examples[0].sentence}</p>
            <p className="text-sm text-gray-500">{word.examples[0].translation}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg transition-colors duration-300 shadow hover:shadow-md transition-shadow p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 cursor-pointer" onClick={onSelectWord}>
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{word.word}</h3>
                <button 
                  onClick={(e) => { e.stopPropagation(); onPlayWord(); }}
                  className={`p-1 transition-colors ${
                    isPlaying 
                      ? 'text-gray-400 cursor-not-allowed' 
                      : 'text-blue-500 hover:text-blue-700'
                  }`}
                  disabled={isPlaying}
                >
                  {isPlaying ? '⏸️' : '🔊'}
                </button>
              </div>
              <p className="text-gray-600 dark:text-gray-300">{word.translation}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-xs rounded ${
            word.difficulty === 'basic' ? 'bg-green-100 text-green-800' :
            word.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {word.difficulty}
          </span>
          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 dark:text-white rounded">
            Lv.{word.level}
          </span>
          <button
            onClick={() => onToggleFavorite(word.id)}
            className="text-yellow-500 hover:text-yellow-600 transition-colors"
          >
            ⭐
          </button>
        </div>
      </div>
    </div>
  );
};

// 단어 상세 모달 컴포넌트
interface VocabularyWordModalProps {
  word: VocabularyWord;
  onClose: () => void;
  onStatusChange: (wordId: string, status: UserVocabularyProgress['status']) => void;
  onToggleFavorite: (wordId: string) => void;
  onPlayWord: () => void;
  onPlayExample: (sentence: string, translation: string) => void;
}

const VocabularyWordModal: React.FC<VocabularyWordModalProps> = ({
  word,
  onClose,
  onStatusChange,
  onToggleFavorite,
  onPlayWord,
  onPlayExample
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg transition-colors duration-300 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* 헤더 */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{word.word}</h2>
                <button 
                  onClick={onPlayWord}
                  className={`p-2 transition-colors ${
                    isPlaying 
                      ? 'text-gray-400 cursor-not-allowed' 
                      : 'text-blue-500 hover:text-blue-700'
                  }`}
                  disabled={isPlaying}
                >
                  {isPlaying ? '⏸️' : '🔊'}
                </button>
                <button
                  onClick={() => onToggleFavorite(word.id)}
                  className="text-yellow-500 hover:text-yellow-600 transition-colors"
                >
                  ⭐
                </button>
              </div>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-4">{word.translation}</p>
              
              <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1 text-sm rounded-full ${
                  word.difficulty === 'basic' ? 'bg-green-100 text-green-800' :
                  word.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {word.difficulty}
                </span>
                <span className="px-3 py-1 text-sm bg-gray-100 text-gray-800 dark:text-white rounded-full">
                  Level {word.level}
                </span>
                <span className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full">
                  {word.category}
                </span>
                <span className="px-3 py-1 text-sm bg-purple-100 text-purple-800 rounded-full">
                  빈도: {word.frequency}회
                </span>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 학습 상태 설정 */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-3">학습 상태</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { status: 'unknown' as const, label: '모름', color: 'gray' },
                { status: 'learning' as const, label: '학습중', color: 'yellow' },
                { status: 'known' as const, label: '알고 있음', color: 'green' },
                { status: 'review' as const, label: '복습 필요', color: 'orange' }
              ].map(({ status, label, color }) => (
                <button
                  key={status}
                  onClick={() => onStatusChange(word.id, status)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors
                    ${color === 'gray' ? 'bg-gray-100 text-gray-800 dark:text-white hover:bg-gray-200' :
                      color === 'yellow' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' :
                      color === 'green' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                      'bg-orange-100 text-orange-800 hover:bg-orange-200'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 예문 */}
          {word.examples.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-white mb-3">예문</h3>
              <div className="space-y-4">
                {word.examples.map((example, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-2 mb-2">
                      <p className="flex-1 text-gray-800 dark:text-white">{example.sentence}</p>
                      <button
                        onClick={() => onPlayExample(example.sentence, example.translation)}
                        className={`transition-colors ${
                          isPlaying 
                            ? 'text-gray-400 cursor-not-allowed' 
                            : 'text-blue-500 hover:text-blue-700'
                        }`}
                        disabled={isPlaying}
                      >
                        {isPlaying ? '⏸️' : '🔊'}
                      </button>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300">{example.translation}</p>
                    <p className="text-xs text-gray-500 mt-2">출처: {example.stageId}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VocabularyPage;
/**
 * WordBank Component - 단어장 UI 컴포넌트
 */

import React, { useState, useEffect } from 'react';

interface Word {
  id: string;
  word: string;
  meaning: string;
  pronunciation: string;
  examples: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  reviewCount: number;
  lastReviewed: Date | null;
  fromSentence: string; // 이 단어가 나온 틀린 문장
}

interface WordBankProps {
  userId?: string;
  limit?: number;
  showFilters?: boolean;
}

const WordBank: React.FC<WordBankProps> = ({ 
  userId, 
  limit = 20, 
  showFilters = true 
}) => {
  const [words, setWords] = useState<Word[]>([]);
  const [filteredWords, setFilteredWords] = useState<Word[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: 실제 API 호출로 사용자 단어장 데이터 가져오기
    const mockWords: Word[] = [
      {
        id: '1',
        word: 'accomplish',
        meaning: '성취하다, 완성하다',
        pronunciation: '/əˈkʌmplɪʃ/',
        examples: ['I want to accomplish my goals this year.'],
        difficulty: 'medium',
        reviewCount: 3,
        lastReviewed: new Date('2024-08-20'),
        fromSentence: 'I want to accomplish my dreams.'
      },
      {
        id: '2',
        word: 'essential',
        meaning: '필수적인, 본질적인',
        pronunciation: '/ɪˈsenʃəl/',
        examples: ['Water is essential for life.'],
        difficulty: 'hard',
        reviewCount: 1,
        lastReviewed: null,
        fromSentence: 'This skill is essential for success.'
      }
    ];

    setTimeout(() => {
      setWords(mockWords);
      setFilteredWords(mockWords);
      setIsLoading(false);
    }, 1000);
  }, [userId]);

  useEffect(() => {
    let filtered = words;

    // 난이도 필터
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(word => word.difficulty === selectedDifficulty);
    }

    // 검색 필터
    if (searchTerm) {
      filtered = filtered.filter(word =>
        word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
        word.meaning.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 제한 적용
    filtered = filtered.slice(0, limit);

    setFilteredWords(filtered);
  }, [words, selectedDifficulty, searchTerm, limit]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const playPronunciation = (word: string) => {
    // TODO: TTS를 활용한 발음 재생
    console.log('Playing pronunciation for:', word);
  };

  if (isLoading) {
    return (
      <div className="word-bank loading">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="word-bank">
      {/* 필터 섹션 */}
      {showFilters && (
        <div className="filters mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* 검색 */}
            <div className="search-filter flex-1">
              <input
                type="text"
                placeholder="단어 또는 뜻 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 난이도 필터 */}
            <div className="difficulty-filter">
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">모든 난이도</option>
                <option value="easy">쉬움</option>
                <option value="medium">보통</option>
                <option value="hard">어려움</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 단어 목록 */}
      <div className="words-list space-y-4">
        {filteredWords.length === 0 ? (
          <div className="no-words text-center py-8">
            <p className="text-gray-500">
              {searchTerm || selectedDifficulty !== 'all'
                ? '검색 조건에 맞는 단어가 없습니다.'
                : '아직 단어장에 단어가 없습니다.'}
            </p>
          </div>
        ) : (
          filteredWords.map((word) => (
            <div key={word.id} className="word-card bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="word-header flex justify-between items-start mb-3">
                <div className="word-info">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="word-text text-lg font-semibold text-gray-800">
                      {word.word}
                    </h3>
                    <button
                      onClick={() => playPronunciation(word.word)}
                      className="pronunciation-btn text-blue-500 hover:text-blue-700"
                      title="발음 재생"
                    >
                      🔊
                    </button>
                    <span className={`difficulty-badge px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(word.difficulty)}`}>
                      {word.difficulty}
                    </span>
                  </div>
                  <div className="pronunciation text-sm text-gray-500 mb-1">
                    {word.pronunciation}
                  </div>
                  <div className="meaning text-gray-700 mb-2">
                    {word.meaning}
                  </div>
                </div>
              </div>

              {/* 예문 */}
              {word.examples.length > 0 && (
                <div className="examples mb-3">
                  <h4 className="text-sm font-medium text-gray-600 mb-1">예문:</h4>
                  <ul className="space-y-1">
                    {word.examples.map((example, idx) => (
                      <li key={idx} className="text-sm text-gray-600 italic">
                        "{example}"
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 출처 문장 */}
              <div className="source-sentence mb-3 p-2 bg-blue-50 rounded text-sm">
                <span className="text-gray-600">출처: </span>
                <span className="text-blue-700 italic">"{word.fromSentence}"</span>
              </div>

              {/* 복습 정보 */}
              <div className="review-info flex justify-between items-center text-xs text-gray-500">
                <span>복습 {word.reviewCount}회</span>
                <span>
                  {word.lastReviewed 
                    ? `마지막 복습: ${word.lastReviewed.toLocaleDateString()}`
                    : '아직 복습하지 않음'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 더 보기 버튼 */}
      {words.length > limit && (
        <div className="load-more text-center mt-6">
          <button className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 transition-colors">
            더 많은 단어 보기
          </button>
        </div>
      )}
    </div>
  );
};

export default WordBank;
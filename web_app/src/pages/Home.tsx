/**
 * Home Page - 홈화면: 개인 맞춤 단어장, 복습 스케줄 요약 등
 */

import React from 'react';

interface HomeProps {
  // TODO: Props 타입 정의 추가
}

const Home: React.FC<HomeProps> = () => {
  return (
    <div className="home-page">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">DaSi English - 홈</h1>
        
        {/* 복습 스케줄 요약 섹션 */}
        <section className="review-schedule-section mb-8">
          <h2 className="text-xl font-semibold mb-4">오늘의 복습</h2>
          <div className="bg-white rounded-lg shadow-md p-4">
            {/* TODO: ReviewScheduleComponent 구현 */}
            <p className="text-gray-600">복습할 문장이 준비 중입니다...</p>
          </div>
        </section>

        {/* 개인 맞춤 단어장 섹션 */}
        <section className="word-bank-section mb-8">
          <h2 className="text-xl font-semibold mb-4">나의 단어장</h2>
          <div className="bg-white rounded-lg shadow-md p-4">
            {/* TODO: WordBankComponent 구현 */}
            <p className="text-gray-600">단어장을 불러오는 중...</p>
          </div>
        </section>

        {/* 학습 모드 선택 섹션 */}
        <section className="learning-modes-section mb-8">
          <h2 className="text-xl font-semibold mb-4">학습 모드</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="mode-card bg-blue-50 rounded-lg p-4 cursor-pointer hover:bg-blue-100 transition-colors">
              <h3 className="font-medium text-blue-800 mb-2">패턴 학습</h3>
              <p className="text-sm text-blue-600">문법 패턴을 체계적으로 학습</p>
            </div>
            <div className="mode-card bg-green-50 rounded-lg p-4 cursor-pointer hover:bg-green-100 transition-colors">
              <h3 className="font-medium text-green-800 mb-2">모방 학습</h3>
              <p className="text-sm text-green-600">원어민 발음을 따라하며 연습</p>
            </div>
            <div className="mode-card bg-purple-50 rounded-lg p-4 cursor-pointer hover:bg-purple-100 transition-colors">
              <h3 className="font-medium text-purple-800 mb-2">상황 학습</h3>
              <p className="text-sm text-purple-600">실제 상황에서 사용할 수 있는 표현 연습</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
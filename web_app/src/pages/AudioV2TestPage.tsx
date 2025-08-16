import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AudioV2Test } from '../components/AudioV2Test';

export const AudioV2TestPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← 홈으로 돌아가기
          </button>
        </div>
        
        <AudioV2Test />
      </div>
    </div>
  );
};
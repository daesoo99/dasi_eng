import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CurriculumLint } from '../components/CurriculumLint';

const CurriculumLintPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← 홈으로 돌아가기
          </button>
        </div>
        
        <CurriculumLint />
      </div>
    </div>
  );
};

export default CurriculumLintPage;
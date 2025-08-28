import React, { useState, useEffect } from 'react';
import { feedbackService, UserInterests, CustomExample, FeedbackRequest } from '../services/feedbackService';

interface CustomFeedbackPanelProps {
  userId: string;
  patternId?: string;
  onExamplesGenerated?: (examples: CustomExample[]) => void;
}

export const CustomFeedbackPanel: React.FC<CustomFeedbackPanelProps> = ({
  userId,
  patternId,
  onExamplesGenerated
}) => {
  const [interests, setInterests] = useState<UserInterests>({});
  const [difficultyLevel, setDifficultyLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [isLoading, setIsLoading] = useState(false);
  const [examples, setExamples] = useState<CustomExample[]>([]);
  const [error, setError] = useState<string | null>(null);

  const interestOptions = [
    { key: 'sports', label: 'Sports & Fitness', icon: '⚽' },
    { key: 'music', label: 'Music & Entertainment', icon: '🎵' },
    { key: 'food', label: 'Food & Cooking', icon: '🍕' },
    { key: 'travel', label: 'Travel & Adventure', icon: '✈️' },
    { key: 'technology', label: 'Technology & Digital', icon: '💻' },
    { key: 'business', label: 'Business & Work', icon: '💼' },
    { key: 'education', label: 'Education & Learning', icon: '📚' },
    { key: 'health', label: 'Health & Wellness', icon: '🏥' },
    { key: 'gaming', label: 'Gaming & Hobbies', icon: '🎮' }
  ];

  const handleInterestChange = (interestKey: string, checked: boolean) => {
    setInterests(prev => ({
      ...prev,
      [interestKey]: checked
    }));
  };

  const generateCustomExamples = async () => {
    if (!userId) {
      setError('User ID is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const selectedInterests = feedbackService.interestsToArray(interests);
      
      const request: FeedbackRequest = {
        userId,
        interests: selectedInterests,
        difficultyLevel,
        patternId
      };

      const response = await feedbackService.generateCustomFeedback(request);

      if (response.success && response.data) {
        setExamples(response.data.customExamples);
        onExamplesGenerated?.(response.data.customExamples);
      } else {
        setError(response.error || 'Failed to generate examples');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Custom feedback generation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getDifficultyDescription = (level: string) => {
    switch (level) {
      case 'beginner': return 'Simple sentences, basic vocabulary';
      case 'intermediate': return 'Natural conversations, common expressions';
      case 'advanced': return 'Complex grammar, sophisticated vocabulary';
      default: return '';
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg" role="region" aria-label="Custom Feedback Settings">
      <h2 className="text-xl font-semibold mb-4">
        <span aria-hidden="true">🎯</span> Personalized Learning Examples
      </h2>
      
      {/* User Info Display */}
      <div className="mb-4 p-3 bg-gray-50 rounded" role="status">
        <span className="text-sm text-gray-600">
          User: <strong>{userId}</strong>
          {patternId && <> | Pattern: <strong>{patternId}</strong></>}
        </span>
      </div>

      {/* Interests Selection */}
      <div className="mb-6">
        <h3 className="font-medium text-gray-900 mb-3" id="interests-heading">
          Select Your Interests
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3" role="group" aria-labelledby="interests-heading">
          {interestOptions.map((option) => (
            <label 
              key={option.key} 
              className="flex items-center space-x-2 p-2 border rounded cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <input
                type="checkbox"
                checked={interests[option.key as keyof UserInterests] || false}
                onChange={(e) => handleInterestChange(option.key, e.target.checked)}
                className="w-4 h-4 text-blue-600 border-2 border-gray-300 rounded focus:ring-blue-500"
                aria-describedby={`${option.key}-desc`}
              />
              <span className="text-lg" aria-hidden="true">{option.icon}</span>
              <span className="text-sm font-medium">{option.label}</span>
              <span id={`${option.key}-desc`} className="sr-only">
                Select {option.label} as an interest for personalized examples
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Difficulty Level */}
      <div className="mb-6">
        <h3 className="font-medium text-gray-900 mb-3" id="difficulty-heading">
          Difficulty Level
        </h3>
        <div className="space-y-2" role="radiogroup" aria-labelledby="difficulty-heading">
          {['beginner', 'intermediate', 'advanced'].map((level) => (
            <label key={level} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="difficulty"
                value={level}
                checked={difficultyLevel === level}
                onChange={(e) => setDifficultyLevel(e.target.value as any)}
                className="w-4 h-4 text-blue-600 border-2 border-gray-300 focus:ring-blue-500"
                aria-describedby={`${level}-desc`}
              />
              <span className="font-medium capitalize">{level}</span>
              <span id={`${level}-desc`} className="text-sm text-gray-600">
                ({getDifficultyDescription(level)})
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={generateCustomExamples}
        disabled={isLoading || !userId}
        className="w-full bg-blue-500 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold py-3 px-4 rounded transition-colors"
        aria-label="Generate personalized examples based on selected interests and difficulty"
      >
        {isLoading ? (
          <>
            <span aria-hidden="true">⏳</span> Generating Examples...
          </>
        ) : (
          <>
            <span aria-hidden="true">✨</span> Generate My Examples
          </>
        )}
      </button>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded" role="alert">
          <div className="text-red-600 text-sm">
            <span className="sr-only">Error: </span>
            {error}
          </div>
        </div>
      )}

      {/* Generated Examples */}
      {examples.length > 0 && (
        <div className="mt-6" role="region" aria-label="Generated Examples">
          <h3 className="font-medium text-gray-900 mb-3">
            <span aria-hidden="true">📝</span> Your Personalized Examples
            <span className="ml-2 text-sm font-normal text-gray-600">
              ({examples.length} examples)
            </span>
          </h3>
          <div className="space-y-3" role="list">
            {examples.map((example, index) => (
              <div 
                key={index} 
                className="p-3 border rounded-lg bg-gray-50"
                role="listitem"
              >
                <div className="font-medium text-gray-900 mb-1">
                  "{example.sentence}"
                </div>
                <div className="text-sm text-gray-600 flex items-center space-x-4">
                  <span>
                    <span className="font-medium">Context:</span> {example.context}
                  </span>
                  <span>
                    <span className="font-medium">Difficulty:</span> {example.difficulty}/5
                  </span>
                </div>
                {example.interests.length > 0 && (
                  <div className="mt-2 text-xs text-blue-600">
                    <span className="font-medium">Related to:</span> {example.interests.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* AI Extension Note */}
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <div className="text-yellow-800 text-sm">
              <span aria-hidden="true">🔮</span> 
              <strong className="ml-2">Coming Soon:</strong> 
              AI-powered examples will be even more personalized based on your learning history and preferences.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
import React, { memo } from 'react';

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  lines?: number;
  animated?: boolean;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = memo(({
  className = '',
  variant = 'rectangular',
  width = '100%',
  height = '1rem',
  lines = 1,
  animated = true
}) => {
  const baseClasses = `bg-gray-200 ${animated ? 'animate-pulse' : ''} ${className}`;
  
  const getVariantClasses = () => {
    switch (variant) {
      case 'text':
        return 'rounded h-4';
      case 'circular':
        return 'rounded-full';
      case 'rectangular':
        return 'rounded';
      case 'card':
        return 'rounded-xl';
      default:
        return 'rounded';
    }
  };

  const skeletonStyle = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={className} role="status" aria-label="Loading content">
        {Array.from({ length: lines }, (_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${getVariantClasses()} mb-2 last:mb-0`}
            style={{
              ...skeletonStyle,
              width: index === lines - 1 ? '75%' : skeletonStyle.width,
            }}
          />
        ))}
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${getVariantClasses()}`}
      style={skeletonStyle}
      role="status"
      aria-label="Loading content"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
});

LoadingSkeleton.displayName = 'LoadingSkeleton';

// Specialized skeleton components for common use cases
export const TextSkeleton: React.FC<{ lines?: number; className?: string }> = memo(({ 
  lines = 3, 
  className = '' 
}) => (
  <LoadingSkeleton 
    variant="text" 
    lines={lines} 
    className={className}
    height="1rem"
  />
));

export const CardSkeleton: React.FC<{ className?: string }> = memo(({ className = '' }) => (
  <div className={`p-6 ${className}`} role="status" aria-label="Loading card">
    <div className="animate-pulse">
      <div className="flex items-center space-x-4 mb-4">
        <LoadingSkeleton variant="circular" width={48} height={48} />
        <div className="flex-1">
          <LoadingSkeleton variant="text" height="1.25rem" width="60%" className="mb-2" />
          <LoadingSkeleton variant="text" height="1rem" width="40%" />
        </div>
      </div>
      <TextSkeleton lines={3} />
    </div>
    <span className="sr-only">Loading card content...</span>
  </div>
));

export const StatisticsSkeleton: React.FC<{ className?: string }> = memo(({ className = '' }) => (
  <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`} role="status" aria-label="Loading statistics">
    {Array.from({ length: 4 }, (_, index) => (
      <div key={index} className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
        <div className="animate-pulse">
          <LoadingSkeleton variant="circular" width={48} height={48} className="mx-auto mb-3" />
          <LoadingSkeleton variant="text" height="2rem" width="60%" className="mx-auto mb-2" />
          <LoadingSkeleton variant="text" height="0.875rem" width="80%" className="mx-auto" />
        </div>
      </div>
    ))}
    <span className="sr-only">Loading statistics...</span>
  </div>
));

export const ProgressSkeleton: React.FC<{ className?: string }> = memo(({ className = '' }) => (
  <div className={`p-4 bg-gray-50 rounded-xl border border-gray-200 ${className}`} role="status" aria-label="Loading progress">
    <div className="animate-pulse">
      <div className="flex justify-between items-center mb-3">
        <LoadingSkeleton variant="text" height="0.875rem" width="30%" />
        <LoadingSkeleton variant="text" height="0.875rem" width="15%" />
      </div>
      <LoadingSkeleton variant="rectangular" height="1rem" className="rounded-full" />
    </div>
    <span className="sr-only">Loading progress...</span>
  </div>
));

// CSS for enhanced skeleton animations
const skeletonStyles = `
  @keyframes shimmer {
    0% {
      background-position: -200px 0;
    }
    100% {
      background-position: calc(200px + 100%) 0;
    }
  }
  
  .animate-shimmer {
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200px 100%;
    animation: shimmer 1.5s infinite;
  }
  
  .skeleton-wave::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
    animation: wave 1.5s infinite;
  }
  
  @keyframes wave {
    0% {
      left: -100%;
    }
    100% {
      left: 100%;
    }
  }
`;

// Inject enhanced skeleton styles
if (typeof document !== 'undefined' && !document.getElementById('skeleton-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'skeleton-styles';
  styleElement.textContent = skeletonStyles;
  document.head.appendChild(styleElement);
}
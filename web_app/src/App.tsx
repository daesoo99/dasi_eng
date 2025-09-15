import React, { useEffect, Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAuth } from '@/hooks/useAuth';
import UserProfile from '@/components/UserProfile';
import AuthModal from '@/components/AuthModal';
import PerformanceDashboard from '@/components/PerformanceDashboard';
import { initializeAdvancedPluginSystem } from '@/plugins/simple/AdvancedIntegration';

// Lazy load pages for better performance
const LandingHome = lazy(() => import('@/pages/LandingHome').then(m => ({ default: m.LandingHome })));
const DashboardHome = lazy(() => import('@/pages/DashboardHome').then(m => ({ default: m.DashboardHome })));
const StudyPage = lazy(() => import('@/pages/StudyPage').then(m => ({ default: m.StudyPage })));
const ReviewPage = lazy(() => import('@/pages/ReviewPage'));
const ResultPage = lazy(() => import('@/pages/ResultPage').then(m => ({ default: m.ResultPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const AdaptivePackPage = lazy(() => import('@/pages/AdaptivePackPage').then(m => ({ default: m.AdaptivePackPage })));
const ScenarioDialoguePage = lazy(() => import('@/pages/ScenarioDialoguePage'));
const SmartReviewPage = lazy(() => import('@/pages/SmartReviewPage'));
const ProgressManagementPage = lazy(() => import('@/pages/ProgressManagementPage'));
const CurriculumTestPage = lazy(() => import('@/pages/CurriculumTestPage').then(m => ({ default: m.CurriculumTestPage })));
const CurriculumLintPage = lazy(() => import('@/pages/CurriculumLintPage').then(m => ({ default: m.CurriculumLintPage })));
const AudioV2TestPage = lazy(() => import('@/pages/AudioV2TestPage').then(m => ({ default: m.AudioV2TestPage })));
const SpeedModePage = lazy(() => import('@/pages/SpeedModePage'));
const StageFocusPage = lazy(() => import('@/pages/StageFocusPage'));
const AllModePage = lazy(() => import('@/pages/AllModePage').then(m => ({ default: m.AllModePage })));
const PatternTrainingPage = lazy(() => import('@/pages/PatternTrainingPage'));
const PatternTestPage = lazy(() => import('@/pages/PatternTestPage').then(m => ({ default: m.PatternTestPage })));
const SituationalTrainingPage = lazy(() => import('@/pages/SituationalTrainingPage').then(m => ({ default: m.SituationalTrainingPage })));
const SentenceServiceTest = lazy(() => import('@/components/SentenceServiceTest').then(m => ({ default: m.SentenceServiceTest })));
const CurriculumDemo = lazy(() => import('@/services/curriculum/CurriculumDemo').then(m => ({ default: m.CurriculumDemo })));
const AchievementsPage = lazy(() => import('@/pages/AchievementsPage'));
const VocabularyPage = lazy(() => import('@/pages/VocabularyPage'));

function App() {
  const { setUser } = useAppStore();
  const { isLoading, isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = React.useState(false);

  // 고급 플러그인 시스템 초기화
  useEffect(() => {
    const initAdvancedPlugins = async () => {
      try {
        console.log('🚀 Initializing Advanced Plugin System...');
        
        const result = await initializeAdvancedPluginSystem();
        
        if (result.success) {
          console.log('✅ Advanced Plugin System ready!');
          console.log('📦 Loaded plugins:', result.loadedPlugins);
          console.log('📊 Bundle analysis:', result.bundleAnalysis);
        } else {
          console.error('❌ Advanced Plugin System failed:', result.error);
        }
      } catch (error) {
        console.error('❌ Advanced Plugin System error:', error);
      }
    };
    
    initAdvancedPlugins();
    
    // 컴포넌트 언마운트 시 플러그인 시스템 정리
    return () => {
      // Advanced plugin system handles cleanup internally
      console.log('🧹 Plugin system cleanup on unmount');
    };
  }, []);

  useEffect(() => {
    // Firebase Auth 로딩이 완료되고 미인증 상태일 때 로그인 모달 표시
    if (!isLoading && !isAuthenticated) {
      console.log('[DEBUG] 🚪 미인증 사용자 감지 - 로그인 모달 표시');
      setShowAuthModal(true);
      
      // 임시 사용자 생성 (모달이 닫혀도 앱을 사용할 수 있도록)
      const { user } = useAppStore.getState();
      if (!user.id) {
        console.log('[DEBUG] 🔄 임시 사용자 생성');
        setUser({
          id: 'demo-user-' + Date.now(),
          level: 1,
          stage: 1,
          isAuthenticated: false,
        });
      }
    } else if (isAuthenticated) {
      console.log('[DEBUG] ✅ 인증된 사용자 - 로그인 모달 숨김');
      setShowAuthModal(false);
    }
  }, [setUser, isLoading, isAuthenticated]);

  const handleAuthSuccess = (authUser: any) => {
    console.log('[DEBUG] ✅ App 레벨 인증 성공:', authUser.uid);
    setShowAuthModal(false);
  };

  const handleCloseAuthModal = () => {
    console.log('[DEBUG] 📴 사용자가 로그인 모달을 닫음');
    setShowAuthModal(false);
  };

  return (
    <ErrorBoundary level="page" onError={(error, errorInfo) => {
      console.error('App-level error:', error, errorInfo);
      // Here you could send error reports to a service like Sentry
    }}>
      <Router>
        <div className="App min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
          {/* 헤더 - 사용자 프로필 */}
          <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 z-50 sticky top-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-4">
                  <Link to="/" className="text-xl font-bold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer">
                    DaSi English
                  </Link>
                </div>
                
                <div className="flex items-center space-x-4">
                  <UserProfile />
                </div>
              </div>
            </div>
          </header>
          
          <Suspense fallback={<LoadingSkeleton />}>
            <Routes>
          <Route path="/" element={<LandingHome />} />
          <Route path="/dashboard" element={<DashboardHome />} />
          <Route path="/study" element={<StudyPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/result" element={<ResultPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/personalized" element={<AdaptivePackPage />} />
          <Route path="/scenario" element={<ScenarioDialoguePage />} />
          <Route path="/smart-review" element={<SmartReviewPage />} />
          <Route path="/progress" element={<ProgressManagementPage />} />
          <Route path="/curriculum-test" element={<CurriculumTestPage />} />
          <Route path="/curriculum-lint" element={<CurriculumLintPage />} />
          <Route path="/audio-test" element={<AudioV2TestPage />} />
          <Route path="/speed-mode" element={<SpeedModePage />} />
          <Route path="/stage-focus" element={<StageFocusPage />} />
          <Route path="/all-mode" element={<AllModePage />} />
          <Route path="/pattern-training" element={<PatternTrainingPage />} />
          <Route path="/pattern-test" element={<PatternTestPage />} />
          <Route path="/situational-training" element={<SituationalTrainingPage />} />
          <Route path="/sentence-test" element={<SentenceServiceTest />} />
          <Route path="/curriculum-demo" element={<CurriculumDemo />} />
          <Route path="/achievements" element={<AchievementsPage />} />
          <Route path="/vocabulary" element={<VocabularyPage />} />
          {/* 안전장치: 알 수 없는 경로는 랜딩으로 */}
          <Route path="*" element={<LandingHome />} />
            </Routes>
          </Suspense>
        </div>
      </Router>
      
      {/* 글로벌 로그인 모달 */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={handleCloseAuthModal}
        onAuthSuccess={handleAuthSuccess}
      />
      
      {/* 성능 대시보드 */}
      <PerformanceDashboard />
    </ErrorBoundary>
  );
}

export default App;
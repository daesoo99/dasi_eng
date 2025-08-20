import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';

// Pages
import { LandingHome } from '@/pages/LandingHome';
import { DashboardHome } from '@/pages/DashboardHome';
import { StudyPage } from '@/pages/StudyPage';
import { ReviewPage } from '@/pages/ReviewPage';
import { ResultPage } from '@/pages/ResultPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { AdaptivePackPage } from '@/pages/AdaptivePackPage';
import ScenarioDialoguePage from '@/pages/ScenarioDialoguePage';
import SmartReviewPage from '@/pages/SmartReviewPage';
import ProgressManagementPage from '@/pages/ProgressManagementPage';
import { CurriculumTestPage } from '@/pages/CurriculumTestPage';
import { CurriculumLintPage } from '@/pages/CurriculumLintPage';
import { AudioV2TestPage } from '@/pages/AudioV2TestPage';
import SpeedModePage from '@/pages/SpeedModePage';
import StageFocusPage from '@/pages/StageFocusPage';
import { AllModePage } from '@/pages/AllModePage';
import { PatternTrainingPage } from '@/pages/PatternTrainingPage';
import { PatternTestPage } from '@/pages/PatternTestPage';

function App() {
  const { setUser } = useAppStore();

  useEffect(() => {
    // Initialize default user if not set
    const { user } = useAppStore.getState();
    if (!user.id) {
      setUser({
        id: 'demo-user-' + Date.now(),
        level: 1,
        stage: 1,
        isAuthenticated: true,
      });
    }
  }, [setUser]);

  return (
    <Router>
      <div className="App">
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
          {/* 안전장치: 알 수 없는 경로는 랜딩으로 */}
          <Route path="*" element={<LandingHome />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
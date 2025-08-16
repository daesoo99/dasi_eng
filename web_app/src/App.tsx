import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';

// Pages
import { HomePage } from '@/pages/HomePage';
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
          <Route path="/" element={<HomePage />} />
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
        </Routes>
      </div>
    </Router>
  );
}

export default App;
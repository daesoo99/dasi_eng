import React from 'react';
import MigrationDashboard from '../components/MigrationDashboard';
import ProgressIndicator from '../components/ProgressIndicator';
import { VoiceGuidanceSettings } from '../components/VoiceGuidanceSettings';
import { CustomFeedbackPanel } from '../components/CustomFeedbackPanel';

const MigrationPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Curriculum Migration Center
          </h1>
          <p className="text-lg text-gray-600">
            Manage and monitor curriculum data migrations with real-time progress tracking
          </p>
        </div>

        <div className="space-y-8">
          {/* 접근성 설정 */}
          <VoiceGuidanceSettings />
          
          {/* 메인 마이그레이션 대시보드 */}
          <MigrationDashboard />
          
          {/* 맞춤형 피드백 시스템 (AI 확장 대비) */}
          <CustomFeedbackPanel 
            userId="u123"
            patternId="p45"
            onExamplesGenerated={(examples) => console.log('Generated examples:', examples)}
          />

          {/* 개별 작업 진행 상황 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Single File Migration</h2>
              <ProgressIndicator 
                operation="migrate"
                onComplete={(result) => console.log('Migration completed:', result)}
                onError={(error) => console.error('Migration failed:', error)}
              />
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Curriculum Validation</h2>
              <ProgressIndicator 
                operation="validate"
                onComplete={(result) => console.log('Validation completed:', result)}
                onError={(error) => console.error('Validation failed:', error)}
              />
            </div>
          </div>

          {/* 시스템 상태 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">System Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-800 mb-2">Migration Tools</h3>
                <ul className="text-sm text-blue-600 space-y-1">
                  <li>✅ Safe Migrator</li>
                  <li>✅ Batch Processor</li>
                  <li>✅ Checkpoint System</li>
                </ul>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-medium text-green-800 mb-2">Validation System</h3>
                <ul className="text-sm text-green-600 space-y-1">
                  <li>✅ JSON Schema Validation</li>
                  <li>✅ Version Management</li>
                  <li>✅ Error Reporting</li>
                </ul>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-medium text-purple-800 mb-2">Real-time Features</h3>
                <ul className="text-sm text-purple-600 space-y-1">
                  <li>✅ Socket.io Connection</li>
                  <li>✅ Progress Tracking</li>
                  <li>✅ Live File Status</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MigrationPage;
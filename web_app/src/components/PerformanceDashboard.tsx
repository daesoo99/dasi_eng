/**
 * Performance Dashboard Component
 * @description 실시간 성능 모니터링 대시보드 - Service Container와 연동
 */

import React, { useState, useEffect, useRef } from 'react';
import { getServiceContainerSync } from '@/container/ServiceContainer';
import type { PerformanceStats, PerformanceEvent } from '@/plugins/performance/IPerformancePlugin';

interface DashboardState {
  isVisible: boolean;
  stats: PerformanceStats | null;
  recentEvents: PerformanceEvent[];
  containerStatus: any;
  audioLatencyHistory: number[];
  isMonitoring: boolean;
}

export const PerformanceDashboard: React.FC = () => {
  const [state, setState] = useState<DashboardState>({
    isVisible: false,
    stats: null,
    recentEvents: [],
    containerStatus: null,
    audioLatencyHistory: [],
    isMonitoring: false
  });

  const intervalRef = useRef<NodeJS.Timeout>();
  const container = getServiceContainerSync();

  // 실시간 데이터 업데이트
  useEffect(() => {
    if (state.isVisible && state.isMonitoring) {
      intervalRef.current = setInterval(async () => {
        try {
          // Performance Plugin에서 데이터 가져오기
          const performancePlugin = await container.ensurePerformancePlugin();
          const statsResult = await performancePlugin.getPerformanceStats();
          
          if (statsResult.success) {
            setState(prev => ({
              ...prev,
              stats: statsResult.data,
              containerStatus: container.getServicesStatus(),
              audioLatencyHistory: [
                ...prev.audioLatencyHistory.slice(-9), // 최근 10개만 유지
                statsResult.data.audioPerformance.averageLatency
              ]
            }));
          }
        } catch (error) {
          console.error('[PerformanceDashboard] Data update failed:', error);
        }
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.isVisible, state.isMonitoring]);

  // Performance Plugin 이벤트 리스너
  useEffect(() => {
    const handlePerformanceEvent = (event: PerformanceEvent) => {
      setState(prev => ({
        ...prev,
        recentEvents: [
          event,
          ...prev.recentEvents.slice(0, 4) // 최근 5개만 유지
        ]
      }));
    };

    container.ensurePerformancePlugin().then(plugin => {
      plugin.onPerformanceEvent(handlePerformanceEvent);
    });

    return () => {
      container.ensurePerformancePlugin().then(plugin => {
        plugin.offPerformanceEvent(handlePerformanceEvent);
      });
    };
  }, []);

  const toggleDashboard = () => {
    setState(prev => ({ ...prev, isVisible: !prev.isVisible }));
  };

  const toggleMonitoring = async () => {
    try {
      const performancePlugin = await container.ensurePerformancePlugin();
      
      if (state.isMonitoring) {
        performancePlugin.stopMonitoring();
      } else {
        performancePlugin.startMonitoring();
      }
      
      setState(prev => ({ ...prev, isMonitoring: !prev.isMonitoring }));
    } catch (error) {
      console.error('[PerformanceDashboard] Toggle monitoring failed:', error);
    }
  };

  const generateReport = async () => {
    try {
      const performancePlugin = await container.ensurePerformancePlugin();
      const reportResult = await performancePlugin.generatePerformanceReport();
      
      if (reportResult.success) {
        console.log('[PerformanceDashboard] Report generated:', reportResult.data);
        // 리포트를 JSON으로 다운로드
        const blob = new Blob([JSON.stringify(reportResult.data, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance-report-${new Date().toISOString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('[PerformanceDashboard] Report generation failed:', error);
    }
  };

  const clearMetrics = async () => {
    try {
      const performancePlugin = await container.ensurePerformancePlugin();
      await performancePlugin.clearMetrics();
      setState(prev => ({
        ...prev,
        stats: null,
        recentEvents: [],
        audioLatencyHistory: []
      }));
    } catch (error) {
      console.error('[PerformanceDashboard] Clear metrics failed:', error);
    }
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 1000) return 'text-green-500';
    if (latency < 2000) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (!state.isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={toggleDashboard}
          className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition-colors"
          title="Open Performance Dashboard"
        >
          📊
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-300 dark:border-gray-600 w-96 max-h-[80vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Performance Monitor
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleMonitoring}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              state.isMonitoring
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {state.isMonitoring ? 'Stop' : 'Start'}
          </button>
          <button
            onClick={toggleDashboard}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Service Container Status */}
        {state.containerStatus && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Service Status</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(state.containerStatus).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                  </span>
                  <span className={typeof value === 'boolean' ? (value ? 'text-green-500' : 'text-red-500') : 'text-gray-900 dark:text-white'}>
                    {typeof value === 'boolean' ? (value ? '✓' : '✗') : value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance Stats */}
        {state.stats && (
          <div className="space-y-3">
            {/* Audio Performance */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Audio Performance</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Average Latency:</span>
                  <span className={getLatencyColor(state.stats.audioPerformance.averageLatency)}>
                    {state.stats.audioPerformance.averageLatency.toFixed(0)}ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Measurements:</span>
                  <span>{state.stats.audioPerformance.totalMeasurements}</span>
                </div>
                <div className="flex justify-between">
                  <span>Score:</span>
                  <span className={getScoreColor(state.stats.audioPerformance.performanceScore)}>
                    {state.stats.audioPerformance.performanceScore.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* API Performance */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
              <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">API Performance</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Response Time:</span>
                  <span>{state.stats.apiPerformance.averageResponseTime.toFixed(0)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Calls:</span>
                  <span>{state.stats.apiPerformance.totalCalls}</span>
                </div>
                <div className="flex justify-between">
                  <span>Error Rate:</span>
                  <span className={state.stats.apiPerformance.errorRate > 5 ? 'text-red-500' : 'text-green-500'}>
                    {(state.stats.apiPerformance.errorRate * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Memory Usage */}
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
              <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-2">Memory Usage</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Current:</span>
                  <span>{(state.stats.memory.currentUsage / 1024 / 1024).toFixed(1)} MB</span>
                </div>
                <div className="flex justify-between">
                  <span>Peak:</span>
                  <span>{(state.stats.memory.peakUsage / 1024 / 1024).toFixed(1)} MB</span>
                </div>
                <div className="flex justify-between">
                  <span>Average:</span>
                  <span>{(state.stats.memory.averageUsage / 1024 / 1024).toFixed(1)} MB</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Audio Latency Chart */}
        {state.audioLatencyHistory.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Latency Trend</h4>
            <div className="flex items-end space-x-1 h-16">
              {state.audioLatencyHistory.map((latency, index) => (
                <div
                  key={index}
                  className="bg-blue-500 rounded-t"
                  style={{
                    height: `${Math.min(100, (latency / 3000) * 100)}%`,
                    width: '100%'
                  }}
                  title={`${latency.toFixed(0)}ms`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Recent Events */}
        {state.recentEvents.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Recent Events</h4>
            <div className="space-y-1">
              {state.recentEvents.map((event, index) => (
                <div key={index} className="text-xs flex justify-between">
                  <span className={
                    event.type === 'error' ? 'text-red-500' :
                    event.type === 'warning' ? 'text-yellow-500' :
                    'text-gray-600 dark:text-gray-300'
                  }>
                    {event.type}
                  </span>
                  <span className="text-gray-500">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-2">
          <button
            onClick={generateReport}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded text-sm font-medium transition-colors"
          >
            Export Report
          </button>
          <button
            onClick={clearMetrics}
            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-3 rounded text-sm font-medium transition-colors"
          >
            Clear Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;
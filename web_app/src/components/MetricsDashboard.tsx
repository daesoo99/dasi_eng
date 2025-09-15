/**
 * Metrics Dashboard Component
 * @description Real-time SLO monitoring and metrics visualization
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  getMetricsDashboardData, 
  releaseGateValidator,
  PRODUCTION_SLO,
  SLOViolation 
} from '@/plugins/simple/MetricsAndSLOs';

// ===== Dashboard Types =====

interface DashboardState {
  realTimeMetrics: {
    p95Latency: number;
    successRate: number;
    interruptionRate: number;
    memoryUsage: number;
    activeOperations: number;
  };
  sloCompliance: {
    compliant: boolean;
    violations: SLOViolation[];
  };
  errorBreakdown: Record<string, number>;
  systemHealth: 'healthy' | 'degraded' | 'critical';
  lastUpdated: Date;
}

// ===== Utility Functions =====

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatLatency(ms: number): string {
  return `${ms.toFixed(1)}ms`;
}

function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}

function getHealthColor(health: string): string {
  switch (health) {
    case 'healthy': return 'text-green-600 bg-green-50';
    case 'degraded': return 'text-yellow-600 bg-yellow-50';
    case 'critical': return 'text-red-600 bg-red-50';
    default: return 'text-gray-600 bg-gray-50';
  }
}

// function getSLOColor(value: number, target: number, isHigherBetter = true): string {
//   const ratio = isHigherBetter ? value / target : target / value;
//   
//   if (ratio >= 1.0) return 'text-green-600';
//   if (ratio >= 0.95) return 'text-yellow-600';
//   return 'text-red-600';
// }

// ===== Metric Card Component =====

interface MetricCardProps {
  title: string;
  value: string;
  target?: string;
  status: 'good' | 'warning' | 'critical';
  trend?: 'up' | 'down' | 'stable';
  description?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  target, 
  status, 
  trend, 
  description 
}) => {
  const statusColors = {
    good: 'border-green-200 bg-green-50',
    warning: 'border-yellow-200 bg-yellow-50',
    critical: 'border-red-200 bg-red-50'
  };

  const valueColors = {
    good: 'text-green-700',
    warning: 'text-yellow-700',
    critical: 'text-red-700'
  };

  const trendIcons = {
    up: '↗️',
    down: '↘️',
    stable: '→'
  };

  return (
    <div className={`p-4 border rounded-lg ${statusColors[status]}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        {trend && (
          <span className="text-sm" title={`Trend: ${trend}`}>
            {trendIcons[trend]}
          </span>
        )}
      </div>
      
      <div className="mt-2">
        <div className={`text-2xl font-bold ${valueColors[status]}`}>
          {value}
        </div>
        
        {target && (
          <div className="text-sm text-gray-600 mt-1">
            Target: {target}
          </div>
        )}
        
        {description && (
          <div className="text-xs text-gray-500 mt-2">
            {description}
          </div>
        )}
      </div>
    </div>
  );
};

// ===== SLO Violations Component =====

interface SLOViolationsProps {
  violations: SLOViolation[];
}

const SLOViolations: React.FC<SLOViolationsProps> = ({ violations }) => {
  if (violations.length === 0) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center">
          <span className="text-green-600 mr-2">✅</span>
          <span className="text-green-700 font-medium">All SLOs are compliant</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {violations.map((violation, index) => (
        <div 
          key={index}
          className={`p-3 border rounded-lg ${
            violation.severity === 'critical' 
              ? 'bg-red-50 border-red-200' 
              : 'bg-yellow-50 border-yellow-200'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center">
                <span className={`mr-2 ${
                  violation.severity === 'critical' ? 'text-red-600' : 'text-yellow-600'
                }`}>
                  {violation.severity === 'critical' ? '🚨' : '⚠️'}
                </span>
                <span className="font-medium capitalize text-gray-800">
                  {violation.metric.replace(/([A-Z])/g, ' $1').toLowerCase()}
                </span>
              </div>
              
              <div className="mt-1 text-sm text-gray-600">
                {violation.details || `${violation.actual} vs target ${violation.target}`}
              </div>
            </div>
            
            <div className="text-xs text-gray-400">
              {new Date(violation.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ===== Error Breakdown Component =====

interface ErrorBreakdownProps {
  errors: Record<string, number>;
}

const ErrorBreakdown: React.FC<ErrorBreakdownProps> = ({ errors }) => {
  const totalErrors = Object.values(errors).reduce((sum, count) => sum + count, 0);
  
  if (totalErrors === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No errors in the current time window
      </div>
    );
  }

  const sortedErrors = Object.entries(errors)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10); // Top 10 errors

  return (
    <div className="space-y-2">
      {sortedErrors.map(([errorCode, count]) => {
        const percentage = (count / totalErrors) * 100;
        
        return (
          <div key={errorCode} className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <div className="flex-1">
              <div className="flex items-center">
                <code className="text-sm font-mono text-red-600 bg-red-50 px-2 py-1 rounded">
                  {errorCode}
                </code>
                <div className="ml-3 flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </div>
            
            <div className="ml-4 text-sm font-medium text-gray-700">
              {count} ({percentage.toFixed(1)}%)
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ===== Release Gate Status Component =====

const ReleaseGateStatus: React.FC = () => {
  const [gateResults, setGateResults] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runReleaseGates = async () => {
    setIsRunning(true);
    try {
      const results = await releaseGateValidator.runReleaseGates();
      setGateResults(results);
    } catch (error) {
      console.error('Release gate execution failed:', error);
      setGateResults({
        passed: false,
        results: [],
        overallMetrics: {},
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-800">Release Gate Status</h3>
        
        <button
          onClick={runReleaseGates}
          disabled={isRunning}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            isRunning
              ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isRunning ? 'Running Gates...' : 'Run Release Gates'}
        </button>
      </div>

      {gateResults && (
        <div className="space-y-3">
          {/* Overall Status */}
          <div className={`p-4 border rounded-lg ${
            gateResults.passed 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center">
              <span className={`mr-2 text-2xl ${
                gateResults.passed ? 'text-green-600' : 'text-red-600'
              }`}>
                {gateResults.passed ? '✅' : '❌'}
              </span>
              <span className={`font-medium ${
                gateResults.passed ? 'text-green-800' : 'text-red-800'
              }`}>
                Release {gateResults.passed ? 'APPROVED' : 'BLOCKED'}
              </span>
            </div>
          </div>

          {/* Individual Gate Results */}
          <div className="space-y-2">
            {gateResults.results.map((result: any, index: number) => (
              <div 
                key={index}
                className={`p-3 border rounded-lg ${
                  result.passed 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className={`mr-2 ${
                      result.passed ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {result.passed ? '✅' : '❌'}
                    </span>
                    <span className="font-medium text-gray-800">{result.gate}</span>
                  </div>
                  
                  <span className="text-sm text-gray-500">
                    {result.duration}ms
                  </span>
                </div>
                
                {result.reason && (
                  <div className="mt-2 text-sm text-red-600">
                    {result.reason}
                  </div>
                )}
                
                {result.metrics && (
                  <div className="mt-2 text-xs text-gray-600">
                    <pre className="bg-gray-100 p-2 rounded overflow-x-auto">
                      {JSON.stringify(result.metrics, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ===== Main Dashboard Component =====

export const MetricsDashboard: React.FC = () => {
  const [dashboardState, setDashboardState] = useState<DashboardState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auto-refresh dashboard data
  useEffect(() => {
    const updateDashboard = async () => {
      try {
        const data = getMetricsDashboardData();
        
        // Determine system health
        let systemHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
        
        if (data.sloCompliance.violations.some(v => v.severity === 'critical')) {
          systemHealth = 'critical';
        } else if (data.sloCompliance.violations.length > 0) {
          systemHealth = 'degraded';
        }

        setDashboardState({
          ...data,
          systemHealth,
          lastUpdated: new Date()
        });
        
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    // Initial load
    updateDashboard();

    // Auto-refresh every 5 seconds
    const interval = setInterval(updateDashboard, 5000);

    return () => clearInterval(interval);
  }, []);

  // Memoized metric calculations
  const metricCards = useMemo(() => {
    if (!dashboardState) return [];

    const { realTimeMetrics } = dashboardState;

    return [
      {
        title: 'P95 Latency',
        value: formatLatency(realTimeMetrics.p95Latency),
        target: formatLatency(PRODUCTION_SLO.p95StartLatency),
        status: realTimeMetrics.p95Latency <= PRODUCTION_SLO.p95StartLatency ? 'good' as const : 
               realTimeMetrics.p95Latency <= PRODUCTION_SLO.p95StartLatency * 1.2 ? 'warning' as const : 'critical' as const,
        description: '95th percentile response time'
      },
      {
        title: 'Success Rate',
        value: formatPercentage(realTimeMetrics.successRate),
        target: formatPercentage(PRODUCTION_SLO.successRate),
        status: realTimeMetrics.successRate >= PRODUCTION_SLO.successRate ? 'good' as const :
               realTimeMetrics.successRate >= PRODUCTION_SLO.successRate * 0.98 ? 'warning' as const : 'critical' as const,
        description: 'Successful operations percentage'
      },
      {
        title: 'Interruption Rate',
        value: formatPercentage(realTimeMetrics.interruptionRate),
        target: formatPercentage(PRODUCTION_SLO.interruptionRate),
        status: realTimeMetrics.interruptionRate <= PRODUCTION_SLO.interruptionRate ? 'good' as const :
               realTimeMetrics.interruptionRate <= PRODUCTION_SLO.interruptionRate * 1.5 ? 'warning' as const : 'critical' as const,
        description: 'Operations interrupted by users'
      },
      {
        title: 'Memory Usage',
        value: formatBytes(realTimeMetrics.memoryUsage),
        target: formatBytes(PRODUCTION_SLO.memoryUsageCeiling),
        status: realTimeMetrics.memoryUsage <= PRODUCTION_SLO.memoryUsageCeiling ? 'good' as const :
               realTimeMetrics.memoryUsage <= PRODUCTION_SLO.memoryUsageCeiling * 1.1 ? 'warning' as const : 'critical' as const,
        description: 'Current JavaScript heap usage'
      },
      {
        title: 'Active Operations',
        value: realTimeMetrics.activeOperations.toString(),
        target: '< 10',
        status: realTimeMetrics.activeOperations <= 5 ? 'good' as const :
               realTimeMetrics.activeOperations <= 10 ? 'warning' as const : 'critical' as const,
        description: 'Currently running speech operations'
      }
    ];
  }, [dashboardState]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">Loading metrics dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center">
          <span className="text-red-600 mr-2">❌</span>
          <span className="text-red-700 font-medium">Dashboard Error</span>
        </div>
        <div className="mt-2 text-red-600 text-sm">{error}</div>
      </div>
    );
  }

  if (!dashboardState) {
    return (
      <div className="p-4 text-center text-gray-500">
        No metrics data available
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Speech Plugin Metrics</h1>
          <p className="text-gray-600">
            Last updated: {dashboardState.lastUpdated.toLocaleString()}
          </p>
        </div>
        
        <div className={`px-4 py-2 rounded-full font-medium ${getHealthColor(dashboardState.systemHealth)}`}>
          <span className="mr-2">
            {dashboardState.systemHealth === 'healthy' ? '🟢' : 
             dashboardState.systemHealth === 'degraded' ? '🟡' : '🔴'}
          </span>
          System {dashboardState.systemHealth.toUpperCase()}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {metricCards.map((card, index) => (
          <MetricCard key={index} {...card} />
        ))}
      </div>

      {/* SLO Violations */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-medium text-gray-800 mb-4">SLO Compliance</h2>
        <SLOViolations violations={dashboardState.sloCompliance.violations} />
      </div>

      {/* Error Breakdown */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-medium text-gray-800 mb-4">Error Breakdown</h2>
        <ErrorBreakdown errors={dashboardState.errorBreakdown} />
      </div>

      {/* Release Gates */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <ReleaseGateStatus />
      </div>

      {/* Raw Metrics (Collapsible) */}
      <details className="bg-white rounded-lg shadow-sm border">
        <summary className="p-6 cursor-pointer font-medium text-gray-800 hover:bg-gray-50">
          Raw Metrics Data
        </summary>
        <div className="px-6 pb-6">
          <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto">
            {JSON.stringify(dashboardState, null, 2)}
          </pre>
        </div>
      </details>
    </div>
  );
};
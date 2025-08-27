import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import ProgressIndicator from './ProgressIndicator';

interface FileStatus {
  file: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress?: number;
  error?: string;
}

interface MigrationStats {
  total: number;
  completed: number;
  failed: number;
  inProgress: number;
}

export const MigrationDashboard: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [stats, setStats] = useState<MigrationStats>({ total: 0, completed: 0, failed: 0, inProgress: 0 });
  const [isConnected, setIsConnected] = useState(false);
  const [operation, setOperation] = useState<'migrate' | 'validate'>('migrate');

  useEffect(() => {
    const socketConnection = io('http://localhost:8081');
    setSocket(socketConnection);

    socketConnection.on('connect', () => {
      setIsConnected(true);
    });

    socketConnection.on('disconnect', () => {
      setIsConnected(false);
    });

    socketConnection.on('progress', (msg: any) => {
      if (msg.type === 'batch-progress') {
        setFiles(msg.files || []);
        setStats(msg.stats || { total: 0, completed: 0, failed: 0, inProgress: 0 });
      }
    });

    return () => {
      socketConnection.disconnect();
    };
  }, []);

  const startMigration = () => {
    if (!socket || stats.inProgress > 0) {
      console.log('[DEBUG] 🚫 Migration 시작 차단:', { hasSocket: !!socket, inProgress: stats.inProgress });
      return;
    }
    
    console.log('[DEBUG] 🚀 Migration 시작');
    setFiles([]);
    setStats({ total: 0, completed: 0, failed: 0, inProgress: 0 });
    socket.emit('migrate-batch', { dryRun: false });
  };

  const startValidation = () => {
    if (!socket || stats.inProgress > 0) {
      console.log('[DEBUG] 🚫 Validation 시작 차단:', { hasSocket: !!socket, inProgress: stats.inProgress });
      return;
    }
    
    console.log('[DEBUG] ✅ Validation 시작');
    setFiles([]);
    setStats({ total: 0, completed: 0, failed: 0, inProgress: 0 });
    socket.emit('validate-curriculum', { strict: true });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'error': return 'text-red-600 bg-red-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'error': return '❌';
      case 'processing': return '🔄';
      default: return '⏳';
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Migration Dashboard</h2>
        
        <div className="flex items-center space-x-4 mb-6">
          <div className={`flex items-center space-x-2 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            <div 
              className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
              aria-hidden="true"
            ></div>
            <span className="text-sm font-medium" role="status" aria-live="polite">
              <span className="sr-only">Connection status: </span>
              {isConnected ? 'Connected to server' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6" role="region" aria-label="Migration Statistics">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800" id="total-files">Total Files</h3>
            <p className="text-2xl font-bold text-blue-900" aria-labelledby="total-files">{stats.total}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-green-800" id="completed-files">Completed</h3>
            <p className="text-2xl font-bold text-green-900" aria-labelledby="completed-files">{stats.completed}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-yellow-800" id="progress-files">In Progress</h3>
            <p className="text-2xl font-bold text-yellow-900" aria-labelledby="progress-files">{stats.inProgress}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-red-800" id="failed-files">Failed</h3>
            <p className="text-2xl font-bold text-red-900" aria-labelledby="failed-files">{stats.failed}</p>
          </div>
        </div>

        <div className="flex space-x-4 mb-6" role="group" aria-label="Migration Actions">
          <button
            onClick={startValidation}
            disabled={!isConnected}
            className="bg-yellow-500 hover:bg-yellow-700 disabled:bg-gray-300 text-white font-bold py-2 px-4 rounded transition-colors"
            aria-label="Start validation of all curriculum files"
            aria-describedby={!isConnected ? "connection-required" : undefined}
          >
            <span aria-hidden="true">✅</span> Validate All
          </button>
          <button
            onClick={startMigration}
            disabled={!isConnected}
            className="bg-blue-500 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold py-2 px-4 rounded transition-colors"
            aria-label="Start migration of all curriculum files"
            aria-describedby={!isConnected ? "connection-required" : undefined}
          >
            <span aria-hidden="true">🚀</span> Start Migration
          </button>
          {!isConnected && (
            <div id="connection-required" className="sr-only">
              Connection to server required to perform this action
            </div>
          )}
        </div>

        {stats.total > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4" role="progressbar" aria-valuenow={(stats.completed / stats.total) * 100} aria-valuemin={0} aria-valuemax={100} aria-label={`Migration progress: ${stats.completed} of ${stats.total} files completed`}>
            <div 
              className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${(stats.completed / stats.total) * 100}%` }}
            />
            <span className="sr-only">
              {Math.round((stats.completed / stats.total) * 100)}% complete
            </span>
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">File Status</h3>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{getStatusIcon(file.status)}</span>
                  <span className="font-mono text-sm text-gray-700 truncate max-w-md">
                    {file.file}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  {file.progress && (
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  )}
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(file.status)}`}>
                    {file.status}
                  </span>
                </div>
                {file.error && (
                  <div className="text-xs text-red-600 max-w-xs truncate">
                    {file.error}
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

export default MigrationDashboard;
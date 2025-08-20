import React, { useState } from 'react';
import { AudioSession } from '@/lib/audioV2/AudioSession';
import { AudioSessionFactory } from '@/lib/audioV2/AudioSessionFactory';
import type { SessionState } from '@/lib/audioV2/types';

export const AudioV2Test: React.FC = () => {
  const [session, setSession] = useState<AudioSession | null>(null);
  const [state, setState] = useState<SessionState>('IDLE');
  const [isPaused, setIsPaused] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const createSession = async (level: number) => {
    try {
      const newSession = await AudioSessionFactory.create(level, {
        onStateChange: setState,
        onError: (error) => addLog(`Error: ${error.message}`),
        onResult: (result) => addLog(`Result: ${JSON.stringify(result)}`),
      });
      setSession(newSession);
      addLog(`Session created for Level ${level}`);
    } catch (error) {
      addLog(`Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const startSession = async () => {
    if (!session) return;
    try {
      await session.start();
      addLog('Session started');
    } catch (error) {
      addLog(`Start failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const pauseSession = () => {
    if (!session) return;
    session.pause();
    setIsPaused(true);
    addLog('Session paused');
  };

  const resumeSession = () => {
    if (!session) return;
    session.resume();
    setIsPaused(false);
    addLog('Session resumed');
  };

  const cancelSession = () => {
    if (!session) return;
    session.cancel();
    setState('IDLE');
    setIsPaused(false);
    addLog('Session cancelled');
  };

  const clearLogs = () => setLogs([]);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">AudioV2 System Test</h2>
      
      {/* Session Creation */}
      <div className="mb-6 p-4 border rounded-lg bg-gray-50">
        <h3 className="text-lg font-semibold mb-3">Create Session</h3>
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
            <button
              key={level}
              onClick={() => createSession(level)}
              className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              L{level}
            </button>
          ))}
        </div>
      </div>

      {/* Session Controls */}
      <div className="mb-6 p-4 border rounded-lg bg-gray-50">
        <h3 className="text-lg font-semibold mb-3">Session Controls</h3>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={startSession}
            disabled={!session || state !== 'IDLE'}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Start
          </button>
          <button
            onClick={pauseSession}
            disabled={!session || isPaused || state === 'IDLE'}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Pause
          </button>
          <button
            onClick={resumeSession}
            disabled={!session || !isPaused}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Resume
          </button>
          <button
            onClick={cancelSession}
            disabled={!session}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Status Display */}
      <div className="mb-6 p-4 border rounded-lg bg-gray-50">
        <h3 className="text-lg font-semibold mb-3">Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="font-medium">State:</span>
            <span className={`ml-2 px-2 py-1 rounded text-sm ${
              state === 'IDLE' ? 'bg-gray-200' :
              state === 'COMPLETE' ? 'bg-green-200' :
              state === 'ERROR' ? 'bg-red-200' :
              'bg-blue-200'
            }`}>
              {state}
            </span>
          </div>
          <div>
            <span className="font-medium">Paused:</span>
            <span className={`ml-2 px-2 py-1 rounded text-sm ${isPaused ? 'bg-yellow-200' : 'bg-gray-200'}`}>
              {isPaused ? 'Yes' : 'No'}
            </span>
          </div>
          <div>
            <span className="font-medium">Session:</span>
            <span className={`ml-2 px-2 py-1 rounded text-sm ${session ? 'bg-green-200' : 'bg-gray-200'}`}>
              {session ? 'Active' : 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* Logs */}
      <div className="p-4 border rounded-lg bg-gray-50">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">Logs</h3>
          <button
            onClick={clearLogs}
            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-sm"
          >
            Clear
          </button>
        </div>
        <div className="bg-black text-green-400 p-3 rounded font-mono text-sm max-h-64 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-gray-500">No logs yet...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index}>{log}</div>
            ))
          )}
        </div>
      </div>

      {/* Test Instructions */}
      <div className="mt-6 p-4 border rounded-lg bg-blue-50">
        <h3 className="text-lg font-semibold mb-2 text-blue-800">Test Instructions</h3>
        <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
          <li>Create a session for any level (L1-L10)</li>
          <li>Start the session to begin the standard lifecycle</li>
          <li>Test pause/resume functionality during different states</li>
          <li>Test cancel to ensure proper cleanup</li>
          <li>Monitor logs for state transitions and errors</li>
          <li>Test different levels to verify level-specific configurations</li>
        </ol>
      </div>
    </div>
  );
};
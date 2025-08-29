import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { io, Socket } from 'socket.io-client';
import { useVoiceGuidance } from '../hooks/useVoiceGuidance';

interface ProgressState {
  step: string;
  message?: string;
  progress?: number;
  data?: any;
}

interface ProgressIndicatorProps {
  operation: 'migrate' | 'validate' | 'pipeline';
  onComplete?: (result: any) => void;
  onError?: (error: any) => void;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = memo(({
  operation,
  onComplete,
  onError
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<ProgressState | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const { speak } = useVoiceGuidance();

  // Memoize step messages to prevent recreation on every render
  const stepMessages = useMemo(() => ({
    'STARTING': 'Starting operation',
    'VALIDATION': 'Validating files',
    'BACKUP': 'Creating backup',
    'MIGRATION': 'Migrating files',
    'FINALIZATION': 'Finalizing',
    'STT_START': 'Starting speech recognition',
    'STT_DONE': 'Speech recognition complete',
    'LLM_START': 'Processing with AI',
    'LLM_DONE': 'AI processing complete',
    'TTS_START': 'Generating speech',
    'TTS_DONE': 'Speech generation complete'
  }), []);

  // Memoize step weights to prevent recreation on every render
  const stepWeights = useMemo(() => ({
    'STARTING': 5,
    'VALIDATION': 20,
    'BACKUP': 30,
    'MIGRATION': 70,
    'FINALIZATION': 90,
    'COMPLETED': 100,
    'STT_START': 10,
    'STT_DONE': 30,
    'LLM_START': 50,
    'LLM_DONE': 80,
    'TTS_START': 90,
    'TTS_DONE': 100
  }), []);

  useEffect(() => {
    const socketConnection = io('http://localhost:8081');
    setSocket(socketConnection);

    socketConnection.on('progress', (msg: ProgressState) => {
      console.log('[PROGRESS EVENT]', msg.step, msg.data, { progress: msg.progress, message: msg.message });
      setStatus(msg);
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg.step}: ${msg.message || ''}`]);
      
      // Voice guidance for progress updates
      if (stepMessages[msg.step]) {
        speak(stepMessages[msg.step], 'system');
      }
    });

    socketConnection.on('result', (res: any) => {
      console.log('[RESULT EVENT]', res, { operation, timestamp: new Date().toISOString() });
      setStatus({ step: 'COMPLETED', message: 'Operation completed successfully' });
      setIsRunning(false);
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] RESULT: Success`]);
      speak(`${operation} completed successfully`, 'system');
      onComplete?.(res);
    });

    socketConnection.on('error', (err: any) => {
      console.error('[ERROR EVENT]', err, { operation, step: status?.step, timestamp: new Date().toISOString() });
      setStatus({ step: 'ERROR', message: err.message });
      setIsRunning(false);
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ERROR: ${err.message}`]);
      speak(`${operation} failed: ${err.message}`, 'system');
      onError?.(err);
    });

    return () => {
      socketConnection.disconnect();
    };
  }, [onComplete, onError, operation, stepMessages, speak]);

  const startOperation = useCallback((payload?: any) => {
    if (!socket || isRunning) return;
    
    console.log('[OPERATION START]', { operation, payload, isRunning, socketConnected: !!socket });
    setIsRunning(true);
    setStatus({ step: 'STARTING', message: 'Initializing...' });
    setLogs([`[${new Date().toLocaleTimeString()}] Starting ${operation} operation`]);
    speak(`Starting ${operation} operation`, 'system');
    
    switch (operation) {
      case 'migrate':
        socket.emit('migrate-batch', payload);
        break;
      case 'validate':
        socket.emit('validate-curriculum', payload);
        break;
      case 'pipeline':
        socket.emit('pipeline', payload);
        break;
    }
  }, [socket, isRunning, operation, speak]);

  const getProgressPercentage = useCallback(() => {
    if (!status) return 0;
    if (status.progress) return status.progress;
    
    return stepWeights[status.step] || 0;
  }, [status, stepWeights]);

  const getStepColor = useCallback(() => {
    if (!status) return 'bg-gray-200';
    if (status.step === 'ERROR') return 'bg-red-500';
    if (status.step === 'COMPLETED') return 'bg-green-500';
    return 'bg-blue-500';
  }, [status]);

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2 capitalize">{operation} Progress</h3>
        
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className={`h-2.5 rounded-full transition-all duration-300 ${getStepColor()}`}
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
        
        {status && (
          <div className="mt-2 text-sm text-gray-600">
            <span className="font-medium">{status.step}</span>
            {status.message && <span className="ml-2">{status.message}</span>}
          </div>
        )}
      </div>

      {!isRunning && (
        <button
          onClick={() => startOperation()}
          className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
          aria-label={`Start ${operation} operation`}
        >
          <span aria-hidden="true">🎙️</span> Start {operation}
        </button>
      )}

      {isRunning && (
        <button
          disabled
          className="w-full bg-gray-400 text-white font-bold py-2 px-4 rounded cursor-not-allowed"
          aria-label={`${operation} operation in progress`}
          aria-describedby="operation-status"
        >
          <span aria-hidden="true">⏳</span> {operation} in progress...
        </button>
      )}
      
      {status && (
        <div id="operation-status" className="sr-only" aria-live="polite">
          Current step: {status.step}. {status.message}
        </div>
      )}

      {logs.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Activity Log:</h4>
          <div className="bg-gray-50 rounded p-3 max-h-48 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index} className="text-xs text-gray-700 font-mono">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default ProgressIndicator;
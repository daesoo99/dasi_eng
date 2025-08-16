import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Chrome 확장 프로그램 오류 방지 (content.js 관련)
window.addEventListener('unhandledrejection', function(event) {
  // Chrome 확장 프로그램 관련 오류는 무시
  if (event.reason && event.reason.message && 
      event.reason.message.includes('message port closed')) {
    console.warn('Chrome extension error ignored:', event.reason.message);
    event.preventDefault();
    return;
  }
  
  // 다른 실제 오류는 로그에 기록
  console.error('Unhandled promise rejection:', event.reason);
});

// 전역 오류 핸들러
window.addEventListener('error', function(event) {
  // Chrome 확장 프로그램 관련 오류 필터링
  if (event.filename && event.filename.includes('chrome-extension://')) {
    console.warn('Chrome extension error ignored:', event.error);
    return;
  }
  
  console.error('Global error:', event.error);
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
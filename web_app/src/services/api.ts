import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export const interviewAPI = {
  start: async (config: { position: string; experience: string }) => {
    const response = await api.post('/interview/start', config);
    return response.data;
  },

  getNextQuestion: async (data: {
    interviewId: string;
    position: string;
    experience: string;
    previousQuestions: string[];
  }) => {
    const response = await api.post('/interview/question', data);
    return response.data;
  },

  evaluate: async (data: {
    question: string;
    answer: string;
    position: string;
  }) => {
    const response = await api.post('/interview/evaluate', data);
    return response.data;
  },

  end: async (data: {
    interviewId: string;
    totalScore: number;
    feedback: string;
  }) => {
    const response = await api.post('/interview/end', data);
    return response.data;
  }
};

export const speechAPI = {
  speechToText: async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    
    const response = await api.post('/speech/stt', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  textToSpeech: async (text: string, language = 'ko-KR') => {
    const response = await api.post('/speech/tts', { text, language }, {
      responseType: 'blob',
    });
    return response.data;
  }
};

export default api;
/**
 * SpeechService - STT, TTS, LLM 음성 처리 통합 서비스
 * TypeScript 변환: GoogleGenerativeAI + 캐시 + 큐 관리
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "../config/firebase";
import { sttQueue, llmQueue, ttsQueue } from './taskQueue';
import { getCachedTTS, setCachedTTS } from './ttsCache';

// 타입 정의
export interface SpeechEvaluation {
  majorError: boolean;
  naturalScore: number;
  correction: string;
}

export interface TTSResult {
  url: string;
  duration: number;
  voice: string;
  text: string;
  createdAt: string;
}

export interface LLMResponse {
  reply: string;
  preview: string;
}

export interface FullPipelineInput {
  audioBlob: Blob | string;
  voice: string;
  prompt?: string;
}

export interface FullPipelineResult {
  text: string;
  llm: LLMResponse;
  audio: TTSResult;
}

// Gemini AI 초기화 (환경변수 체크)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let genAI: GoogleGenerativeAI | null = null;

if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
} else {
  console.warn('⚠️ GEMINI_API_KEY not found - using mock responses');
}

/**
 * STT (Speech-to-Text) 처리
 */
async function runSTT(audioBlob: Blob | string): Promise<string> {
  // Google Cloud Speech-to-Text API 호출 (실제 구현)
  console.log('🎤 Running STT...');
  
  // 개발 환경에서는 모의 응답
  if (process.env.NODE_ENV === 'development') {
    await new Promise(resolve => setTimeout(resolve, 500));
    return 'Hello, this is a sample transcription';
  }
  
  // 실제 Google Cloud STT API 호출
  try {
    // const speech = require('@google-cloud/speech');
    // const client = new speech.SpeechClient();
    // const audio = { content: audioBlob };
    // const config = { encoding: 'WEBM_OPUS', sampleRateHertz: 16000, languageCode: 'en-US' };
    // const [response] = await client.recognize({ audio, config });
    // return response.results?.[0]?.alternatives?.[0]?.transcript || '';
    
    throw new Error('Google Cloud STT API 설정 필요');
  } catch (error) {
    console.error('STT API 호출 실패:', error);
    throw new Error('음성 인식 실패');
  }
}

/**
 * LLM (대화형 AI) 처리
 */
async function runLLM(prompt: string): Promise<LLMResponse> {
  console.log('🤖 Running LLM...');
  
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return {
        reply: text,
        preview: text.slice(0, 100) + (text.length > 100 ? '...' : '')
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      // Fallback to mock
    }
  }
  
  // Mock response when API unavailable
  await new Promise(resolve => setTimeout(resolve, 1500));
  return {
    reply: 'Sample LLM response for prompt: ' + prompt.slice(0, 50),
    preview: 'Sample preview'
  };
}

/**
 * TTS 실제 합성 (캐시 제외)
 */
async function actuallySynthesize(text: string, voice: string): Promise<TTSResult> {
  console.log(`🔊 Synthesizing TTS: "${text.slice(0, 30)}..." (${voice})`);
  
  // Google Cloud Text-to-Speech API 호출 (실제 구현)
  if (process.env.NODE_ENV === 'development') {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      url: `https://mock-tts.dasi-english.com/${Date.now()}.mp3`,
      duration: Math.floor(text.length / 10) + 1,
      voice: voice,
      text: text,
      createdAt: new Date().toISOString()
    };
  }
  
  // 실제 Google Cloud TTS API 호출
  try {
    // const textToSpeech = require('@google-cloud/text-to-speech');
    // const client = new textToSpeech.TextToSpeechClient();
    // const request = {
    //   input: { text: text },
    //   voice: { languageCode: voice === 'female' ? 'en-US' : 'en-GB', ssmlGender: voice === 'female' ? 'FEMALE' : 'MALE' },
    //   audioConfig: { audioEncoding: 'MP3' }
    // };
    // const [response] = await client.synthesizeSpeech(request);
    // const audioBase64 = response.audioContent.toString('base64');
    // return { url: `data:audio/mp3;base64,${audioBase64}`, duration: Math.floor(text.length / 10) + 1, voice, text, createdAt: new Date().toISOString() };
    
    throw new Error('Google Cloud TTS API 설정 필요');
  } catch (error) {
    console.error('TTS API 호출 실패:', error);
    throw new Error('음성 합성 실패');
  }
}

/**
 * TTS (Text-to-Speech) 처리 (캐시 포함)
 */
async function runTTS(text: string, voice: string): Promise<TTSResult> {
  // 캐시 확인
  const cached = await getCachedTTS(text, voice);
  if (cached) {
    console.log('🎯 TTS Cache Hit');
    return cached;
  }
  
  // 캐시 미스 시 실제 TTS 처리
  const fresh = await actuallySynthesize(text, voice);
  setCachedTTS(text, voice, fresh);
  return fresh;
}

/**
 * 사용자 발화 평가 및 피드백 생성
 */
export const evaluateSpeech = async (
  transcript: string, 
  targetPattern: string
): Promise<SpeechEvaluation> => {
  return llmQueue.add(async () => {
    console.log(`📊 Evaluating speech: "${transcript}" vs target: "${targetPattern}"`);

    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const prompt = `Given the target pattern "${targetPattern}" and the user's speech "${transcript}", evaluate the speech for grammatical errors, pronunciation issues, and naturalness. Return JSON with: {"majorError": boolean, "naturalScore": number (0-100), "correction": string}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const evaluation = JSON.parse(text);
        return evaluation;
      } catch (error) {
        console.error("Gemini API evaluation error:", error);
      }
    }

    // Fallback 더미 평가
    const dummyEvaluation: SpeechEvaluation = {
      majorError: transcript.toLowerCase().includes('error'),
      naturalScore: Math.floor(Math.random() * 40) + 60,
      correction: transcript.toLowerCase().includes('error') 
        ? transcript.replace(/error/gi, 'correction')
        : transcript,
    };

    return dummyEvaluation;
  });
};

/**
 * 전체 파이프라인 실행 (STT → LLM → TTS)
 */
export const fullPipeline = async ({
  audioBlob,
  voice,
  prompt
}: FullPipelineInput): Promise<FullPipelineResult> => {
  const text = await sttQueue.add(() => runSTT(audioBlob));
  const llm = await llmQueue.add(() => runLLM(prompt ?? text));
  const audio = await ttsQueue.add(() => runTTS(llm.reply, voice));
  
  return { text, llm, audio };
};

// Export functions
export {
  runSTT,
  runLLM,
  runTTS
};

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { db } = require("../config/firebase");
const { sttQueue, llmQueue, ttsQueue } = require('./taskQueue');

// TODO: 실제 Gemini API 키를 여기에 설정하세요.
// const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * 사용자의 발화를 평가하고 피드백을 제공합니다.
 * @param {string} transcript - STT를 통해 얻은 사용자의 발화 텍스트
 * @param {string} targetPattern - 사용자가 연습한 목표 패턴
 * @returns {Promise<object>} 평가 결과 (majorError, naturalScore, correction 등)
 */
// 아래 함수들은 기존 구현을 래핑만 한다는 가정
async function runSTT(audioBlob) { 
    // TODO: 실제 STT API 호출 로직
    console.log('Running STT...'); 
    await new Promise(resolve => setTimeout(resolve, 1000));
    return 'Sample transcription from audio';
}

async function runLLM(prompt) { 
    // TODO: 실제 LLM API 호출 로직
    console.log('Running LLM...'); 
    await new Promise(resolve => setTimeout(resolve, 1500));
    return { reply: 'Sample LLM response', preview: 'Sample preview' };
}

async function runTTS(text, voice) { 
    // TODO: 실제 TTS API 호출 로직
    console.log('Running TTS...'); 
    await new Promise(resolve => setTimeout(resolve, 800));
    return { url: 'https://example.com/audio.mp3' };
}

const evaluateSpeech = async (transcript, targetPattern) => {
    // 기존 로직 유지하되 llmQueue에 넣어 호출
    return llmQueue.add(async () => {
        console.log(`Evaluating speech: "${transcript}" with target pattern: "${targetPattern}"`);

        // Gemini API 호출 예시 (주석 처리됨)
        /*
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const prompt = `Given the target pattern "${targetPattern}" and the user's speech "${transcript}", evaluate the speech for grammatical errors, pronunciation issues, and naturalness. Provide a boolean 'majorError' (true if significant errors, false otherwise), a 'naturalScore' (0-100), and a 'correction' if necessary.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // TODO: Gemini API 응답을 파싱하여 evaluation 객체로 변환하는 로직 필요
        let evaluation = {};
        try {
            evaluation = JSON.parse(text);
        } catch (e) {
            console.error("Failed to parse Gemini API response:", text, e);
            evaluation = { majorError: true, naturalScore: 50, correction: "Could not evaluate." };
        }
        */

        // 더미 데이터
        const dummyEvaluation = {
            majorError: transcript.includes('error'),
            naturalScore: Math.floor(Math.random() * 40) + 60,
            correction: transcript.includes('error') ? transcript.replace('error', 'correction') : transcript,
        };

        return dummyEvaluation;
    });
};

const fullPipeline = async ({ audioBlob, voice, prompt }) => {
    const text = await sttQueue.add(() => runSTT(audioBlob));
    const llm = await llmQueue.add(() => runLLM(prompt ?? text));
    const audio = await ttsQueue.add(() => runTTS(llm.reply, voice));
    return { text, llm, audio };
};

module.exports = {
    evaluateSpeech,
    fullPipeline,
    runSTT,
    runLLM, 
    runTTS
};

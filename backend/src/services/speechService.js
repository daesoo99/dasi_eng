
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { db } = require("../config/firebase");

// TODO: 실제 Gemini API 키를 여기에 설정하세요.
// const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * 사용자의 발화를 평가하고 피드백을 제공합니다.
 * @param {string} transcript - STT를 통해 얻은 사용자의 발화 텍스트
 * @param {string} targetPattern - 사용자가 연습한 목표 패턴
 * @returns {Promise<object>} 평가 결과 (majorError, naturalScore, correction 등)
 */
const evaluateSpeech = async (transcript, targetPattern) => {
    // TODO: Gemini API를 사용하여 발화를 평가하는 실제 로직 구현
    // 현재는 더미 데이터를 반환합니다.
    console.log(`Evaluating speech: "${transcript}" with target pattern: "${targetPattern}"`);

    // Gemini API 호출 예시 (주석 처리됨)
    /*
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `Given the target pattern "${targetPattern}" and the user's speech "${transcript}", evaluate the speech for grammatical errors, pronunciation issues, and naturalness. Provide a boolean 'majorError' (true if significant errors, false otherwise), a 'naturalScore' (0-100), and a 'correction' if necessary.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // TODO: Gemini API 응답을 파싱하여 evaluation 객체로 변환하는 로직 필요
    // 예시: JSON 형식으로 응답을 요청하고 파싱
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
        majorError: transcript.includes('error'), // 'error' 단어가 포함되면 majorError true
        naturalScore: Math.floor(Math.random() * 40) + 60, // 60-99 사이의 랜덤 점수
        correction: transcript.includes('error') ? transcript.replace('error', 'correction') : transcript,
    };

    return dummyEvaluation;
};

module.exports = {
    evaluateSpeech,
};

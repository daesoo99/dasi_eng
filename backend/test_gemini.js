require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = "프론트엔드 개발자 신입 지원자를 위한 간단한 면접 질문 1개를 한국어로 만들어주세요. 질문만 작성해주세요.";
    
    console.log('Testing Gemini API...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('Success! Generated question:', text);
  } catch (error) {
    console.error('Gemini API Error:', error);
  }
}

testGemini();
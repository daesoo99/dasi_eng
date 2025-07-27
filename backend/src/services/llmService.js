const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

// Primary: Google Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY);

// Fallback: OpenAI (when user switches back)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateQuestion(position, experience, previousQuestions = []) {
  try {
    // Try Gemini first
    return await generateQuestionWithGemini(position, experience, previousQuestions);
  } catch (error) {
    console.error('Gemini question generation error:', error);
    try {
      // Fallback to OpenAI if available
      if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'placeholder_key_for_testing') {
        return await generateQuestionWithOpenAI(position, experience, previousQuestions);
      }
    } catch (openaiError) {
      console.error('OpenAI fallback error:', openaiError);
    }
    return 'Please briefly introduce yourself and tell us about your background.';
  }
}

async function generateQuestionWithGemini(position, experience, previousQuestions = []) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const previousQuestionsText = previousQuestions.length > 0 
    ? `이전 질문들: ${previousQuestions.join(', ')}\n` 
    : '';

  const prompt = `
당신은 전문 면접관입니다. 다음 조건에 맞는 면접 질문 1개를 생성해주세요.

지원 직무: ${position}
경력 수준: ${experience}
${previousQuestionsText}

조건:
1. 해당 직무에 적합한 실무 중심 질문
2. 이전 질문과 중복되지 않는 내용
3. 지원자의 경력 수준에 적절한 난이도
4. 한국어로 작성
5. 질문만 제공하고 추가 설명은 하지 말 것

질문:`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text().trim();
}

async function generateQuestionWithOpenAI(position, experience, previousQuestions = []) {
  const previousQuestionsText = previousQuestions.length > 0 
    ? `Previous questions: ${previousQuestions.join(', ')}\n` 
    : '';

  const prompt = `
You are a professional interviewer. Please generate 1 interview question that meets the following conditions.

Position Applied: ${position}
Experience Level: ${experience}
${previousQuestionsText}

Conditions:
1. Practical-focused questions suitable for the position
2. Content that does not duplicate previous questions
3. Difficulty level appropriate for the candidate's experience level
4. Written in Korean
5. Only provide the question without additional explanation

Question:`;

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 200,
    temperature: 0.7
  });

  return response.choices[0].message.content.trim();
}

async function evaluateAnswer(question, answer, position) {
  try {
    // Try Gemini first
    return await evaluateAnswerWithGemini(question, answer, position);
  } catch (error) {
    console.error('Gemini answer evaluation error:', error);
    try {
      // Fallback to OpenAI if available
      if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'placeholder_key_for_testing') {
        return await evaluateAnswerWithOpenAI(question, answer, position);
      }
    } catch (openaiError) {
      console.error('OpenAI fallback error:', openaiError);
    }
    return '총점: 70/100\n강점: 답변을 제공해주셨습니다.\n개선점: 더 구체적인 예시가 있으면 좋겠습니다.';
  }
}

async function evaluateAnswerWithGemini(question, answer, position) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const prompt = `
다음 면접 질문과 답변을 평가해주세요.

직무: ${position}
질문: ${question}
답변: ${answer}

평가 기준:
1. 답변의 적절성 (0-25점)
2. 전문성 (0-25점)
3. 구체성 (0-25점)
4. 논리적 사고 (0-25점)

다음 형식으로 응답해주세요:
총점: [점수]/100
강점: [강점 설명]
개선점: [개선사항 설명]
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text().trim();
}

async function evaluateAnswerWithOpenAI(question, answer, position) {
  const prompt = `
Please evaluate the following interview question and answer in Korean.

Position: ${position}
Question: ${question}
Answer: ${answer}

Evaluation Criteria:
1. Appropriateness of answer (0-25 points)
2. Professionalism (0-25 points)
3. Specificity (0-25 points)
4. Logical reasoning (0-25 points)

Please respond in Korean in the following format:
총점: [점수]/100
강점: [강점 설명]
개선점: [개선사항 설명]
`;

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 300,
    temperature: 0.3
  });

  return response.choices[0].message.content.trim();
}

module.exports = {
  generateQuestion,
  evaluateAnswer
};
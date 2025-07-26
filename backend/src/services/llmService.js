const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateQuestion(position, experience, previousQuestions = []) {
  try {
    const previousQuestionsText = previousQuestions.length > 0 
      ? `이전 질문들: ${previousQuestions.join(', ')}\n` 
      : '';

    const prompt = `
당신은 전문 면접관입니다. 다음 조건에 맞는 면접 질문을 1개 생성해주세요.

지원 직무: ${position}
경력: ${experience}
${previousQuestionsText}

조건:
1. 해당 직무에 적합한 실무 중심의 질문
2. 이전 질문과 중복되지 않는 내용
3. 지원자의 경력 수준에 맞는 난이도
4. 한국어로 작성
5. 질문만 답변하고 부연설명은 하지 마세요

질문:`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      temperature: 0.7
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('LLM 질문 생성 오류:', error);
    return '자기소개를 간단히 해주세요.';
  }
}

async function evaluateAnswer(question, answer, position) {
  try {
    const prompt = `
다음 면접 질문과 답변을 평가해주세요.

직무: ${position}
질문: ${question}
답변: ${answer}

평가 기준:
1. 답변의 적절성 (0-25점)
2. 전문성 (0-25점)
3. 구체성 (0-25점)
4. 논리성 (0-25점)

다음 형식으로 답변해주세요:
총점: [점수]/100
강점: [강점 설명]
개선점: [개선점 설명]
`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.3
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('LLM 답변 평가 오류:', error);
    return '총점: 70/100\n강점: 답변을 제공해주셨습니다.\n개선점: 더 구체적인 예시를 들어주시면 좋겠습니다.';
  }
}

module.exports = {
  generateQuestion,
  evaluateAnswer
};
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateQuestion(position, experience, previousQuestions = []) {
  try {
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
4. Written in English
5. Only provide the question without additional explanation

Question:`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      temperature: 0.7
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('LLM question generation error:', error);
    return 'Please briefly introduce yourself.';
  }
}

async function evaluateAnswer(question, answer, position) {
  try {
    const prompt = `
Please evaluate the following interview question and answer.

Position: ${position}
Question: ${question}
Answer: ${answer}

Evaluation Criteria:
1. Appropriateness of answer (0-25 points)
2. Professionalism (0-25 points)
3. Specificity (0-25 points)
4. Logical reasoning (0-25 points)

Please respond in the following format:
Total Score: [score]/100
Strengths: [description of strengths]
Areas for Improvement: [description of improvements]
`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.3
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('LLM answer evaluation error:', error);
    return 'Total Score: 70/100\nStrengths: You provided an answer.\nAreas for Improvement: More specific examples would be helpful.';
  }
}

module.exports = {
  generateQuestion,
  evaluateAnswer
};
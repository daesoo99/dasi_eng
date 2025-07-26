const express = require('express');
const router = express.Router();
const { generateQuestion, evaluateAnswer } = require('../services/llmService');

router.post('/start', async (req, res) => {
  try {
    const { position, experience } = req.body;
    
    const interviewId = `interview_${Date.now()}`;
    const firstQuestion = await generateQuestion(position, experience, []);
    
    res.json({
      interviewId,
      question: firstQuestion,
      status: 'started'
    });
  } catch (error) {
    console.error('면접 시작 오류:', error);
    res.status(500).json({ error: '면접을 시작할 수 없습니다' });
  }
});

router.post('/question', async (req, res) => {
  try {
    const { interviewId, position, experience, previousQuestions } = req.body;
    
    const nextQuestion = await generateQuestion(position, experience, previousQuestions);
    
    res.json({
      question: nextQuestion,
      status: 'continue'
    });
  } catch (error) {
    console.error('질문 생성 오류:', error);
    res.status(500).json({ error: '질문을 생성할 수 없습니다' });
  }
});

router.post('/evaluate', async (req, res) => {
  try {
    const { question, answer, position } = req.body;
    
    const evaluation = await evaluateAnswer(question, answer, position);
    
    res.json({
      evaluation,
      status: 'evaluated'
    });
  } catch (error) {
    console.error('답변 평가 오류:', error);
    res.status(500).json({ error: '답변을 평가할 수 없습니다' });
  }
});

router.post('/end', async (req, res) => {
  try {
    const { interviewId, totalScore, feedback } = req.body;
    
    res.json({
      message: '면접이 완료되었습니다',
      totalScore,
      feedback,
      status: 'completed'
    });
  } catch (error) {
    console.error('면접 종료 오류:', error);
    res.status(500).json({ error: '면접을 종료할 수 없습니다' });
  }
});

module.exports = router;
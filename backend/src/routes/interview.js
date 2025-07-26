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
    console.error('Interview start error:', error);
    res.status(500).json({ error: 'Cannot start interview' });
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
    console.error('Question generation error:', error);
    res.status(500).json({ error: 'Cannot generate question' });
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
    console.error('Answer evaluation error:', error);
    res.status(500).json({ error: 'Cannot evaluate answer' });
  }
});

router.post('/end', async (req, res) => {
  try {
    const { interviewId, totalScore, feedback } = req.body;
    
    res.json({
      message: 'Interview completed',
      totalScore,
      feedback,
      status: 'completed'
    });
  } catch (error) {
    console.error('Interview end error:', error);
    res.status(500).json({ error: 'Cannot end interview' });
  }
});

module.exports = router;
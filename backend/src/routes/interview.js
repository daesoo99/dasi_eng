const express = require('express');
const router = express.Router();
const interviewService = require('../services/interviewService');

// POST /api/interview/start - 면접 시작
router.post('/start', async (req, res) => {
  try {
    const result = await interviewService.startInterview(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now()
    });
  }
});

// POST /api/interview/question - 다음 질문 생성
router.post('/question', async (req, res) => {
  try {
    const { interviewId, position } = req.body;
    const result = await interviewService.getNextQuestion(interviewId, position);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now()
    });
  }
});

// POST /api/interview/evaluate - 답변 평가
router.post('/evaluate', async (req, res) => {
  try {
    const result = await interviewService.evaluateAnswer(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now()
    });
  }
});

// POST /api/interview/:id/end - 면접 종료
router.post('/:id/end', async (req, res) => {
  try {
    const interviewId = req.params.id;
    const result = await interviewService.endInterview(interviewId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now()
    });
  }
});

// GET /api/interview/:id - 세션 조회
router.get('/:id', async (req, res) => {
  try {
    const interviewId = req.params.id;
    const result = await interviewService.getSession(interviewId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now()
    });
  }
});

// GET /api/interview/stats - 통계 정보
router.get('/stats', async (req, res) => {
  try {
    const result = await interviewService.getStatistics();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now()
    });
  }
});

module.exports = router;
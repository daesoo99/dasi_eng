const express = require('express');
const multer = require('multer');
const router = express.Router();
const { speechToText } = require('../services/sttService');
const { textToSpeech } = require('../services/ttsService');

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/stt', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '오디오 파일이 필요합니다' });
    }

    const transcription = await speechToText(req.file.buffer);
    
    res.json({
      text: transcription,
      status: 'success'
    });
  } catch (error) {
    console.error('STT 오류:', error);
    res.status(500).json({ error: '음성을 텍스트로 변환할 수 없습니다' });
  }
});

router.post('/tts', async (req, res) => {
  try {
    const { text, language = 'ko-KR' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: '텍스트가 필요합니다' });
    }

    const audioBuffer = await textToSpeech(text, language);
    
    res.set({
      'Content-Type': 'audio/mp3',
      'Content-Length': audioBuffer.length
    });
    
    res.send(audioBuffer);
  } catch (error) {
    console.error('TTS 오류:', error);
    res.status(500).json({ error: '텍스트를 음성으로 변환할 수 없습니다' });
  }
});

module.exports = router;
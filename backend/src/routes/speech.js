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
      return res.status(400).json({ error: 'Audio file is required' });
    }

    const transcription = await speechToText(req.file.buffer);
    
    res.json({
      text: transcription,
      status: 'success'
    });
  } catch (error) {
    console.error('STT error:', error);
    res.status(500).json({ error: 'Cannot convert speech to text' });
  }
});

router.post('/tts', async (req, res) => {
  try {
    const { text, language = 'ko-KR' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const audioBuffer = await textToSpeech(text, language);
    
    res.set({
      'Content-Type': 'audio/mp3',
      'Content-Length': audioBuffer.length
    });
    
    res.send(audioBuffer);
  } catch (error) {
    console.error('TTS error:', error);
    res.status(500).json({ error: 'Cannot convert text to speech' });
  }
});

module.exports = router;
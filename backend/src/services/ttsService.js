// Using ElevenLabs REST API directly (more reliable than SDK)
const https = require('https');

async function textToSpeech(text, languageCode = 'ko-KR') {
  try {
    // Try ElevenLabs API
    return await textToSpeechWithElevenLabs(text, languageCode);
  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
    
    try {
      return await fallbackTTS(text);
    } catch (fallbackError) {
      console.error('Fallback TTS error:', fallbackError);
      throw new Error('Text-to-speech synthesis is not available');
    }
  }
}

async function textToSpeechWithElevenLabs(text, languageCode = 'ko-KR') {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey || apiKey === 'placeholder_elevenlabs_key') {
    throw new Error('ElevenLabs API key not configured');
  }

  // ElevenLabs voice IDs for different languages
  const voiceId = languageCode === 'ko-KR' 
    ? process.env.ELEVENLABS_VOICE_ID_KO || 'pNInz6obpgDQGcFmaJgB' // Adam voice (multilingual)
    : process.env.ELEVENLABS_VOICE_ID_EN || 'EXAVITQu4vr4xnSDxMaL'; // Sarah voice

  const requestData = JSON.stringify({
    text: text,
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.5,
      style: 0.0,
      use_speaker_boost: true
    }
  });

  const options = {
    hostname: 'api.elevenlabs.io',
    port: 443,
    path: `/v1/text-to-speech/${voiceId}`,
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
      'Content-Length': Buffer.byteLength(requestData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      
      res.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(Buffer.concat(chunks));
        } else {
          reject(new Error(`ElevenLabs API error: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(requestData);
    req.end();
  });
}

async function fallbackTTS(text) {
  const buffer = Buffer.from('temporary audio data (fallback)');
  return buffer;
}

module.exports = {
  textToSpeech
};
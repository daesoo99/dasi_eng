const { ElevenLabsAPI } = require('elevenlabs');

const elevenlabs = new ElevenLabsAPI({
  apiKey: process.env.ELEVENLABS_API_KEY
});

async function textToSpeech(text, languageCode = 'ko-KR') {
  try {
    // ElevenLabs voice IDs for different languages
    const voiceId = languageCode === 'ko-KR' 
      ? process.env.ELEVENLABS_VOICE_ID_KO || 'pNInz6obpgDQGcFmaJgB' // Adam voice (multilingual)
      : process.env.ELEVENLABS_VOICE_ID_EN || 'EXAVITQu4vr4xnSDxMaL'; // Sarah voice

    const audioStream = await elevenlabs.generate({
      voice: voiceId,
      text: text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5,
        style: 0.0,
        use_speaker_boost: true
      }
    });

    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    
    return Buffer.concat(chunks);
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

async function fallbackTTS(text) {
  const buffer = Buffer.from('temporary audio data (fallback)');
  return buffer;
}

module.exports = {
  textToSpeech
};
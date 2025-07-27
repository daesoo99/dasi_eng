// Simple TTS implementation - client-side Web Speech API will be used
// This service returns metadata for the frontend to handle TTS

async function textToSpeech(text, languageCode = 'ko-KR') {
  try {
    // For MVP: Return TTS instruction for client-side processing
    const ttsData = {
      text: text,
      language: languageCode,
      voice: languageCode === 'ko-KR' ? 'ko-KR' : 'en-US',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      useClientSideTTS: true
    };
    
    console.log(`TTS request: "${text}" in ${languageCode}`);
    
    // Return JSON instruction instead of audio buffer
    return JSON.stringify(ttsData);
  } catch (error) {
    console.error('TTS service error:', error);
    
    // Return fallback instruction
    return JSON.stringify({
      text: text,
      language: languageCode,
      useClientSideTTS: true,
      fallback: true
    });
  }
}

// Future: Add server-side TTS services here
async function textToSpeechWithElevenLabs(text, languageCode = 'ko-KR') {
  // ElevenLabs implementation (when API key is available)
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey || apiKey === 'placeholder_elevenlabs_key') {
    throw new Error('ElevenLabs API key not configured');
  }
  
  // Implementation here when needed
  throw new Error('ElevenLabs not configured for this MVP version');
}

async function textToSpeechWithGoogle(text, languageCode = 'ko-KR') {
  // Google TTS implementation (future enhancement)
  throw new Error('Google TTS not configured for this MVP version');
}

module.exports = {
  textToSpeech
};
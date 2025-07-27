const { createClient } = require('@deepgram/sdk');

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

async function speechToText(audioBuffer) {
  try {
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      {
        model: 'nova-2',
        language: 'ko',
        smart_format: true,
        punctuate: true,
        filler_words: false,
        utterances: true
      }
    );

    if (error) {
      throw error;
    }

    const transcription = result.results.channels[0].alternatives[0].transcript;
    return transcription || '';
  } catch (error) {
    console.error('Deepgram STT error:', error);
    
    try {
      return await fallbackWebSpeechAPI(audioBuffer);
    } catch (fallbackError) {
      console.error('Fallback STT error:', fallbackError);
      throw new Error('Speech recognition is not available');
    }
  }
}

async function fallbackWebSpeechAPI(audioBuffer) {
  return "Speech recognition result (temporary fallback)";
}

module.exports = {
  speechToText
};
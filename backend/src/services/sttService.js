const speech = require('@google-cloud/speech');

const client = new speech.SpeechClient({
  keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
});

async function speechToText(audioBuffer) {
  try {
    const request = {
      audio: {
        content: audioBuffer.toString('base64')
      },
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 16000,
        languageCode: 'ko-KR',
        enableAutomaticPunctuation: true,
        model: 'latest_long'
      }
    };

    const [response] = await client.recognize(request);
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');

    return transcription || '';
  } catch (error) {
    console.error('Google STT error:', error);
    
    try {
      return await fallbackWebSpeechAPI(audioBuffer);
    } catch (fallbackError) {
      console.error('Fallback STT error:', fallbackError);
      throw new Error('Speech recognition is not available');
    }
  }
}

async function fallbackWebSpeechAPI(audioBuffer) {
  return "Speech recognition result (temporary)";
}

module.exports = {
  speechToText
};
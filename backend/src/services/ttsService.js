const textToSpeech = require('@google-cloud/text-to-speech');

const client = new textToSpeech.TextToSpeechClient({
  keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
});

async function textToSpeech(text, languageCode = 'ko-KR') {
  try {
    const request = {
      input: { text: text },
      voice: {
        languageCode: languageCode,
        name: languageCode === 'ko-KR' ? 'ko-KR-Wavenet-A' : 'en-US-Wavenet-D',
        ssmlGender: 'NEUTRAL'
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.0,
        pitch: 0.0,
        volumeGainDb: 0.0
      }
    };

    const [response] = await client.synthesizeSpeech(request);
    return response.audioContent;
  } catch (error) {
    console.error('Google TTS 오류:', error);
    
    try {
      return await fallbackTTS(text);
    } catch (fallbackError) {
      console.error('Fallback TTS 오류:', fallbackError);
      throw new Error('음성 합성을 할 수 없습니다');
    }
  }
}

async function fallbackTTS(text) {
  const buffer = Buffer.from('임시 오디오 데이터');
  return buffer;
}

module.exports = {
  textToSpeech
};
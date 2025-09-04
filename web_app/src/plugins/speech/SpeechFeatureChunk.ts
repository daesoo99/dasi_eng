/**
 * Speech Feature Chunk - 스피치 관련 플러그인들의 집합
 * @description 스피치 기능 관련 플러그인들을 하나의 청크로 묶어서 제공
 */

import { SimpleSpeechPlugin } from '../simple/SimpleSpeechPlugin';
import { AdvancedSpeechPlugin } from '../simple/AdvancedSpeechPlugin';

// Feature chunk exports
export { SimpleSpeechPlugin };
export { AdvancedSpeechPlugin };

// Feature chunk loader
export async function loadSpeechFeatureChunk() {
  return {
    SimpleSpeechPlugin,
    AdvancedSpeechPlugin
  };
}

export default {
  SimpleSpeechPlugin,
  AdvancedSpeechPlugin,
  loadSpeechFeatureChunk
};
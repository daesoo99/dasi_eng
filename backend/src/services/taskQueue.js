const PQueue = require('p-queue').default;

// 동시 2, 초당 5건 속도 제한(예시). 필요시 조정.
const sttQueue  = new PQueue({ concurrency: 2, intervalCap: 5, interval: 1000 });
const llmQueue  = new PQueue({ concurrency: 2, intervalCap: 5, interval: 1000 });
const ttsQueue  = new PQueue({ concurrency: 2, intervalCap: 5, interval: 1000 });

module.exports = { sttQueue, llmQueue, ttsQueue };
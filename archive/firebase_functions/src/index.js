const functions = require("firebase-functions");

// Simple health check
exports.health = functions.https.onRequest((req, res) => {
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

// Simple feedback endpoint (rule-based, no AI)
exports.feedback = functions.https.onRequest((req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const { sttText, target_en } = req.body;
  
  if (!sttText || !target_en) {
    res.status(400).json({ error: "Missing required fields", success: false });
    return;
  }

  // Simple scoring based on similarity
  const userWords = sttText.toLowerCase().trim().split(/\s+/);
  const targetWords = target_en.toLowerCase().trim().split(/\s+/);
  
  const commonWords = userWords.filter(word => targetWords.includes(word));
  const score = Math.round((commonWords.length / Math.max(targetWords.length, 1)) * 100);
  const correct = score >= 80;

  // Simple feedback messages
  let feedback_ko, hint_ko;
  if (score >= 90) {
    feedback_ko = "완벽해요! 🌟";
    hint_ko = "훌륭한 발음이에요!";
  } else if (score >= 75) {
    feedback_ko = "잘했어요! 👍";
    hint_ko = "조금만 더 명확하게 발음해보세요.";
  } else if (score >= 50) {
    feedback_ko = "괜찮아요! 💪";
    hint_ko = "천천히 다시 한번 시도해보세요.";
  } else {
    feedback_ko = "다시 한번! 🎯";
    hint_ko = "정답을 듣고 따라해보세요.";
  }

  res.json({
    correct,
    score,
    sttText: sttText.trim(),
    target_en,
    correction: target_en,
    feedback_ko,
    hint_ko,
    success: true
  });
});

// Cards endpoint
exports.cards = functions.https.onRequest((req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const level = req.query.level || "1";
  const stage = req.query.stage || "1";

  // Sample cards data
  const sampleCards = [
    { id: "1-1-1", level: 1, stage: 1, front_ko: "사과", target_en: "apple", difficulty: 1 },
    { id: "1-1-2", level: 1, stage: 1, front_ko: "물", target_en: "water", difficulty: 1 },
    { id: "1-1-3", level: 1, stage: 1, front_ko: "책", target_en: "book", difficulty: 1 },
    { id: "1-1-4", level: 1, stage: 1, front_ko: "집", target_en: "house", difficulty: 1 },
    { id: "1-1-5", level: 1, stage: 1, front_ko: "차", target_en: "car", difficulty: 1 }
  ];

  res.json({
    level: parseInt(level),
    stage: parseInt(stage),
    cards: sampleCards,
    totalCards: sampleCards.length,
    success: true
  });
});

// Simple session endpoints
exports.sessionStart = functions.https.onRequest((req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const sessionId = 'session-' + Date.now();
  res.json({
    sessionId,
    message: 'Session started successfully',
    success: true
  });
});

exports.sessionSubmit = functions.https.onRequest((req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  res.json({
    message: 'Answer submitted successfully',
    progress: { completed: 1, total: 5, currentCardIndex: 1 },
    success: true
  });
});

exports.sessionFinish = functions.https.onRequest((req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  res.json({
    message: 'Session completed successfully',
    summary: {
      totalCards: 5,
      correctAnswers: 4,
      accuracy: 80,
      averageScore: 75,
      totalTime: 120,
      averageTimePerCard: 24
    },
    success: true
  });
});
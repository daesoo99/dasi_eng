"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.feedback = void 0;
const functions = __importStar(require("firebase-functions"));
const zod_1 = require("zod");
const js_levenshtein_1 = __importDefault(require("js-levenshtein"));
const RequestSchema = zod_1.z.object({
    front_ko: zod_1.z.string(),
    sttText: zod_1.z.string().min(1),
    target_en: zod_1.z.string().min(1),
});
// Rule-based feedback system
const FEEDBACK_MESSAGES = {
    excellent: {
        feedback_ko: "완벽해요! 🌟",
        hint_ko: "훌륭한 발음이에요!"
    },
    good: {
        feedback_ko: "잘했어요! 👍",
        hint_ko: "조금만 더 명확하게 발음해보세요."
    },
    okay: {
        feedback_ko: "괜찮아요! 💪",
        hint_ko: "천천히 다시 한번 시도해보세요."
    },
    needsWork: {
        feedback_ko: "다시 한번! 🎯",
        hint_ko: "정답을 듣고 따라해보세요."
    }
};
// Pattern-based hints for common mistakes
const PATTERN_HINTS = {
    // Be verbs
    "am": "am은 'I'와 함께 써요. 'I am'",
    "is": "is는 'he, she, it'과 함께 써요. 'He is'",
    "are": "are는 'you, we, they'와 함께 써요. 'You are'",
    // Common verbs
    "like": "like 뒤에는 명사나 동명사(-ing)가 와요",
    "want": "want to + 동사원형으로 써요. 'I want to go'",
    "have": "have는 '가지고 있다'는 뜻이에요",
    "go": "go는 '가다'는 뜻이에요. go to school",
    // Past tense markers
    "yesterday": "yesterday가 있으면 과거형을 써요",
    "last": "last week/month는 과거형 시간이에요",
    "ago": "ago가 있으면 과거형을 써요",
    // Articles
    "a": "'a'는 자음으로 시작하는 단어 앞에 써요",
    "an": "'an'은 모음으로 시작하는 단어 앞에 써요",
    "the": "'the'는 특정한 것을 가리킬 때 써요"
};
function calculateScore(target, guess) {
    const targetWords = target.toLowerCase().trim().split(/\s+/);
    const guessWords = guess.toLowerCase().trim().split(/\s+/);
    const targetText = targetWords.join(" ");
    const guessText = guessWords.join(" ");
    // Calculate similarity using Levenshtein distance
    const distance = (0, js_levenshtein_1.default)(targetText, guessText);
    const maxLength = Math.max(targetText.length, guessText.length, 1);
    const similarity = 1 - (distance / maxLength);
    // Also consider word-level matching
    const commonWords = targetWords.filter(word => guessWords.includes(word));
    const wordScore = commonWords.length / Math.max(targetWords.length, 1);
    // Combine character and word level scores
    const finalScore = (similarity * 0.7) + (wordScore * 0.3);
    return Math.round(Math.max(0, Math.min(100, finalScore * 100)));
}
function generateFeedback(target, guess, score) {
    const targetWords = target.toLowerCase().split(/\s+/);
    const guessWords = guess.toLowerCase().split(/\s+/);
    // Determine feedback level based on score
    let feedbackLevel;
    if (score >= 90)
        feedbackLevel = 'excellent';
    else if (score >= 75)
        feedbackLevel = 'good';
    else if (score >= 50)
        feedbackLevel = 'okay';
    else
        feedbackLevel = 'needsWork';
    const baseFeedback = FEEDBACK_MESSAGES[feedbackLevel];
    // Generate specific hint based on common patterns
    let specificHint = baseFeedback.hint_ko;
    // Check for pattern-specific hints
    for (const word of targetWords) {
        if (word in PATTERN_HINTS && !guessWords.includes(word)) {
            specificHint = PATTERN_HINTS[word];
            break;
        }
    }
    // Generate natural correction
    const correction = target;
    return {
        correction,
        feedback_ko: baseFeedback.feedback_ko,
        hint_ko: specificHint
    };
}
exports.feedback = functions.https.onRequest(async (req, res) => {
    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    try {
        const { sttText, target_en } = RequestSchema.parse(req.body);
        const score = calculateScore(target_en, sttText);
        const correct = score >= 80; // 80% threshold for passing
        const feedback = generateFeedback(target_en, sttText, score);
        res.json(Object.assign(Object.assign({ correct,
            score, sttText: sttText.trim(), target_en }, feedback), { success: true }));
    }
    catch (error) {
        console.error('Feedback Error:', error);
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({
                error: "Invalid request format",
                details: error.errors,
                success: false
            });
            return;
        }
        res.status(500).json({
            error: error.message,
            success: false
        });
    }
});
//# sourceMappingURL=feedback.js.map
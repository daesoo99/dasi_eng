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
Object.defineProperty(exports, "__esModule", { value: true });
exports.cards = void 0;
const functions = __importStar(require("firebase-functions"));
const zod_1 = require("zod");
const QuerySchema = zod_1.z.object({
    level: zod_1.z.string().optional().default("1"),
    stage: zod_1.z.string().optional().default("1"),
});
// Sample card data - in production, this would come from Firestore
const SAMPLE_CARDS = {
    "1": {
        "1": [
            { id: "1-1-1", front_ko: "사과", target_en: "apple", difficulty: 1 },
            { id: "1-1-2", front_ko: "물", target_en: "water", difficulty: 1 },
            { id: "1-1-3", front_ko: "책", target_en: "book", difficulty: 1 },
            { id: "1-1-4", front_ko: "집", target_en: "house", difficulty: 1 },
            { id: "1-1-5", front_ko: "차", target_en: "car", difficulty: 1 }
        ],
        "2": [
            { id: "1-2-1", front_ko: "큰 사과", target_en: "big apple", difficulty: 2 },
            { id: "1-2-2", front_ko: "차가운 물", target_en: "cold water", difficulty: 2 },
            { id: "1-2-3", front_ko: "새 책", target_en: "new book", difficulty: 2 },
            { id: "1-2-4", front_ko: "작은 집", target_en: "small house", difficulty: 2 },
            { id: "1-2-5", front_ko: "빨간 차", target_en: "red car", difficulty: 2 }
        ]
    },
    "2": {
        "1": [
            { id: "2-1-1", front_ko: "나는 사과를 좋아해요", target_en: "I like apples", difficulty: 3 },
            { id: "2-1-2", front_ko: "물을 마시고 싶어요", target_en: "I want to drink water", difficulty: 3 },
            { id: "2-1-3", front_ko: "책을 읽고 있어요", target_en: "I am reading a book", difficulty: 3 },
            { id: "2-1-4", front_ko: "집에 가고 싶어요", target_en: "I want to go home", difficulty: 3 },
            { id: "2-1-5", front_ko: "차를 운전할 수 있어요", target_en: "I can drive a car", difficulty: 3 }
        ],
        "2": [
            { id: "2-2-1", front_ko: "어제 사과를 먹었어요", target_en: "I ate an apple yesterday", difficulty: 4 },
            { id: "2-2-2", front_ko: "물이 너무 차가워요", target_en: "The water is too cold", difficulty: 4 },
            { id: "2-2-3", front_ko: "이 책은 재미있어요", target_en: "This book is interesting", difficulty: 4 },
            { id: "2-2-4", front_ko: "우리 집은 크고 아름다워요", target_en: "Our house is big and beautiful", difficulty: 4 },
            { id: "2-2-5", front_ko: "새 차를 사고 싶어요", target_en: "I want to buy a new car", difficulty: 4 }
        ]
    }
};
exports.cards = functions.https.onRequest(async (req, res) => {
    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    try {
        const { level, stage } = QuerySchema.parse(req.query);
        // Get cards for the specified level and stage
        const levelCards = SAMPLE_CARDS[level];
        if (!levelCards) {
            res.status(404).json({
                error: `Level ${level} not found`,
                success: false
            });
            return;
        }
        const stageCards = levelCards[stage];
        if (!stageCards) {
            res.status(404).json({
                error: `Stage ${stage} not found in level ${level}`,
                success: false
            });
            return;
        }
        res.json({
            level: parseInt(level),
            stage: parseInt(stage),
            cards: stageCards,
            totalCards: stageCards.length,
            success: true
        });
    }
    catch (error) {
        console.error('Cards Error:', error);
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({
                error: "Invalid query parameters",
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
//# sourceMappingURL=cards.js.map
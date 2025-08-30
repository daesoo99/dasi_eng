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
exports.sessionFinish = exports.sessionSubmit = exports.sessionStart = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const zod_1 = require("zod");
// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
// Validation schemas
const SessionStartSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1),
    level: zod_1.z.number().min(1).max(10),
    stage: zod_1.z.number().min(1),
    cardIds: zod_1.z.array(zod_1.z.string()),
});
const SessionSubmitSchema = zod_1.z.object({
    sessionId: zod_1.z.string().min(1),
    cardId: zod_1.z.string().min(1),
    userAnswer: zod_1.z.string(),
    isCorrect: zod_1.z.boolean(),
    score: zod_1.z.number().min(0).max(100),
    timeSpent: zod_1.z.number().min(0), // seconds
});
const SessionFinishSchema = zod_1.z.object({
    sessionId: zod_1.z.string().min(1),
});
exports.sessionStart = functions.https.onRequest(async (req, res) => {
    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    try {
        const { userId, level, stage, cardIds } = SessionStartSchema.parse(req.body);
        const sessionData = {
            userId,
            level,
            stage,
            cardIds,
            startTime: admin.firestore.FieldValue.serverTimestamp(),
            status: 'active',
            progress: {
                completed: 0,
                total: cardIds.length,
                currentCardIndex: 0
            },
            results: []
        };
        const sessionRef = await db.collection('sessions').add(sessionData);
        return res.json({
            sessionId: sessionRef.id,
            message: 'Session started successfully',
            success: true
        });
    }
    catch (error) {
        console.error('Session Start Error:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: "Invalid request format",
                details: error.errors,
                success: false
            });
        }
        return res.status(500).json({
            error: error.message,
            success: false
        });
    }
});
exports.sessionSubmit = functions.https.onRequest(async (req, res) => {
    var _a, _b, _c;
    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    try {
        const { sessionId, cardId, userAnswer, isCorrect, score, timeSpent } = SessionSubmitSchema.parse(req.body);
        const sessionRef = db.collection('sessions').doc(sessionId);
        const sessionDoc = await sessionRef.get();
        if (!sessionDoc.exists) {
            return res.status(404).json({
                error: 'Session not found',
                success: false
            });
        }
        const sessionData = sessionDoc.data();
        if ((sessionData === null || sessionData === void 0 ? void 0 : sessionData.status) !== 'active') {
            return res.status(400).json({
                error: 'Session is not active',
                success: false
            });
        }
        // Add result to session
        const result = {
            cardId,
            userAnswer,
            isCorrect,
            score,
            timeSpent,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        };
        const newProgress = {
            completed: (((_a = sessionData.progress) === null || _a === void 0 ? void 0 : _a.completed) || 0) + 1,
            total: ((_b = sessionData.progress) === null || _b === void 0 ? void 0 : _b.total) || 0,
            currentCardIndex: (((_c = sessionData.progress) === null || _c === void 0 ? void 0 : _c.currentCardIndex) || 0) + 1
        };
        await sessionRef.update({
            results: admin.firestore.FieldValue.arrayUnion(result),
            progress: newProgress,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });
        return res.json({
            message: 'Answer submitted successfully',
            progress: newProgress,
            success: true
        });
    }
    catch (error) {
        console.error('Session Submit Error:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: "Invalid request format",
                details: error.errors,
                success: false
            });
        }
        return res.status(500).json({
            error: error.message,
            success: false
        });
    }
});
exports.sessionFinish = functions.https.onRequest(async (req, res) => {
    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    try {
        const { sessionId } = SessionFinishSchema.parse(req.body);
        const sessionRef = db.collection('sessions').doc(sessionId);
        const sessionDoc = await sessionRef.get();
        if (!sessionDoc.exists) {
            return res.status(404).json({
                error: 'Session not found',
                success: false
            });
        }
        const sessionData = sessionDoc.data();
        if ((sessionData === null || sessionData === void 0 ? void 0 : sessionData.status) !== 'active') {
            return res.status(400).json({
                error: 'Session is not active',
                success: false
            });
        }
        // Calculate session statistics
        const results = sessionData.results || [];
        const totalCards = results.length;
        const correctAnswers = results.filter((r) => r.isCorrect).length;
        const totalScore = results.reduce((sum, r) => sum + r.score, 0);
        const averageScore = totalCards > 0 ? Math.round(totalScore / totalCards) : 0;
        const totalTime = results.reduce((sum, r) => sum + r.timeSpent, 0);
        const sessionSummary = {
            totalCards,
            correctAnswers,
            accuracy: totalCards > 0 ? Math.round((correctAnswers / totalCards) * 100) : 0,
            averageScore,
            totalTime,
            averageTimePerCard: totalCards > 0 ? Math.round(totalTime / totalCards) : 0
        };
        await sessionRef.update({
            status: 'completed',
            endTime: admin.firestore.FieldValue.serverTimestamp(),
            summary: sessionSummary
        });
        return res.json({
            message: 'Session completed successfully',
            summary: sessionSummary,
            success: true
        });
    }
    catch (error) {
        console.error('Session Finish Error:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: "Invalid request format",
                details: error.errors,
                success: false
            });
        }
        return res.status(500).json({
            error: error.message,
            success: false
        });
    }
});
//# sourceMappingURL=session.js.map
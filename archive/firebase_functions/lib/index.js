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
exports.health = exports.sessionFinish = exports.sessionSubmit = exports.sessionStart = exports.cards = exports.feedback = exports.stt = void 0;
const functions = __importStar(require("firebase-functions"));
// Import endpoints
var stt_1 = require("./stt");
Object.defineProperty(exports, "stt", { enumerable: true, get: function () { return stt_1.stt; } });
var feedback_1 = require("./feedback");
Object.defineProperty(exports, "feedback", { enumerable: true, get: function () { return feedback_1.feedback; } });
var cards_1 = require("./cards");
Object.defineProperty(exports, "cards", { enumerable: true, get: function () { return cards_1.cards; } });
var session_1 = require("./session");
Object.defineProperty(exports, "sessionStart", { enumerable: true, get: function () { return session_1.sessionStart; } });
Object.defineProperty(exports, "sessionSubmit", { enumerable: true, get: function () { return session_1.sessionSubmit; } });
Object.defineProperty(exports, "sessionFinish", { enumerable: true, get: function () { return session_1.sessionFinish; } });
// Health check endpoint
exports.health = functions.https.onRequest((req, res) => {
    res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: "1.0.0"
    });
});
//# sourceMappingURL=index.js.map
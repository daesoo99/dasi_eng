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
exports.stt = void 0;
const functions = __importStar(require("firebase-functions"));
const speech_1 = __importDefault(require("@google-cloud/speech"));
const client = new speech_1.default.SpeechClient();
exports.stt = functions.https.onRequest(async (req, res) => {
    var _a, _b, _c, _d, _e, _f;
    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    try {
        const { audioBase64, languageCode = "en-US", phraseHints = [] } = req.body;
        if (!audioBase64) {
            res.status(400).json({ error: "audioBase64 missing" });
            return;
        }
        const audio = { content: audioBase64 };
        const config = {
            languageCode,
            enableAutomaticPunctuation: true,
            model: "latest_long",
            encoding: "WEBM_OPUS",
            // Speech Adaptation for better recognition
            speechContexts: phraseHints.length ? [{
                    phrases: phraseHints,
                    boost: 20.0
                }] : [],
        };
        const [response] = await client.recognize({ audio, config });
        const transcript = ((_a = response.results) === null || _a === void 0 ? void 0 : _a.map(result => { var _a, _b; return ((_b = (_a = result.alternatives) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.transcript) || ""; }).join(" ").trim()) || "";
        const confidence = (_f = (_e = (_d = (_c = (_b = response.results) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.alternatives) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.confidence) !== null && _f !== void 0 ? _f : null;
        res.json({
            transcript,
            confidence,
            success: true
        });
    }
    catch (error) {
        console.error('STT Error:', error);
        res.status(500).json({
            error: error.message,
            success: false
        });
    }
});
//# sourceMappingURL=stt.js.map
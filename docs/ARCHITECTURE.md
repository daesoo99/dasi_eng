# DASI English - System Architecture

This document outlines the technical architecture of the DASI English platform, detailing the specialized AI models and systems that power its interactive learning experience.

## 1. Overall Architecture Flow

The platform is designed as a closed-loop system where user interaction continuously feeds data into our AI engines to provide personalized and adaptive feedback.

```
[User's Voice Input]
    │
    ├─▶ 1. Speech-to-Text (STT) Engine
    │   └─ Pronunciation Accuracy Analysis
    │
    ├─▶ 2. Core Conversation LLM Engine
    │   ├─ Apply Level-Specific Patterns/Grammar
    │   ├─ Explain Nuances in Korean
    │   └─ Provide Paraphrasing Suggestions
    │
    ├─▶ 3. Text-to-Speech (TTS) Engine
    │   └─ Offer Native Pronunciation for Comparison
    │
    ├─▶ 4. Forgetting Curve & Personalization Engine
    │   └─ Schedule Review Questions
    │
    └─▶ 5. Bookmarks (⭐) & Reporting DB
        └─ Combine for Final Personalized Feedback
```

---

## 2. AI Model Specialization

We employ a "best-of-breed" approach, selecting specific AI models for each task based on their unique strengths.

### 2.1. Core Conversation LLM Engine

The LLM engine is the brain of the platform, responsible for generating conversations, evaluating responses, and providing pedagogical feedback. We use a dual-model strategy for optimal performance.

*   **Role:**
    *   Generate AI-driven conversations based on user's level and topic.
    *   Provide real-time feedback on grammar, vocabulary, and style.
    *   Offer paraphrasing options and explain subtle nuances.
*   **Primary Models:**
    *   **GPT-4o (OpenAI):** Used for most real-time conversational tasks due to its speed, cost-effectiveness, and natural-sounding English generation.
    *   **Claude 3.5 Sonnet (Anthropic):** Leveraged for generating longer, more logical, and in-depth explanations, particularly for higher-level learners requiring academic or professional feedback.
    *   **Gemini 1.5 Pro (Google):** Utilized for its multimodal capabilities, allowing the integration of images and other media into the learning process.

### 2.2. Speech-to-Text (STT) Engine

The STT engine's primary role is not just transcription but also providing data for pronunciation analysis.

*   **Role:**
    *   Accurately convert the learner's speech into text.
    *   Detect and flag pronunciation errors or non-native accents.
    *   Provide a quantitative score for pronunciation accuracy.
*   **Primary Models:**
    *   **Whisper Large v3 (OpenAI):** The default choice for its state-of-the-art accuracy in recognizing diverse accents and pronunciation patterns.
    *   **Google Speech-to-Text:** A strong alternative for its reliability and stability in real-time streaming scenarios.
    *   **Naver CLOVA Speech:** Specifically considered for its high performance with Korean speakers' English pronunciation.

### 2.3. Text-to-Speech (TTS) Engine

The TTS engine provides a native-speaker benchmark for learners.

*   **Role:**
    *   Deliver the AI's responses in a clear, natural-sounding voice.
    *   Allow users to listen and compare their pronunciation with a native model.
    *   Support various accents (e.g., American, British, Australian).
*   **Primary Models:**
    *   **ElevenLabs TTS:** Chosen for its exceptionally human-like intonation and delivery, making the conversation feel more authentic.
    *   **Microsoft Azure Neural TTS:** A powerful alternative known for its natural prosody and emotional range.
    *   **Google Cloud TTS:** Valued for its vast selection of voices and languages.

### 2.4. Forgetting Curve & Personalization Engine

This is not a single AI model but a rule-based system enhanced with AI capabilities. It ensures long-term knowledge retention.

*   **Role:**
    *   Track sentences or concepts the user struggles with.
    *   Calculate the optimal time to re-introduce this material based on the forgetting curve theory.
    *   Generate personalized review sessions.
*   **Implementation:**
    *   **Core Logic:** A Python algorithm calculates review intervals (e.g., 1 day, 3 days, 1 week, etc.).
    *   **Database:** Firebase Firestore or PostgreSQL stores user progress, incorrect answers, and bookmarked (⭐) items.
    *   **AI Integration:** LLMs (GPT-4o) are used to analyze learner performance trends and can be called upon to generate novel review sentences that test the same concept in a different context.

### 2.5. Image Generation AI (Optional)

This component provides visual context, which is especially useful for beginner and intermediate learners.

*   **Role:**
    *   Generate images to illustrate vocabulary (e.g., "Show me a *cat*").
    *   Create visual aids to explain abstract concepts or scenarios.
*   **Primary Models:**
    *   **DALL-E 3 (OpenAI):** Tightly integrated with our text-based LLMs, making it easy to generate relevant and context-aware images.
    *   **Stable Diffusion XL:** An alternative for generating high-quality, artistic, or highly specific visual content.

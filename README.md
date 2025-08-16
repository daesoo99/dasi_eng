# DASI English: AI-Powered Language Acquisition

**DASI English (다시 영어)** is an intelligent platform designed to guide users from basic vocabulary to native-level fluency through a structured, data-driven learning path that mirrors natural language acquisition.

Our core philosophy is built on two pillars:
1.  **Data-Driven Vocabulary Stratification:** We use word frequency analysis to teach the most effective vocabulary first, ensuring every lesson provides maximum communicative power.
2.  **Simulated Growth:** The 10-level system simulates the human journey of learning a language—from single-word utterances as a "Newborn" to expressing nuanced, idiomatic thoughts as an "Expert."

This project is not just a conversation partner; it is a sophisticated ecosystem that intelligently manages learning, retention, and motivation.

## The Learning Journey: A 10-Stage Evolution

Our system is more than just a series of levels; it's a carefully designed growth path. Each stage equips the user with specific tools to unlock the next phase of communication, with the AI's persona and conversational style evolving alongside the learner.

| Level | Title | Evolutionary Leap | Example Interaction |
| :--- | :--- | :--- | :--- |
| 1-2 | **Newborn / Toddler** | From words to simple sentences. | `User:` "Apple." → `AI:` "Yes, this is an apple. Do you like apples?" |
| 3-4 | **Child** | From sentences to simple reasoning. | `User:` "I like it." → `AI:` "That's great! Why do you like it?" |
| 5-6 | **Teenager** | From reasoning to structured arguments. | `User:` "It's good." → `AI:` "I see. But although it's good, it's also expensive. What do you think?" |
| 7-8 | **University Student** | From arguments to abstract thought. | `User:` "We need a new policy." → `AI:` "Interesting. What is your take on the potential social impact of such a policy?" |
| 9-10 | **Professional / Expert** | From fluency to nuanced, culturally-aware communication. | `User:` "It's a good solution." → `AI:` "I agree. But it could be a double-edged sword, so to speak." |

For a detailed breakdown of the curriculum, AI personas, and learning mechanics at each level, please see our **[Learning System Design](docs/LEARNING_SYSTEM.md)**.

## Core Features

*   **Adaptive AI Conversation:** Utilizes a hybrid of **GPT-4o** and **Claude 3.5 Sonnet** to provide conversations that are perfectly matched to the user's proficiency level.
*   **High-Fidelity Speech & Pronunciation Analysis:** Powered by **Whisper Large v3** for accurate transcription and detailed phonetic feedback.
*   **Forgetting Curve Engine:** A custom-built system (Python + Firebase) that schedules personalized review sessions to ensure long-term retention.
*   **Gamified Progression:** An EXP and streak system designed to motivate consistent practice.
*   **Intelligent Feedback:**0 Real-time, level-appropriate corrections, nuance explanations, and paraphrasing suggestions.

## Architecture & Tech Stack

The system integrates a suite of best-in-class AI models and technologies to create a seamless learning loop. For a complete overview of the system design, AI model roles, and data flow, please refer to our **[System Architecture Document](docs/ARCHITECTURE.md)**.

*   **Frontend:** React (TypeScript)
*   **Backend:** Node.js (Express), Python
*   **AI Models:** OpenAI GPT-4o, Anthropic Claude 3.5, OpenAI Whisper v3, ElevenLabs TTS
*   **Database:** Firebase Firestore

## Development Roadmap

We are developing DASI English following a phased, agile approach focused on rapid iteration and data-driven decisions. To see our strategic plan, from initial technical validation to ecosystem expansion, please view our **[Development Roadmap](docs/DEVELOPMENT_ROADMAP.md)**.

### 🎯 Current Focus: Speaking-First Approach

**Current Implementation Status (2025-01-12):**
- ✅ Level 1: 376 core expressions (Pattern Viewer)
- ✅ Level 2: 20 stages, Speaking-based learning 
- ✅ Level 3: 30 stages, 6 phases (currently Writing-based)
- 🔄 **In Progress**: Converting Level 3 to Speaking-based for consistency

### 📋 UI/UX Evolution Plans

**Speaking vs Writing Modes:**
- **Primary Focus**: Speaking-based learning (Korean audio → English speech)
- **Secondary Feature**: Writing mode available as backup/alternative
- **Current Priority**: Unified Speaking experience across all levels

**Completed UI Improvements:**
- ✅ Grid layout for Level 2 (20 stages → 2x10 grid)
- ✅ Grid layout for Level 3 (30 stages → 3x10 grid)  
- ✅ AI coaching system for both levels
- ✅ Phase indicator system for Level 3

**Backup & Archive:**
- 📁 Writing-based Level 3 backed up in `/backup/` directory
- 🎨 UI improvements documented and preserved
- 🔄 Ready for future Writing mode implementation

## Project Structure

```
/
├── backend/         # Node.js backend server & Python services
├── web_app/         # React frontend application
├── flutter_app/     # (Future) Flutter mobile application
└── docs/            # Detailed documentation
    ├── ARCHITECTURE.md
    ├── DEVELOPMENT_ROADMAP.md
    └── LEARNING_SYSTEM.md
```

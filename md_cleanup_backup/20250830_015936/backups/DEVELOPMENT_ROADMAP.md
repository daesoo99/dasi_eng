# 🚀 DASI English: Development Roadmap

This document outlines the strategic development roadmap for DASI English. Our approach is rooted in agile principles: we prioritize de-risking core assumptions early, shipping a functional core loop quickly, and iterating based on data and user feedback.

---

## Phase 0: Core Engine Validation (Weeks 1-3)

**Objective:** Prove the foundational technical hypothesis: Can we programmatically constrain a Large Language Model (LLM) to specific, tiered vocabulary and grammar rules without sacrificing conversational quality? This is the project's single greatest technical risk.

**Key Results:**
1.  **Vocabulary Tiers Defined:** A structured database (e.g., JSON, CSV) containing vocabulary lists for at least 3 distinct levels (e.g., Lv. 1, 5, 10) is established based on word frequency data.
2.  **Constraint Engine Built:** A backend service (Python/FastAPI) is created with a single endpoint: `POST /generate_response`. This endpoint accepts `(level: int, user_text: str)` and returns an AI-generated response.
3.  **Hypothesis Validated:** A rigorous test suite is developed that programmatically validates the engine's output. For a given level, >99% of the generated words (excluding proper nouns) must belong to the specified tier or lower.
4.  **Internal Demo:** A command-line interface (CLI) is built to demonstrate the core engine's capabilities to the internal team.

**Outcome:** A high-confidence "Go/No-Go" decision on the project's core premise. We will have a proven, testable engine that forms the foundation of the entire platform.

---

## Phase 1: Minimum Viable Product (MVP) (Weeks 4-8)

**Objective:** Deliver the fastest possible path to a usable, end-to-end learning loop. The focus is on function, not polish. The goal is to get the core experience into the hands of internal testers for initial feedback.

**Key Results:**
1.  **End-to-End Integration:** The Core Engine is integrated with live STT (Whisper) and TTS (ElevenLabs) APIs.
2.  **Functional Frontend:** A minimal web interface (React) is built that allows users to:
    *   Select a level.
    *   Speak and see the transcribed text.
    *   Receive and hear the AI's response.
3.  **Basic State Management:** The user's current level is stored and managed (client-side is sufficient for MVP).
4.  **One-Click Deployment:** A CI/CD pipeline is established to deploy the MVP to a staging environment with a single command.

**Outcome:** A functional, deployed prototype that enables a user to have a level-controlled conversation. This allows us to test the real-world latency and user experience of the full AI pipeline.

---

## Phase 2: Closed Beta (Weeks 9-16)

**Objective:** Evolve the prototype into a robust learning tool with the essential features for retention and tangible progress. The product will be ready for a limited group of external beta testers.

**Key Results:**
1.  **Full Level Implementation:** The Core Engine is expanded to support all 10 learning levels.
2.  **Forgetting Curve Engine (V1):** The backend system for tracking user mistakes and scheduling personalized reviews is implemented using Firebase/PostgreSQL. A "Review" section is added to the UI.
3.  **User Authentication & Database:** A full user account system is implemented to track individual progress, history, and review items.
4.  **UI/UX Overhaul:** The MVP interface is replaced with a polished, intuitive design for the core conversation and review loops.
5.  **Initial Analytics:** Key user engagement metrics are tracked: session length, number of interactions, review completion rate.

**Outcome:** A stable, feature-rich product that can be tested by real users. We can now collect meaningful data on learning effectiveness and user behavior to inform the next phase.

---

## Phase 3: Public Launch & Gamification (Post-Week 16)

**Objective:** Drive long-term user engagement and motivation by launching publicly and implementing a robust gamification and feedback layer.

**Key Results:**
1.  **Gamification System Live:** The EXP, daily streak, and rewards system is fully implemented and visible on the UI.
2.  **Advanced Feedback Implemented:** The AI provides real-time, dynamic feedback on nuance, paraphrasing, and level-appropriate vocabulary.
3.  **User Dashboard:** A personal dashboard is created for users to visualize their progress, statistics, and mastered vocabulary.
4.  **Scalability & Monitoring:** The production infrastructure is hardened. Robust logging, performance monitoring, and alerting are in place to ensure reliability.
5.  **Public Launch:** The application is released to the general public.

**Outcome:** A V1.0 product that is not just a learning tool, but an engaging and motivating platform. The focus shifts from feature development to growth, optimization, and community building.

---

## Phase 4: Ecosystem Expansion & Intelligence

**Objective:** Evolve from a single application into an intelligent, multi-platform learning ecosystem.

**Key Results:**
1.  **Mobile Application:** A native mobile experience is delivered using Flutter.
2.  **Data-Driven Content Pipeline:** User learning data is analyzed to automatically identify common pain points and generate new, targeted practice content.
3.  **A/B Testing Framework:** An internal framework is built to scientifically test and validate new features, AI models, and learning strategies.
4.  **Internationalization:** The platform architecture is refactored to support the addition of new languages for learners.

**Outcome:** A mature, scalable, and self-improving platform that solidifies DASI English as a leader in AI-driven language education.

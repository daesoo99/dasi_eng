# ChangeLog - Engine Metadata Field Introduction

## 📋 Overview
**Date**: 2025-01-14  
**Version**: v2.0.0  
**Scope**: L1~L6 All Levels  

## 🔧 Engine Metadata Fields Introduced

### 1. Drill Configuration
**Fields Added to Every Stage:**
- `delaySec`: Response delay time (seconds)
- `randomize`: Question order randomization (boolean)
- `minCorrectToAdvance`: Minimum correct answers to advance (integer)
- `reviewWeight`: Importance weight for review scheduling (float)

### 2. Slot Validation
**Requirements:**
- Core stages: 5-8 expressions per stage
- Bridge stages: 5-8 expressions per stage
- Optional stages: 5-8 expressions per stage

### 3. Tags System
**Error Taxonomy Integration:**
- BE-COP: "be" verb and copula errors
- DO-AUX: "do" auxiliary verb errors
- TENSE-PAST: Past tense formation errors
- TENSE-PERF: Perfect tense errors
- MODAL: Modal verb usage errors
- PREP: Preposition errors
- DET-ART: Determiner and article errors
- QUANT: Quantifier errors
- COMP-SUP: Comparative and superlative errors
- CLAUSE-IF: Conditional clause errors
- DISCOURSE: Discourse marker errors
- PRON-PROS: Pronoun and prosody errors

### 4. Level Metadata
**Per-Level Configuration:**
```json
{
  "levelMeta": {
    "1": { "delaySec": 3, "randomize": false, "minCAA": 4 },
    "2": { "delaySec": 2, "randomize": false, "minCAA": 5 },
    "3": { "delaySec": 1, "randomize": true, "minCAA": 5 },
    "4": { "delaySec": 1, "randomize": true, "minCAA": 6 },
    "5": { "delaySec": 1, "randomize": true, "minCAA": 6 },
    "6": { "delaySec": 1, "randomize": true, "minCAA": 6 }
  }
}
```

## 📊 Impact Analysis

### Coverage Statistics
- **L1**: 19 stages → 100% metadata coverage
- **L2**: 22 stages → 100% metadata coverage
- **L3**: 26 stages → 100% metadata coverage
- **L4**: 24 stages → 100% metadata coverage
- **L5**: 24 stages → 100% metadata coverage
- **L6**: 24 stages → 100% metadata coverage

### Validation Enhancements
- **Delay Validation**: delaySec field presence and distribution analysis
- **Randomization Analysis**: true/false ratio tracking
- **Classification Aggregation**: core/bridge/optional stage counting
- **Firestore Synchronization**: levelMeta and spec simultaneous storage with rollback tags

## 🔄 Definition of Done (DoD) Updates

### 1. /curriculum-test Enhancements
- Added metadata field validation (delay·randomize·slots·classification aggregation)
- Real-time coverage reporting with DoD compliance indicators
- Enhanced test criteria with detailed metadata statistics

### 2. Firestore Document Structure
- levelMeta and spec stored simultaneously
- Rollback tags included for version management
- Comprehensive metadata validation before storage

### 3. ChangeLog Requirements
- Engine metadata field introduction documented in ChangeLog_Lx.md
- One-line summary: "엔진 메타 필드 도입" added to each level's changelog

## ✅ Validation Results

### L1-L4 Validation Status
```
Level 1: ✅ PASS - 19/19 stages with full metadata
Level 2: ✅ PASS - 22/22 stages with full metadata
Level 3: ✅ PASS - 26/26 stages with full metadata
Level 4: ✅ PASS - 24/24 stages with full metadata
```

### L5-L6 Implementation
```
Level 5: ✅ PASS - 24/24 stages with full metadata
Level 6: ✅ PASS - 24/24 stages with full metadata
```

## 🏗️ Technical Implementation

### Code Changes
- `CurriculumSmokeTest.tsx`: Enhanced with DoD validation criteria
- `curriculumLint.ts`: Comprehensive content validation service
- Engine metadata validation integrated into existing test infrastructure

### Database Schema
- Firestore collections updated with levelMeta requirements
- Stage documents enhanced with drill/slots/tags fields
- Version control and rollback capability implemented

## 🎯 Future Considerations

### L7+ Integration
- Global business communication metadata requirements
- Executive-level drill parameters (delaySec: 0.5, minCAA: 7)
- Cultural sensitivity tags for international scenarios

### AudioV2 Integration
- Engine metadata consumed by AudioSession orchestrator
- Level-specific audio configurations driven by metadata
- Real-time adaptation based on drill parameters

---

**Template Usage:**
This template should be adapted for each level's specific ChangeLog_Lx.md file with the one-line addition:
```
## 🔧 System Updates
- 엔진 메타 필드 도입: drill parameters, slot validation, tags system integration
```
#!/usr/bin/env node

/**
 * DaSi Curriculum Reorganization - Sentence Classification Script
 * Phase 3: Apply sentence classification criteria with grammar validation
 * 
 * This script classifies sentences according to the Sequential Learning Guarantee Principle:
 * "Stage N can only use grammar concepts learned in Stages 1 through N"
 */

const fs = require('fs');
const path = require('path');

const BASE_DIR = path.resolve(__dirname, '..');

class SentenceClassifier {
    constructor() {
        this.grammarRules = this.loadGrammarRules();
        this.levelBoundaries = this.loadLevelBoundaries();
        this.extractedSentences = null;
        this.classificationResults = {
            metadata: {
                version: "1.0.0",
                created: new Date().toISOString(),
                script: "classify-sentences.js",
                description: "Sentence classification results with grammar validation"
            },
            validSentences: [],
            invalidSentences: [],
            statistics: {
                total_processed: 0,
                valid_count: 0,
                invalid_count: 0,
                violations_by_type: {},
                suggestions: []
            }
        };
    }

    /**
     * Load grammar rules from the curriculum files
     */
    loadGrammarRules() {
        console.log("📚 Loading grammar rules...");
        
        // Define comprehensive grammar pattern detection rules
        return {
            // Level 1 Grammar
            be_verb_present: {
                level: 1,
                patterns: [/\\b(am|is|are)\\b/g],
                description: "Present tense be verbs"
            },
            simple_present: {
                level: 1,
                patterns: [/\\b(do|does|don't|doesn't)\\b/g, /\\b\\w+s\\b.*\\./], // 3rd person -s
                description: "Simple present tense"
            },
            simple_past: {
                level: 1,
                patterns: [/\\b\\w+ed\\b/g, /\\b(was|were|went|came|had|said|did)\\b/g],
                description: "Simple past tense"
            },
            will_future: {
                level: 1,
                patterns: [/\\bwill\\b/g, /\\bwon't\\b/g],
                description: "Future with will"
            },
            
            // Level 2 Grammar
            present_continuous: {
                level: 2,
                patterns: [/\\b(am|is|are)\\s+\\w+ing\\b/g],
                description: "Present continuous tense"
            },
            past_continuous: {
                level: 2,
                patterns: [/\\b(was|were)\\s+\\w+ing\\b/g],
                description: "Past continuous tense"
            },
            future_continuous: {
                level: 2,
                patterns: [/\\bwill\\s+be\\s+\\w+ing\\b/g],
                description: "Future continuous tense"
            },
            modal_verbs_basic: {
                level: 2,
                patterns: [/\\b(can|should|must|could)\\b/g],
                description: "Basic modal verbs"
            },
            frequency_adverbs: {
                level: 2,
                patterns: [/\\b(always|usually|often|sometimes|never|frequently|rarely)\\b/g],
                description: "Frequency adverbs"
            },
            
            // Level 3 Grammar
            present_perfect: {
                level: 3,
                patterns: [/\\b(have|has)\\s+(\\w+ed|been|gone|done|seen|taken)\\b/g],
                description: "Present perfect tense"
            },
            present_perfect_continuous: {
                level: 3,
                patterns: [/\\b(have|has)\\s+been\\s+\\w+ing\\b/g],
                description: "Present perfect continuous"
            },
            past_perfect: {
                level: 3,
                patterns: [/\\bhad\\s+(\\w+ed|been|gone|done)\\b/g],
                description: "Past perfect tense"
            },
            passive_voice: {
                level: 3,
                patterns: [/\\b(am|is|are|was|were)\\s+(\\w+ed|\\w+en)\\s+by\\b/g],
                description: "Passive voice constructions"
            },
            conditionals_basic: {
                level: 3,
                patterns: [/\\bif\\s+.+\\s+will\\b/g, /\\bif\\s+.+\\s+would\\b/g],
                description: "Basic conditional sentences"
            },
            
            // Advanced Grammar (Levels 4+)
            conditionals_advanced: {
                level: 4,
                patterns: [/\\bif\\s+.+\\s+had\\b/g, /\\bwish\\s+\\w+\\s+were\\b/g],
                description: "Advanced conditional and subjunctive"
            },
            relative_clauses: {
                level: 4,
                patterns: [/\\b(who|which|that|whom|whose)\\s+\\w+/g],
                description: "Relative clause constructions"
            },
            reported_speech: {
                level: 4,
                patterns: [/\\b(said|told|asked)\\s+that\\b/g, /\\b(said|told)\\s+\\w+\\s+to\\b/g],
                description: "Reported speech patterns"
            }
        };
    }

    /**
     * Load level boundaries configuration
     */
    loadLevelBoundaries() {
        try {
            const boundariesPath = path.join(BASE_DIR, 'docs/curriculum/LEVEL_BOUNDARIES.json');
            if (fs.existsSync(boundariesPath)) {
                return JSON.parse(fs.readFileSync(boundariesPath, 'utf8'));
            }
        } catch (error) {
            console.warn("⚠️  Could not load level boundaries, using defaults");
        }
        
        // Default boundaries
        return {
            level_boundaries: {
                level_1: { stage_range: [1, 16], max_sentence_length: 8 },
                level_2: { stage_range: [17, 36], max_sentence_length: 12 },
                level_3: { stage_range: [37, 66], max_sentence_length: 16 }
            }
        };
    }

    /**
     * Load extracted sentences data
     */
    loadExtractedSentences() {
        console.log("📂 Loading extracted sentences...");
        
        const sentencesPath = path.join(BASE_DIR, 'data/extracted_sentences.json');
        if (!fs.existsSync(sentencesPath)) {
            throw new Error(`Extracted sentences file not found: ${sentencesPath}`);
        }
        
        this.extractedSentences = JSON.parse(fs.readFileSync(sentencesPath, 'utf8'));
        console.log(`📊 Loaded ${this.extractedSentences.sentences.length} sentences for classification`);
    }

    /**
     * Main classification method
     */
    async classifySentences() {
        console.log("🚀 Starting sentence classification...");
        
        this.loadExtractedSentences();
        
        const sentences = this.extractedSentences.sentences;
        let processed = 0;
        
        for (const sentence of sentences) {
            processed++;
            
            if (processed % 1000 === 0) {
                console.log(`  📊 Processed ${processed}/${sentences.length} sentences...`);
            }
            
            const classification = this.classifySentence(sentence);
            
            if (classification.isValid) {
                this.classificationResults.validSentences.push({
                    ...sentence,
                    classification: classification
                });
            } else {
                this.classificationResults.invalidSentences.push({
                    ...sentence,
                    classification: classification
                });
                
                // Track violation types
                classification.violations.forEach(violation => {
                    const type = violation.type;
                    this.classificationResults.statistics.violations_by_type[type] = 
                        (this.classificationResults.statistics.violations_by_type[type] || 0) + 1;
                });
            }
        }
        
        this.generateStatistics();
        this.generateSuggestions();
        await this.saveResults();
        
        console.log("✅ Classification complete!");
        console.log(`📊 Valid sentences: ${this.classificationResults.statistics.valid_count}`);
        console.log(`❌ Invalid sentences: ${this.classificationResults.statistics.invalid_count}`);
    }

    /**
     * Classify a single sentence
     */
    classifySentence(sentence) {
        const classification = {
            isValid: true,
            violations: [],
            detectedGrammar: [],
            recommendedLevel: null,
            recommendedStage: null,
            complexity_score: 0
        };
        
        const englishText = sentence.english;
        const currentLevel = sentence.level;
        const currentStageId = sentence.stage_id;
        
        // Skip sentences without proper English text
        if (!englishText || englishText.length < 3) {
            classification.isValid = false;
            classification.violations.push({
                type: 'invalid_text',
                message: 'Sentence has no valid English text'
            });
            return classification;
        }
        
        // Detect grammar patterns in the sentence
        const detectedGrammar = this.detectGrammarPatterns(englishText);
        classification.detectedGrammar = detectedGrammar;
        
        // Calculate complexity score
        classification.complexity_score = this.calculateComplexityScore(englishText, detectedGrammar);
        
        // Check if grammar is appropriate for the current level
        const grammarViolations = this.checkGrammarViolations(detectedGrammar, currentLevel);
        if (grammarViolations.length > 0) {
            classification.isValid = false;
            classification.violations.push(...grammarViolations);
        }
        
        // Check sentence length constraints
        const lengthViolation = this.checkLengthConstraints(englishText, currentLevel);
        if (lengthViolation) {
            classification.isValid = false;
            classification.violations.push(lengthViolation);
        }
        
        // Recommend appropriate level/stage if current placement is invalid
        if (!classification.isValid) {
            const recommendation = this.recommendPlacement(detectedGrammar, classification.complexity_score);
            classification.recommendedLevel = recommendation.level;
            classification.recommendedStage = recommendation.stage;
        }
        
        return classification;
    }

    /**
     * Detect grammar patterns in a sentence
     */
    detectGrammarPatterns(text) {
        const detected = [];
        
        for (const [grammarName, rule] of Object.entries(this.grammarRules)) {
            for (const pattern of rule.patterns) {
                if (pattern.test(text)) {
                    detected.push({
                        name: grammarName,
                        level: rule.level,
                        description: rule.description
                    });
                    break; // Don't count the same grammar multiple times
                }
            }
        }
        
        return detected;
    }

    /**
     * Check for grammar violations based on level restrictions
     */
    checkGrammarViolations(detectedGrammar, currentLevel) {
        const violations = [];
        
        for (const grammar of detectedGrammar) {
            if (grammar.level > currentLevel) {
                violations.push({
                    type: 'grammar_level_violation',
                    message: `${grammar.description} (Level ${grammar.level}) used in Level ${currentLevel} sentence`,
                    grammar: grammar.name,
                    expectedLevel: grammar.level,
                    currentLevel: currentLevel
                });
            }
        }
        
        return violations;
    }

    /**
     * Check sentence length constraints
     */
    checkLengthConstraints(text, level) {
        const wordCount = text.split(/\\s+/).length;
        const levelBoundary = this.levelBoundaries.level_boundaries[`level_${level}`];
        
        if (levelBoundary && levelBoundary.max_sentence_length) {
            if (wordCount > levelBoundary.max_sentence_length) {
                return {
                    type: 'length_violation',
                    message: `Sentence has ${wordCount} words, exceeds Level ${level} limit of ${levelBoundary.max_sentence_length}`,
                    wordCount: wordCount,
                    limit: levelBoundary.max_sentence_length
                };
            }
        }
        
        return null;
    }

    /**
     * Calculate sentence complexity score
     */
    calculateComplexityScore(text, detectedGrammar) {
        let score = 0;
        
        // Base score from word count
        const wordCount = text.split(/\\s+/).length;
        score += wordCount * 0.5;
        
        // Grammar complexity
        detectedGrammar.forEach(grammar => {
            score += grammar.level * 2;
        });
        
        // Additional complexity factors
        if (text.includes(',')) score += 1; // Comma complexity
        if (text.includes(';')) score += 2; // Semicolon complexity
        if (text.match(/\\b(that|which|who)\\b/)) score += 3; // Relative clause
        if (text.match(/\\b(if|when|because)\\b/)) score += 2; // Subordinate clause
        
        return Math.round(score * 10) / 10;
    }

    /**
     * Recommend appropriate placement for a sentence
     */
    recommendPlacement(detectedGrammar, complexityScore) {
        // Find the highest level grammar used
        const maxGrammarLevel = detectedGrammar.length > 0 ? 
            Math.max(...detectedGrammar.map(g => g.level)) : 1;
        
        // Adjust level based on complexity
        let recommendedLevel = maxGrammarLevel;
        if (complexityScore > 15) recommendedLevel = Math.max(recommendedLevel, 3);
        else if (complexityScore > 10) recommendedLevel = Math.max(recommendedLevel, 2);
        
        // Estimate stage within level
        const levelBoundary = this.levelBoundaries.level_boundaries[`level_${recommendedLevel}`];
        let recommendedStage = 1;
        
        if (levelBoundary && levelBoundary.stage_range) {
            const [minStage, maxStage] = levelBoundary.stage_range;
            // Place more complex sentences later in the level
            const complexity_ratio = Math.min(complexityScore / 20, 1);
            recommendedStage = Math.round(minStage + (maxStage - minStage) * complexity_ratio);
        }
        
        return {
            level: recommendedLevel,
            stage: `Lv${recommendedLevel}-P${Math.ceil(recommendedStage / 4)}-S${String(recommendedStage).padStart(2, '0')}`
        };
    }

    /**
     * Generate classification statistics
     */
    generateStatistics() {
        const stats = this.classificationResults.statistics;
        stats.total_processed = this.classificationResults.validSentences.length + 
                               this.classificationResults.invalidSentences.length;
        stats.valid_count = this.classificationResults.validSentences.length;
        stats.invalid_count = this.classificationResults.invalidSentences.length;
        
        console.log("📊 Generating detailed statistics...");
        
        // Violation type analysis
        console.log("   Violation types:", Object.keys(stats.violations_by_type));
        
        // Most common grammar violations
        const grammarViolations = this.classificationResults.invalidSentences
            .flatMap(s => s.classification.violations)
            .filter(v => v.type === 'grammar_level_violation')
            .reduce((acc, v) => {
                acc[v.grammar] = (acc[v.grammar] || 0) + 1;
                return acc;
            }, {});
            
        stats.most_common_grammar_violations = Object.entries(grammarViolations)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .reduce((acc, [grammar, count]) => {
                acc[grammar] = count;
                return acc;
            }, {});
    }

    /**
     * Generate improvement suggestions
     */
    generateSuggestions() {
        console.log("💡 Generating improvement suggestions...");
        
        const suggestions = [];
        
        // Analyze violation patterns
        const violationTypes = this.classificationResults.statistics.violations_by_type;
        
        if (violationTypes.grammar_level_violation > 100) {
            suggestions.push({
                type: 'grammar_reordering',
                priority: 'high',
                message: `${violationTypes.grammar_level_violation} sentences use advanced grammar too early. Consider reordering stages.`,
                actionable_steps: [
                    'Review sentences with present perfect in Level 1-2',
                    'Move complex conditional sentences to Level 3+',
                    'Reorganize modal verb introduction sequence'
                ]
            });
        }
        
        if (violationTypes.length_violation > 50) {
            suggestions.push({
                type: 'sentence_simplification',
                priority: 'medium',
                message: `${violationTypes.length_violation} sentences exceed length limits for their level.`,
                actionable_steps: [
                    'Break long sentences into shorter ones',
                    'Simplify complex sentences for lower levels',
                    'Create advanced versions for higher levels'
                ]
            });
        }
        
        this.classificationResults.statistics.suggestions = suggestions;
    }

    /**
     * Save classification results
     */
    async saveResults() {
        console.log("💾 Saving classification results...");
        
        const outputPath = path.join(BASE_DIR, 'data/classified_sentences.json');
        const reportPath = path.join(BASE_DIR, 'data/classification_report.json');
        
        // Save full results
        fs.writeFileSync(outputPath, JSON.stringify(this.classificationResults, null, 2));
        console.log(`✅ Classification results saved to: ${path.relative(BASE_DIR, outputPath)}`);
        
        // Save summary report
        const report = {
            metadata: this.classificationResults.metadata,
            statistics: this.classificationResults.statistics,
            sample_violations: this.classificationResults.invalidSentences.slice(0, 10).map(s => ({
                english: s.english,
                current_level: s.level,
                violations: s.classification.violations,
                recommended_placement: {
                    level: s.classification.recommendedLevel,
                    stage: s.classification.recommendedStage
                }
            }))
        };
        
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`📊 Classification report saved to: ${path.relative(BASE_DIR, reportPath)}`);
    }
}

// Run classification if called directly
if (require.main === module) {
    const classifier = new SentenceClassifier();
    classifier.classifySentences().catch(error => {
        console.error("💥 Classification failed:", error);
        process.exit(1);
    });
}

module.exports = SentenceClassifier;
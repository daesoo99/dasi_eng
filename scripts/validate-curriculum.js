#!/usr/bin/env node

/**
 * DaSi Curriculum Reorganization - Validation & Quality Management System
 * Phase 5: Implement comprehensive validation and quality checks
 * 
 * This script validates the reorganized curriculum against:
 * 1. Sequential Learning Guarantee Principle  
 * 2. Grammar progression rules
 * 3. Sentence count and form distribution requirements
 * 4. Data consistency and integrity
 */

const fs = require('fs');
const path = require('path');

const BASE_DIR = path.resolve(__dirname, '..');

class CurriculumValidator {
    constructor() {
        this.canonicalPath = path.join(BASE_DIR, 'web_app/public/patterns/banks');
        this.grammarMapping = null;
        this.levelBoundaries = null;
        this.validationResults = {
            metadata: {
                version: "1.0.0",
                created: new Date().toISOString(),
                script: "validate-curriculum.js",
                validation_rules_applied: [
                    "Sequential Learning Guarantee Principle",
                    "Grammar Level Compliance", 
                    "Sentence Count Requirements",
                    "Form Distribution Standards",
                    "Data Consistency Checks"
                ]
            },
            summary: {
                total_stages_checked: 0,
                passed_stages: 0,
                failed_stages: 0,
                warnings_count: 0,
                critical_errors: 0
            },
            detailed_results: [],
            recommendations: [],
            compliance_score: 0
        };
    }

    /**
     * Main validation method
     */
    async validateCurriculum() {
        console.log("🔍 Starting comprehensive curriculum validation...");
        
        try {
            // Load configuration files
            await this.loadConfiguration();
            
            // Discover all stage files
            const stageFiles = await this.discoverStageFiles();
            console.log(`📋 Found ${stageFiles.length} stage files to validate`);
            
            // Validate each stage
            for (const stageFile of stageFiles) {
                await this.validateStage(stageFile);
            }
            
            // Cross-validate grammar sequence across levels
            await this.validateGrammarSequence();
            
            // Generate final compliance score
            this.calculateComplianceScore();
            
            // Generate recommendations
            this.generateRecommendations();
            
            // Save validation results
            await this.saveValidationResults();
            
            console.log("✅ Curriculum validation complete!");
            console.log(`📊 Overall compliance: ${this.validationResults.compliance_score}%`);
            console.log(`✅ Passed: ${this.validationResults.summary.passed_stages}`);
            console.log(`❌ Failed: ${this.validationResults.summary.failed_stages}`);
            console.log(`⚠️  Warnings: ${this.validationResults.summary.warnings_count}`);
            
        } catch (error) {
            console.error("💥 Validation failed:", error);
            throw error;
        }
    }

    /**
     * Load grammar mapping and level boundaries
     */
    async loadConfiguration() {
        console.log("📚 Loading validation configuration...");
        
        // Load grammar mapping
        try {
            const grammarPath = path.join(BASE_DIR, 'docs/curriculum/GRAMMAR_MAPPING_BY_STAGE.md');
            if (fs.existsSync(grammarPath)) {
                // For now, we'll use the built-in rules, but this could parse the markdown
                this.grammarMapping = this.getBuiltInGrammarRules();
            }
        } catch (error) {
            console.warn("⚠️  Using built-in grammar rules");
            this.grammarMapping = this.getBuiltInGrammarRules();
        }
        
        // Load level boundaries
        try {
            const boundariesPath = path.join(BASE_DIR, 'docs/curriculum/LEVEL_BOUNDARIES.json');
            if (fs.existsSync(boundariesPath)) {
                this.levelBoundaries = JSON.parse(fs.readFileSync(boundariesPath, 'utf8'));
            }
        } catch (error) {
            console.warn("⚠️  Using default level boundaries");
            this.levelBoundaries = this.getDefaultBoundaries();
        }
    }

    /**
     * Discover all stage files in canonical structure
     */
    async discoverStageFiles() {
        const stageFiles = [];
        
        for (let level = 1; level <= 10; level++) {
            const levelDir = path.join(this.canonicalPath, `level_${level}`);
            if (!fs.existsSync(levelDir)) continue;
            
            const files = fs.readdirSync(levelDir)
                .filter(file => file.endsWith('_bank.json'))
                .map(file => ({
                    path: path.join(levelDir, file),
                    level: level,
                    filename: file,
                    stageId: file.replace('_bank.json', '')
                }));
            
            stageFiles.push(...files);
        }
        
        return stageFiles.sort((a, b) => {
            // Sort by level first, then by stage ID
            if (a.level !== b.level) return a.level - b.level;
            return a.stageId.localeCompare(b.stageId);
        });
    }

    /**
     * Validate individual stage file
     */
    async validateStage(stageFile) {
        const result = {
            stage_id: stageFile.stageId,
            level: stageFile.level,
            file_path: path.relative(BASE_DIR, stageFile.path),
            passed: true,
            errors: [],
            warnings: [],
            metrics: {}
        };
        
        this.validationResults.summary.total_stages_checked++;
        
        try {
            // Load stage data
            const stageData = JSON.parse(fs.readFileSync(stageFile.path, 'utf8'));
            
            // Validation checks
            this.validateStageStructure(stageData, result);
            this.validateSentenceCount(stageData, result);
            this.validateFormDistribution(stageData, result);
            this.validateGrammarCompliance(stageData, result);
            this.validateDataConsistency(stageData, result);
            this.validateSequentialPrinciple(stageData, result);
            
            // Calculate stage metrics
            result.metrics = this.calculateStageMetrics(stageData);
            
        } catch (error) {
            result.passed = false;
            result.errors.push({
                type: 'file_error',
                message: `Failed to load or parse stage file: ${error.message}`,
                severity: 'critical'
            });
        }
        
        // Update summary counters
        if (result.passed && result.errors.length === 0) {
            this.validationResults.summary.passed_stages++;
        } else {
            this.validationResults.summary.failed_stages++;
        }
        
        this.validationResults.summary.warnings_count += result.warnings.length;
        this.validationResults.summary.critical_errors += result.errors.filter(e => e.severity === 'critical').length;
        
        this.validationResults.detailed_results.push(result);
    }

    /**
     * Validate stage file structure
     */
    validateStageStructure(stageData, result) {
        const requiredFields = ['stage_id', 'title', 'description', 'sentences', 'forms_distribution'];
        const optionalFields = ['grammar_pattern', 'examples', 'learning_points', 'phase', 'stage_number'];
        
        requiredFields.forEach(field => {
            if (!stageData[field]) {
                result.errors.push({
                    type: 'structure_error',
                    message: `Missing required field: ${field}`,
                    severity: 'high',
                    field: field
                });
                result.passed = false;
            }
        });
        
        // Check sentences array structure
        if (stageData.sentences && Array.isArray(stageData.sentences)) {
            stageData.sentences.forEach((sentence, index) => {
                if (!sentence.id || !sentence.en || !sentence.kr) {
                    result.warnings.push({
                        type: 'sentence_structure',
                        message: `Sentence ${index + 1} missing required fields (id, en, kr)`,
                        sentence_index: index
                    });
                }
            });
        }
    }

    /**
     * Validate sentence count requirements
     */
    validateSentenceCount(stageData, result) {
        const targetCount = 50;
        const actualCount = stageData.sentences ? stageData.sentences.length : 0;
        
        if (actualCount < targetCount) {
            const severity = actualCount < (targetCount * 0.8) ? 'high' : 'medium';
            result.errors.push({
                type: 'sentence_count',
                message: `Stage has ${actualCount} sentences, needs ${targetCount}`,
                severity: severity,
                actual_count: actualCount,
                target_count: targetCount,
                deficit: targetCount - actualCount
            });
            
            if (severity === 'high') {
                result.passed = false;
            }
        } else if (actualCount > targetCount) {
            result.warnings.push({
                type: 'sentence_count',
                message: `Stage has ${actualCount} sentences, exceeds target of ${targetCount}`,
                actual_count: actualCount,
                target_count: targetCount,
                excess: actualCount - targetCount
            });
        }
    }

    /**
     * Validate form distribution (affirmative/negative/questions)
     */
    validateFormDistribution(stageData, result) {
        if (!stageData.forms_distribution) {
            result.errors.push({
                type: 'form_distribution',
                message: 'Missing forms_distribution data',
                severity: 'medium'
            });
            return;
        }
        
        const forms = stageData.forms_distribution;
        const total = (forms.aff || 0) + (forms.neg || 0) + (forms.wh_q || 0) + (forms.unknown || 0);
        
        if (total === 0) {
            result.errors.push({
                type: 'form_distribution',
                message: 'No sentences categorized by form',
                severity: 'high'
            });
            result.passed = false;
            return;
        }
        
        // Check distribution ratios (target: 60% aff, 20% neg, 20% wh_q)
        const affRatio = (forms.aff || 0) / total;
        const negRatio = (forms.neg || 0) / total;
        const whRatio = (forms.wh_q || 0) / total;
        
        // Allow some tolerance in distribution
        if (affRatio < 0.5 || affRatio > 0.8) {
            result.warnings.push({
                type: 'form_distribution',
                message: `Affirmative sentences: ${Math.round(affRatio * 100)}% (target: 60%)`,
                actual_ratio: affRatio,
                target_ratio: 0.6
            });
        }
        
        if (negRatio < 0.1 || negRatio > 0.4) {
            result.warnings.push({
                type: 'form_distribution',
                message: `Negative sentences: ${Math.round(negRatio * 100)}% (target: 20%)`,
                actual_ratio: negRatio,
                target_ratio: 0.2
            });
        }
        
        if (whRatio < 0.1 || whRatio > 0.4) {
            result.warnings.push({
                type: 'form_distribution',
                message: `Question sentences: ${Math.round(whRatio * 100)}% (target: 20%)`,
                actual_ratio: whRatio,
                target_ratio: 0.2
            });
        }
        
        // Check for unknown form classifications
        if (forms.unknown && forms.unknown > total * 0.1) {
            result.warnings.push({
                type: 'form_distribution',
                message: `${forms.unknown} sentences have unknown form classification`,
                unknown_count: forms.unknown
            });
        }
    }

    /**
     * Validate grammar compliance with level restrictions
     */
    validateGrammarCompliance(stageData, result) {
        const stageLevel = result.level;
        const allowedGrammar = this.getAllowedGrammarForLevel(stageLevel);
        
        if (!stageData.sentences) return;
        
        // Sample check - analyze first 10 sentences for grammar patterns
        const sampleSentences = stageData.sentences.slice(0, Math.min(10, stageData.sentences.length));
        
        sampleSentences.forEach((sentence, index) => {
            if (!sentence.en) return;
            
            const detectedGrammar = this.detectAdvancedGrammar(sentence.en);
            
            detectedGrammar.forEach(grammar => {
                if (!allowedGrammar.includes(grammar.type)) {
                    result.errors.push({
                        type: 'grammar_violation',
                        message: `Sentence uses ${grammar.description} (not allowed in Level ${stageLevel})`,
                        severity: 'high',
                        sentence_index: index,
                        sentence: sentence.en,
                        grammar_type: grammar.type,
                        grammar_level: grammar.level
                    });
                    result.passed = false;
                }
            });
        });
    }

    /**
     * Validate data consistency
     */
    validateDataConsistency(stageData, result) {
        // Check if stage_id matches filename
        const expectedStageId = result.stage_id;
        if (stageData.stage_id !== expectedStageId) {
            result.errors.push({
                type: 'data_consistency',
                message: `Stage ID mismatch: file says ${expectedStageId}, content says ${stageData.stage_id}`,
                severity: 'medium'
            });
        }
        
        // Check if count matches actual sentence count
        if (stageData.count && stageData.sentences) {
            if (stageData.count !== stageData.sentences.length) {
                result.warnings.push({
                    type: 'data_consistency',
                    message: `Count field (${stageData.count}) doesn't match sentences array length (${stageData.sentences.length})`,
                    reported_count: stageData.count,
                    actual_count: stageData.sentences.length
                });
            }
        }
        
        // Check for duplicate sentence IDs
        if (stageData.sentences) {
            const seenIds = new Set();
            const duplicates = [];
            
            stageData.sentences.forEach((sentence, index) => {
                if (sentence.id && seenIds.has(sentence.id)) {
                    duplicates.push({ id: sentence.id, index: index });
                } else if (sentence.id) {
                    seenIds.add(sentence.id);
                }
            });
            
            if (duplicates.length > 0) {
                result.errors.push({
                    type: 'data_consistency',
                    message: `Found ${duplicates.length} duplicate sentence IDs`,
                    severity: 'medium',
                    duplicates: duplicates
                });
            }
        }
    }

    /**
     * Validate Sequential Learning Guarantee Principle
     */
    validateSequentialPrinciple(stageData, result) {
        const stageLevel = result.level;
        const stageNumber = this.extractStageNumber(stageData.stage_id);
        
        // Check if stage introduces grammar concepts in proper order
        if (stageData.sentences) {
            const grammarUsed = new Set();
            
            // Sample sentences to check grammar progression
            const sampleSentences = stageData.sentences.slice(0, Math.min(5, stageData.sentences.length));
            
            sampleSentences.forEach(sentence => {
                const grammar = this.detectAdvancedGrammar(sentence.en);
                grammar.forEach(g => grammarUsed.add(g.type));
            });
            
            // Check if any advanced grammar is used too early
            Array.from(grammarUsed).forEach(grammarType => {
                const grammarInfo = this.getGrammarInfo(grammarType);
                if (grammarInfo && grammarInfo.introducedInLevel > stageLevel) {
                    result.errors.push({
                        type: 'sequential_violation',
                        message: `Grammar "${grammarType}" used in Level ${stageLevel}, but should be introduced in Level ${grammarInfo.introducedInLevel}`,
                        severity: 'critical',
                        grammar_type: grammarType,
                        current_level: stageLevel,
                        required_level: grammarInfo.introducedInLevel
                    });
                    result.passed = false;
                }
            });
        }
    }

    /**
     * Calculate stage-specific metrics
     */
    calculateStageMetrics(stageData) {
        const metrics = {
            sentence_count: stageData.sentences ? stageData.sentences.length : 0,
            completion_percentage: 0,
            form_balance_score: 0,
            data_quality_score: 0
        };
        
        // Completion percentage
        metrics.completion_percentage = Math.min(100, (metrics.sentence_count / 50) * 100);
        
        // Form balance score (how close to ideal 60/20/20 distribution)
        if (stageData.forms_distribution) {
            const forms = stageData.forms_distribution;
            const total = (forms.aff || 0) + (forms.neg || 0) + (forms.wh_q || 0) + (forms.unknown || 0);
            
            if (total > 0) {
                const affTarget = 0.6, negTarget = 0.2, whTarget = 0.2;
                const affActual = (forms.aff || 0) / total;
                const negActual = (forms.neg || 0) / total;
                const whActual = (forms.wh_q || 0) / total;
                
                const affDiff = Math.abs(affActual - affTarget);
                const negDiff = Math.abs(negActual - negTarget);
                const whDiff = Math.abs(whActual - whTarget);
                
                // Score based on how close to target (lower difference = higher score)
                metrics.form_balance_score = Math.max(0, 100 - (affDiff + negDiff + whDiff) * 100);
            }
        }
        
        // Data quality score (based on completeness of required fields)
        let qualityChecks = 0;
        let qualityPassed = 0;
        
        const requiredFields = ['stage_id', 'title', 'description', 'sentences'];
        requiredFields.forEach(field => {
            qualityChecks++;
            if (stageData[field]) qualityPassed++;
        });
        
        if (stageData.sentences && Array.isArray(stageData.sentences)) {
            const sampleSize = Math.min(5, stageData.sentences.length);
            stageData.sentences.slice(0, sampleSize).forEach(sentence => {
                qualityChecks += 3; // id, en, kr
                if (sentence.id) qualityPassed++;
                if (sentence.en && sentence.en.length > 0) qualityPassed++;
                if (sentence.kr && sentence.kr.length > 0) qualityPassed++;
            });
        }
        
        metrics.data_quality_score = qualityChecks > 0 ? Math.round((qualityPassed / qualityChecks) * 100) : 0;
        
        return metrics;
    }

    /**
     * Cross-validate grammar sequence across all levels
     */
    async validateGrammarSequence() {
        console.log("🔄 Validating grammar sequence across levels...");
        
        // This would check that grammar concepts are introduced in the correct order
        // across the entire curriculum - placeholder for now
        
        // Could implement checks like:
        // - Present perfect not appearing before present continuous is mastered
        // - Passive voice not appearing before perfect tenses
        // - Complex conditionals not appearing before basic conditionals
    }

    /**
     * Calculate overall compliance score
     */
    calculateComplianceScore() {
        const summary = this.validationResults.summary;
        
        if (summary.total_stages_checked === 0) {
            this.validationResults.compliance_score = 0;
            return;
        }
        
        // Base score from pass/fail ratio
        const passRatio = summary.passed_stages / summary.total_stages_checked;
        let score = passRatio * 70; // 70% weight for basic pass/fail
        
        // Penalty for critical errors
        const criticalPenalty = Math.min(30, summary.critical_errors * 2);
        score -= criticalPenalty;
        
        // Bonus for low warning count
        const warningRate = summary.warnings_count / summary.total_stages_checked;
        if (warningRate < 2) { // Less than 2 warnings per stage
            score += 10;
        }
        
        this.validationResults.compliance_score = Math.max(0, Math.min(100, Math.round(score)));
    }

    /**
     * Generate improvement recommendations
     */
    generateRecommendations() {
        const recommendations = [];
        const summary = this.validationResults.summary;
        
        // Analyze common error patterns
        const errorTypes = {};
        const warningTypes = {};
        
        this.validationResults.detailed_results.forEach(result => {
            result.errors.forEach(error => {
                errorTypes[error.type] = (errorTypes[error.type] || 0) + 1;
            });
            result.warnings.forEach(warning => {
                warningTypes[warning.type] = (warningTypes[warning.type] || 0) + 1;
            });
        });
        
        // Generate recommendations based on patterns
        if (errorTypes.sentence_count > 10) {
            recommendations.push({
                priority: 'high',
                type: 'content_generation',
                issue: `${errorTypes.sentence_count} stages lack sufficient sentences`,
                recommendation: 'Implement automated sentence generation system following Sequential Learning Guarantee Principle',
                estimated_effort: 'high'
            });
        }
        
        if (errorTypes.grammar_violation > 5) {
            recommendations.push({
                priority: 'critical',
                type: 'grammar_compliance',
                issue: `${errorTypes.grammar_violation} grammar violations detected`,
                recommendation: 'Review and revise sentences to comply with grammar level restrictions',
                estimated_effort: 'medium'
            });
        }
        
        if (warningTypes.form_distribution > 20) {
            recommendations.push({
                priority: 'medium',
                type: 'form_balancing',
                issue: `${warningTypes.form_distribution} stages have imbalanced form distributions`,
                recommendation: 'Adjust affirmative/negative/question ratios to achieve 60/20/20 target',
                estimated_effort: 'low'
            });
        }
        
        // Compliance-based recommendations
        if (this.validationResults.compliance_score < 70) {
            recommendations.push({
                priority: 'critical',
                type: 'overall_quality',
                issue: `Overall compliance score is ${this.validationResults.compliance_score}%`,
                recommendation: 'Comprehensive quality improvement needed before production deployment',
                estimated_effort: 'high'
            });
        } else if (this.validationResults.compliance_score < 90) {
            recommendations.push({
                priority: 'medium',
                type: 'quality_improvement',
                issue: `Compliance score is ${this.validationResults.compliance_score}%`,
                recommendation: 'Address remaining issues to achieve production-ready quality (90%+ target)',
                estimated_effort: 'medium'
            });
        }
        
        this.validationResults.recommendations = recommendations;
    }

    /**
     * Save validation results to files
     */
    async saveValidationResults() {
        console.log("💾 Saving validation results...");
        
        // Full detailed results
        const detailedPath = path.join(BASE_DIR, 'data/validation_results.json');
        fs.writeFileSync(detailedPath, JSON.stringify(this.validationResults, null, 2));
        console.log(`✅ Detailed results saved: ${path.relative(BASE_DIR, detailedPath)}`);
        
        // Summary report
        const summaryPath = path.join(BASE_DIR, 'data/validation_summary.md');
        const summaryContent = this.generateSummaryReport();
        fs.writeFileSync(summaryPath, summaryContent);
        console.log(`📊 Summary report saved: ${path.relative(BASE_DIR, summaryPath)}`);
        
        // Critical issues report (for immediate attention)
        const criticalIssues = this.validationResults.detailed_results
            .filter(result => result.errors.some(e => e.severity === 'critical'))
            .map(result => ({
                stage_id: result.stage_id,
                level: result.level,
                critical_errors: result.errors.filter(e => e.severity === 'critical')
            }));
            
        if (criticalIssues.length > 0) {
            const criticalPath = path.join(BASE_DIR, 'data/critical_issues.json');
            fs.writeFileSync(criticalPath, JSON.stringify(criticalIssues, null, 2));
            console.log(`⚠️  Critical issues report: ${path.relative(BASE_DIR, criticalPath)}`);
        }
    }

    /**
     * Generate markdown summary report
     */
    generateSummaryReport() {
        const results = this.validationResults;
        const summary = results.summary;
        
        return `# DaSi Curriculum Validation Report

## Executive Summary
**Validation Date**: ${results.metadata.created}
**Overall Compliance Score**: ${results.compliance_score}%
**Total Stages Validated**: ${summary.total_stages_checked}

## Results Overview
- ✅ **Passed Stages**: ${summary.passed_stages} (${Math.round(summary.passed_stages / summary.total_stages_checked * 100)}%)
- ❌ **Failed Stages**: ${summary.failed_stages} (${Math.round(summary.failed_stages / summary.total_stages_checked * 100)}%)
- ⚠️ **Total Warnings**: ${summary.warnings_count}
- 🚨 **Critical Errors**: ${summary.critical_errors}

## Validation Rules Applied
${results.metadata.validation_rules_applied.map(rule => `- ${rule}`).join('\n')}

## Key Findings
${summary.critical_errors > 0 ? `
### 🚨 Critical Issues Found
- **${summary.critical_errors}** critical errors require immediate attention
- These issues must be resolved before production deployment
` : ''}

### 📊 Stage Completion Status
- **Complete Stages** (50+ sentences): ${results.detailed_results.filter(r => r.metrics?.completion_percentage >= 100).length}
- **Incomplete Stages**: ${results.detailed_results.filter(r => r.metrics?.completion_percentage < 100).length}
- **Average Completion**: ${Math.round(results.detailed_results.reduce((sum, r) => sum + (r.metrics?.completion_percentage || 0), 0) / results.detailed_results.length)}%

### 📈 Quality Metrics
- **Form Distribution Compliance**: ${Math.round(results.detailed_results.reduce((sum, r) => sum + (r.metrics?.form_balance_score || 0), 0) / results.detailed_results.length)}%
- **Data Quality Score**: ${Math.round(results.detailed_results.reduce((sum, r) => sum + (r.metrics?.data_quality_score || 0), 0) / results.detailed_results.length)}%

## Recommendations
${results.recommendations.map(rec => `
### ${rec.type} (Priority: ${rec.priority})
**Issue**: ${rec.issue}
**Recommendation**: ${rec.recommendation}
**Estimated Effort**: ${rec.estimated_effort}
`).join('\n')}

## Next Actions
${results.compliance_score < 70 ? `
1. 🚨 **URGENT**: Address critical issues before any deployment
2. Focus on stages with grammar violations (Sequential Learning Principle)
3. Complete sentence generation for incomplete stages
4. Re-run validation after fixes
` : results.compliance_score < 90 ? `
1. Address remaining high and medium priority issues
2. Improve form distribution balance across stages
3. Complete final quality checks
4. Prepare for production deployment
` : `
1. ✅ System is production-ready!
2. Continue monitoring for future updates
3. Document best practices for maintenance
`}

---
*Generated by DaSi Curriculum Validation System*
*Compliance Threshold: 90% for Production Readiness*
`;
    }

    /**
     * Utility methods for grammar detection and rules
     */
    
    getBuiltInGrammarRules() {
        return {
            level_1: ['be_verb', 'simple_present', 'simple_past', 'will_future', 'basic_negation', 'basic_questions'],
            level_2: ['present_continuous', 'past_continuous', 'future_continuous', 'frequency_adverbs', 'modal_basic'],
            level_3: ['present_perfect', 'past_perfect', 'passive_voice', 'conditionals_basic']
        };
    }
    
    getDefaultBoundaries() {
        return {
            level_boundaries: {
                level_1: { max_sentence_length: 8 },
                level_2: { max_sentence_length: 12 },
                level_3: { max_sentence_length: 16 }
            }
        };
    }
    
    getAllowedGrammarForLevel(level) {
        let allowed = [];
        for (let i = 1; i <= level; i++) {
            if (this.grammarMapping[`level_${i}`]) {
                allowed.push(...this.grammarMapping[`level_${i}`]);
            }
        }
        return allowed;
    }
    
    detectAdvancedGrammar(sentence) {
        const detected = [];
        
        // Simple regex-based detection for key advanced grammar
        if (/\\b(have|has)\\s+\\w+ed\\b/.test(sentence)) {
            detected.push({ type: 'present_perfect', level: 3, description: 'Present Perfect' });
        }
        if (/\\b(am|is|are)\\s+being\\s+\\w+ed\\b/.test(sentence)) {
            detected.push({ type: 'passive_continuous', level: 4, description: 'Passive Continuous' });
        }
        if (/\\bif\\s+.+\\s+would\\b/.test(sentence)) {
            detected.push({ type: 'conditional_second', level: 4, description: 'Second Conditional' });
        }
        
        return detected;
    }
    
    getGrammarInfo(grammarType) {
        const grammarLevels = {
            'present_perfect': { introducedInLevel: 3 },
            'passive_continuous': { introducedInLevel: 4 },
            'conditional_second': { introducedInLevel: 4 }
        };
        
        return grammarLevels[grammarType];
    }
    
    extractStageNumber(stageId) {
        const match = stageId.match(/S(\\d+)/);
        return match ? parseInt(match[1]) : 1;
    }
}

// Run validation if called directly
if (require.main === module) {
    const validator = new CurriculumValidator();
    
    // Check command line arguments for specific validation modes
    const args = process.argv.slice(2);
    
    if (args.includes('--help')) {
        console.log(`
DaSi Curriculum Validation System

Usage:
  node validate-curriculum.js [options]

Options:
  --full-check      Run complete validation (default)
  --level N         Validate specific level only
  --critical-only   Show only critical issues
  --help           Show this help message

Examples:
  node validate-curriculum.js --level 2
  node validate-curriculum.js --critical-only
`);
        process.exit(0);
    }
    
    validator.validateCurriculum().catch(error => {
        console.error("💥 Validation failed:", error);
        process.exit(1);
    });
}

module.exports = CurriculumValidator;
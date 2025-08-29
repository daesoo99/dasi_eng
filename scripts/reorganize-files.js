#!/usr/bin/env node

/**
 * DaSi Curriculum Reorganization - File Reorganization Script
 * Phase 4: Reorganize files and establish canonical data source
 * 
 * This script:
 * 1. Establishes web_app/public/patterns/banks/ as the single source of truth
 * 2. Backs up existing scattered data
 * 3. Reorganizes sentences into proper stage files
 * 4. Standardizes file structure and metadata
 */

const fs = require('fs');
const path = require('path');

const BASE_DIR = path.resolve(__dirname, '..');

class FileReorganizer {
    constructor() {
        this.canonicalPath = path.join(BASE_DIR, 'web_app/public/patterns/banks');
        this.backupPath = path.join(BASE_DIR, 'backups/reorganization_backup_' + new Date().toISOString().slice(0,19).replace(/[:.]/g, '-'));
        this.classifiedData = null;
        this.reorganizationResults = {
            metadata: {
                version: "1.0.0",
                created: new Date().toISOString(),
                script: "reorganize-files.js",
                canonical_path: this.canonicalPath,
                backup_path: this.backupPath
            },
            processing_summary: {
                files_created: 0,
                files_updated: 0,
                sentences_placed: 0,
                backup_files: 0
            },
            stage_completion: {},
            quality_metrics: {}
        };
    }

    /**
     * Main reorganization method
     */
    async reorganizeFiles() {
        console.log("🚀 Starting file reorganization...");
        
        try {
            // Step 1: Load classification data
            await this.loadClassificationData();
            
            // Step 2: Create backup of existing files
            await this.createBackup();
            
            // Step 3: Analyze sentence distribution by stage
            const stageDistribution = this.analyzeStageDistribution();
            
            // Step 4: Create canonical directory structure
            await this.createCanonicalStructure();
            
            // Step 5: Reorganize sentences into stage files
            await this.organizeSentencesByStage(stageDistribution);
            
            // Step 6: Generate quality reports
            await this.generateQualityReports();
            
            // Step 7: Save reorganization results
            await this.saveResults();
            
            console.log("✅ File reorganization complete!");
            console.log(`📁 Canonical location: ${path.relative(BASE_DIR, this.canonicalPath)}`);
            console.log(`💾 Backup location: ${path.relative(BASE_DIR, this.backupPath)}`);
            
        } catch (error) {
            console.error("❌ Reorganization failed:", error);
            throw error;
        }
    }

    /**
     * Load classified sentence data
     */
    async loadClassificationData() {
        console.log("📂 Loading classified sentence data...");
        
        const classifiedPath = path.join(BASE_DIR, 'data/classified_sentences.json');
        if (!fs.existsSync(classifiedPath)) {
            throw new Error(`Classified sentences file not found: ${classifiedPath}`);
        }
        
        this.classifiedData = JSON.parse(fs.readFileSync(classifiedPath, 'utf8'));
        console.log(`📊 Loaded ${this.classifiedData.validSentences.length} valid sentences`);
        console.log(`⚠️  Found ${this.classifiedData.invalidSentences.length} invalid sentences`);
    }

    /**
     * Create backup of existing files
     */
    async createBackup() {
        console.log("💾 Creating backup of existing files...");
        
        // Create backup directory
        fs.mkdirSync(this.backupPath, { recursive: true });
        
        // Backup existing canonical directory
        const canonicalExists = fs.existsSync(this.canonicalPath);
        if (canonicalExists) {
            await this.copyDirectory(this.canonicalPath, path.join(this.backupPath, 'canonical_banks'));
            this.reorganizationResults.processing_summary.backup_files++;
        }
        
        // Backup data/banks directory
        const dataBanksPath = path.join(BASE_DIR, 'data/banks');
        if (fs.existsSync(dataBanksPath)) {
            await this.copyDirectory(dataBanksPath, path.join(this.backupPath, 'data_banks'));
            this.reorganizationResults.processing_summary.backup_files++;
        }
        
        console.log(`✅ Backup created at: ${path.relative(BASE_DIR, this.backupPath)}`);
    }

    /**
     * Analyze how sentences are distributed across stages
     */
    analyzeStageDistribution() {
        console.log("📊 Analyzing sentence distribution by stage...");
        
        const distribution = {};
        
        // Analyze valid sentences
        this.classifiedData.validSentences.forEach(sentence => {
            const stageId = sentence.stage_id;
            if (!distribution[stageId]) {
                distribution[stageId] = {
                    stage_id: stageId,
                    level: sentence.level,
                    sentences: [],
                    forms: { aff: 0, neg: 0, wh_q: 0, unknown: 0 },
                    total_count: 0
                };
            }
            
            distribution[stageId].sentences.push(sentence);
            distribution[stageId].total_count++;
            
            const form = sentence.form || 'unknown';
            distribution[stageId].forms[form] = (distribution[stageId].forms[form] || 0) + 1;
        });
        
        console.log(`📈 Found sentences for ${Object.keys(distribution).length} stages`);
        
        // Report stages with insufficient sentences
        const insufficient = Object.values(distribution).filter(stage => stage.total_count < 50);
        if (insufficient.length > 0) {
            console.log(`⚠️  ${insufficient.length} stages have less than 50 sentences`);
        }
        
        return distribution;
    }

    /**
     * Create canonical directory structure
     */
    async createCanonicalStructure() {
        console.log("🏗️  Creating canonical directory structure...");
        
        // Ensure base canonical directory exists
        fs.mkdirSync(this.canonicalPath, { recursive: true });
        
        // Create level directories (1-10)
        for (let level = 1; level <= 10; level++) {
            const levelDir = path.join(this.canonicalPath, `level_${level}`);
            fs.mkdirSync(levelDir, { recursive: true });
        }
        
        console.log(`✅ Canonical structure created at: ${path.relative(BASE_DIR, this.canonicalPath)}`);
    }

    /**
     * Organize sentences into stage files
     */
    async organizeSentencesByStage(stageDistribution) {
        console.log("📝 Organizing sentences into stage files...");
        
        for (const [stageId, stageData] of Object.entries(stageDistribution)) {
            if (stageData.level === 0 || !stageId || stageId === 'unknown') {
                console.log(`⏭️  Skipping stage ${stageId} (invalid level)`);
                continue;
            }
            
            const levelDir = path.join(this.canonicalPath, `level_${stageData.level}`);
            const stageFile = path.join(levelDir, `${stageId}_bank.json`);
            
            // Create standardized stage file
            const stageFileData = this.createStandardStageFile(stageData);
            
            // Write to file
            fs.writeFileSync(stageFile, JSON.stringify(stageFileData, null, 2));
            
            // Update statistics
            this.reorganizationResults.processing_summary.sentences_placed += stageData.total_count;
            
            if (fs.existsSync(stageFile)) {
                this.reorganizationResults.processing_summary.files_updated++;
            } else {
                this.reorganizationResults.processing_summary.files_created++;
            }
            
            // Track stage completion
            this.reorganizationResults.stage_completion[stageId] = {
                sentence_count: stageData.total_count,
                target_count: 50,
                completion_percentage: Math.round((stageData.total_count / 50) * 100),
                form_distribution: stageData.forms
            };
        }
        
        console.log(`✅ Created/updated ${Object.keys(stageDistribution).length} stage files`);
    }

    /**
     * Create standardized stage file format
     */
    createStandardStageFile(stageData) {
        // Extract metadata from first sentence if available
        const firstSentence = stageData.sentences[0] || {};
        
        // Standardize sentences format
        const standardizedSentences = stageData.sentences.map((sentence, index) => ({
            id: sentence.id || `${stageData.stage_id}-${String(index + 1).padStart(3, '0')}`,
            kr: sentence.korean || sentence.kr || '',
            en: sentence.english || sentence.en || '',
            form: sentence.form || 'aff'
        }));
        
        return {
            stage_id: stageData.stage_id,
            title: this.generateStageTitle(stageData.stage_id),
            description: this.generateStageDescription(stageData.stage_id),
            grammar_pattern: this.extractGrammarPattern(stageData.sentences),
            examples: standardizedSentences.slice(0, 2).map(s => s.en),
            learning_points: this.generateLearningPoints(stageData.stage_id),
            phase: this.extractPhaseFromStageId(stageData.stage_id),
            stage_number: this.extractStageNumberFromStageId(stageData.stage_id),
            count: standardizedSentences.length,
            sentences: standardizedSentences,
            forms_distribution: stageData.forms,
            status: standardizedSentences.length >= 50 ? "complete" : "incomplete",
            batch: this.determineBatch(stageData.stage_id),
            metadata: {
                reorganized_at: new Date().toISOString(),
                reorganization_version: "2.2.0",
                source_files: [...new Set(stageData.sentences.map(s => s.source_file))].filter(Boolean)
            }
        };
    }

    /**
     * Generate appropriate stage title from stage ID
     */
    generateStageTitle(stageId) {
        const titles = {
            // Level 1
            'Lv1-P1-S01': 'Be 동사 현재형',
            'Lv1-P1-S02': '일반동사 현재형',
            'Lv1-P1-S03': '일반동사 과거형',
            'Lv1-P1-S04': '미래형 (will)',
            'Lv1-P2-S05': '부정문 만들기',
            'Lv1-P2-S06': 'Yes/No 질문',
            'Lv1-P2-S07': 'Wh- 질문 기초',
            'Lv1-P2-S08': '명령문 익히기',
            
            // Level 2  
            'Lv2-P1-S01': '현재진행형 기초',
            'Lv2-P1-S02': '현재진행형 응용',
            'Lv2-P1-S03': '과거진행형',
            'Lv2-P1-S04': '미래진행형',
            'Lv2-P2-S06': '빈도부사 기초',
            
            // Level 3
            'Lv3-P1-S01': '미래 표현 심화',
            'Lv3-P1-S02': '현재완료 (Have p.p.) 용법'
        };
        
        return titles[stageId] || `Stage ${stageId}`;
    }

    /**
     * Generate stage description
     */
    generateStageDescription(stageId) {
        // This could be expanded with more specific descriptions per stage
        const level = this.extractLevelFromStageId(stageId);
        return `Level ${level} grammar practice focusing on stage-specific patterns and expressions.`;
    }

    /**
     * Extract grammar pattern from sentences
     */
    extractGrammarPattern(sentences) {
        // Analyze the sentences to determine the primary grammar pattern
        // This is a simplified version - could be made more sophisticated
        const sample = sentences[0];
        if (sample && sample.classification && sample.classification.detectedGrammar.length > 0) {
            return sample.classification.detectedGrammar[0].description;
        }
        return "Basic sentence patterns";
    }

    /**
     * Generate learning points for stage
     */
    generateLearningPoints(stageId) {
        const level = this.extractLevelFromStageId(stageId);
        return `Level ${level} target grammar and expressions with practical usage examples`;
    }

    /**
     * Utility functions for stage ID parsing
     */
    extractPhaseFromStageId(stageId) {
        const match = stageId.match(/P(\d+)/);
        return match ? parseInt(match[1]) : 1;
    }

    extractStageNumberFromStageId(stageId) {
        const match = stageId.match(/S(\d+)/);
        return match ? parseInt(match[1]) : 1;
    }

    extractLevelFromStageId(stageId) {
        const match = stageId.match(/Lv(\d+)/);
        return match ? parseInt(match[1]) : 1;
    }

    determineBatch(stageId) {
        const level = this.extractLevelFromStageId(stageId);
        return `L${level}_Reorganization_Batch`;
    }

    /**
     * Copy directory recursively
     */
    async copyDirectory(source, destination) {
        fs.mkdirSync(destination, { recursive: true });
        
        const entries = fs.readdirSync(source, { withFileTypes: true });
        
        for (const entry of entries) {
            const sourcePath = path.join(source, entry.name);
            const destPath = path.join(destination, entry.name);
            
            if (entry.isDirectory()) {
                await this.copyDirectory(sourcePath, destPath);
            } else {
                fs.copyFileSync(sourcePath, destPath);
            }
        }
    }

    /**
     * Generate quality reports
     */
    async generateQualityReports() {
        console.log("📊 Generating quality reports...");
        
        // Count stages by completion status
        const completionStats = {
            complete: 0,
            incomplete: 0,
            missing: 0
        };
        
        Object.values(this.reorganizationResults.stage_completion).forEach(stage => {
            if (stage.sentence_count >= 50) {
                completionStats.complete++;
            } else if (stage.sentence_count > 0) {
                completionStats.incomplete++;
            } else {
                completionStats.missing++;
            }
        });
        
        this.reorganizationResults.quality_metrics = {
            completion_stats: completionStats,
            total_stages: Object.keys(this.reorganizationResults.stage_completion).length,
            completion_rate: Math.round((completionStats.complete / Object.keys(this.reorganizationResults.stage_completion).length) * 100),
            form_distribution_analysis: this.analyzeFormDistribution(),
            recommendations: this.generateRecommendations(completionStats)
        };
    }

    /**
     * Analyze form distribution across stages
     */
    analyzeFormDistribution() {
        const analysis = {
            total_forms: { aff: 0, neg: 0, wh_q: 0, unknown: 0 },
            stages_with_good_distribution: 0,
            stages_needing_balance: []
        };
        
        Object.entries(this.reorganizationResults.stage_completion).forEach(([stageId, stage]) => {
            const forms = stage.form_distribution;
            
            // Add to totals
            Object.keys(analysis.total_forms).forEach(form => {
                analysis.total_forms[form] += forms[form] || 0;
            });
            
            // Check if distribution is balanced (roughly 60/20/20)
            const total = stage.sentence_count;
            if (total >= 30) { // Only check stages with reasonable sentence counts
                const affRatio = (forms.aff || 0) / total;
                const negRatio = (forms.neg || 0) / total;
                const whRatio = (forms.wh_q || 0) / total;
                
                if (affRatio >= 0.5 && affRatio <= 0.7 && negRatio >= 0.15 && whRatio >= 0.15) {
                    analysis.stages_with_good_distribution++;
                } else {
                    analysis.stages_needing_balance.push({
                        stage_id: stageId,
                        current_distribution: { aff: affRatio, neg: negRatio, wh_q: whRatio },
                        total_sentences: total
                    });
                }
            }
        });
        
        return analysis;
    }

    /**
     * Generate recommendations for improvement
     */
    generateRecommendations(completionStats) {
        const recommendations = [];
        
        if (completionStats.incomplete > 0) {
            recommendations.push({
                type: 'sentence_generation',
                priority: 'high',
                message: `${completionStats.incomplete} stages need additional sentences to reach 50 sentence target`,
                action: 'Generate missing sentences following Sequential Learning Guarantee Principle'
            });
        }
        
        if (completionStats.missing > 0) {
            recommendations.push({
                type: 'stage_creation',
                priority: 'critical',
                message: `${completionStats.missing} stages have no sentences`,
                action: 'Create complete sentence sets for missing stages'
            });
        }
        
        const formAnalysis = this.reorganizationResults.quality_metrics?.form_distribution_analysis;
        if (formAnalysis && formAnalysis.stages_needing_balance.length > 0) {
            recommendations.push({
                type: 'form_balancing',
                priority: 'medium',
                message: `${formAnalysis.stages_needing_balance.length} stages need form distribution rebalancing`,
                action: 'Adjust affirmative/negative/question ratios to target 60/20/20 distribution'
            });
        }
        
        return recommendations;
    }

    /**
     * Save reorganization results
     */
    async saveResults() {
        console.log("💾 Saving reorganization results...");
        
        const resultsPath = path.join(BASE_DIR, 'data/reorganization_results.json');
        fs.writeFileSync(resultsPath, JSON.stringify(this.reorganizationResults, null, 2));
        console.log(`✅ Results saved to: ${path.relative(BASE_DIR, resultsPath)}`);
        
        // Also save a summary report
        const summaryPath = path.join(BASE_DIR, 'data/reorganization_summary.md');
        const summaryContent = this.generateSummaryReport();
        fs.writeFileSync(summaryPath, summaryContent);
        console.log(`📊 Summary report saved to: ${path.relative(BASE_DIR, summaryPath)}`);
    }

    /**
     * Generate markdown summary report
     */
    generateSummaryReport() {
        const results = this.reorganizationResults;
        const quality = results.quality_metrics;
        
        return `# DaSi Curriculum Reorganization Summary

## Overview
**Date**: ${results.metadata.created}
**Script**: ${results.metadata.script}
**Canonical Path**: \`${path.relative(BASE_DIR, results.metadata.canonical_path)}\`
**Backup Path**: \`${path.relative(BASE_DIR, results.metadata.backup_path)}\`

## Processing Summary
- **Files Created**: ${results.processing_summary.files_created}
- **Files Updated**: ${results.processing_summary.files_updated}  
- **Sentences Placed**: ${results.processing_summary.sentences_placed}
- **Backup Files**: ${results.processing_summary.backup_files}

## Quality Metrics
- **Total Stages**: ${quality.total_stages}
- **Completion Rate**: ${quality.completion_rate}%
- **Complete Stages** (50+ sentences): ${quality.completion_stats.complete}
- **Incomplete Stages**: ${quality.completion_stats.incomplete}
- **Missing Stages**: ${quality.completion_stats.missing}

## Form Distribution Analysis
- **Total Affirmative**: ${quality.form_distribution_analysis.total_forms.aff}
- **Total Negative**: ${quality.form_distribution_analysis.total_forms.neg}  
- **Total Questions**: ${quality.form_distribution_analysis.total_forms.wh_q}
- **Stages with Good Distribution**: ${quality.form_distribution_analysis.stages_with_good_distribution}
- **Stages Needing Balance**: ${quality.form_distribution_analysis.stages_needing_balance.length}

## Recommendations
${quality.recommendations.map(rec => 
  `### ${rec.type} (Priority: ${rec.priority})
**Issue**: ${rec.message}
**Action**: ${rec.action}
`).join('\n')}

## Next Steps
1. Review incomplete stages and generate missing sentences
2. Balance form distributions where needed
3. Validate grammar sequential learning compliance
4. Run quality assurance tests
5. Deploy to production environment

---
*Generated by DaSi Curriculum Reorganization System v2.2.0*
`;
    }
}

// Run reorganization if called directly
if (require.main === module) {
    const reorganizer = new FileReorganizer();
    reorganizer.reorganizeFiles().catch(error => {
        console.error("💥 Reorganization failed:", error);
        process.exit(1);
    });
}

module.exports = FileReorganizer;
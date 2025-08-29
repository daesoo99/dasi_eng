#!/usr/bin/env node

/**
 * DaSi Curriculum Reorganization - Sentence Extraction Script
 * Phase 2: Collect all sentence data from scattered locations
 * 
 * This script extracts English sentences from:
 * - web_app/public/patterns/banks/
 * - data/banks/
 * - patterns/ folder  
 * - backups/ folder patterns
 * - .md documentation files
 */

const fs = require('fs');
const path = require('path');

const BASE_DIR = path.resolve(__dirname, '..');

class SentenceExtractor {
    constructor() {
        this.extractedSentences = {
            metadata: {
                version: "1.0.0",
                created: new Date().toISOString(),
                script: "extract-all-sentences.js",
                description: "All extracted English sentences from DaSi platform"
            },
            sources: {
                banks_files: [],
                pattern_files: [],
                markdown_files: [],
                backup_files: []
            },
            sentences: [],
            statistics: {
                total_sentences: 0,
                by_source: {},
                by_level: {},
                by_form: {},
                duplicates_found: 0
            }
        };

        this.seenSentences = new Set(); // For duplicate detection
    }

    /**
     * Main extraction method
     */
    async extractAll() {
        console.log("🚀 Starting sentence extraction...");
        
        try {
            // Extract from banks files
            await this.extractFromBanks();
            
            // Extract from pattern definition files
            await this.extractFromPatterns();
            
            // Extract from markdown files
            await this.extractFromMarkdown();
            
            // Extract from backup files
            await this.extractFromBackups();
            
            // Generate statistics
            this.generateStatistics();
            
            // Save results
            await this.saveResults();
            
            console.log("✅ Extraction complete!");
            console.log(`📊 Total sentences extracted: ${this.extractedSentences.statistics.total_sentences}`);
            
        } catch (error) {
            console.error("❌ Extraction failed:", error);
            throw error;
        }
    }

    /**
     * Extract sentences from banks files
     */
    async extractFromBanks() {
        console.log("📁 Extracting from banks files...");
        
        const banksPaths = [
            path.join(BASE_DIR, 'web_app/public/patterns/banks'),
            path.join(BASE_DIR, 'data/banks')
        ];

        for (const banksPath of banksPaths) {
            if (fs.existsSync(banksPath)) {
                await this.traverseDirectory(banksPath, 'banks_files');
            }
        }
    }

    /**
     * Extract sentences from pattern definition files
     */
    async extractFromPatterns() {
        console.log("📁 Extracting from pattern files...");
        
        const patternsPath = path.join(BASE_DIR, 'patterns');
        if (fs.existsSync(patternsPath)) {
            await this.traverseDirectory(patternsPath, 'pattern_files');
        }
    }

    /**
     * Extract sentences from markdown files
     */
    async extractFromMarkdown() {
        console.log("📁 Extracting from markdown files...");
        
        const docsPath = path.join(BASE_DIR, 'docs');
        if (fs.existsSync(docsPath)) {
            await this.traverseDirectory(docsPath, 'markdown_files', ['.md']);
        }
    }

    /**
     * Extract sentences from backup files
     */
    async extractFromBackups() {
        console.log("📁 Extracting from backup files...");
        
        const backupsPath = path.join(BASE_DIR, 'backups');
        if (fs.existsSync(backupsPath)) {
            await this.traverseDirectory(backupsPath, 'backup_files');
        }
    }

    /**
     * Recursively traverse directory and process files
     */
    async traverseDirectory(dirPath, sourceType, fileExtensions = ['.json', '.md']) {
        try {
            const items = fs.readdirSync(dirPath);
            
            for (const item of items) {
                const fullPath = path.join(dirPath, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    await this.traverseDirectory(fullPath, sourceType, fileExtensions);
                } else {
                    const ext = path.extname(item);
                    if (fileExtensions.includes(ext)) {
                        await this.processFile(fullPath, sourceType);
                    }
                }
            }
        } catch (error) {
            console.warn(`⚠️  Unable to access directory: ${dirPath}`, error.message);
        }
    }

    /**
     * Process individual file and extract sentences
     */
    async processFile(filePath, sourceType) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const relativePath = path.relative(BASE_DIR, filePath);
            
            console.log(`  📄 Processing: ${relativePath}`);
            
            this.extractedSentences.sources[sourceType].push(relativePath);
            
            const sentences = this.extractSentencesFromContent(content, filePath);
            
            sentences.forEach(sentence => {
                sentence.source_file = relativePath;
                sentence.source_type = sourceType;
                sentence.extracted_at = new Date().toISOString();
                
                // Check for duplicates
                const sentenceKey = this.normalizeSentence(sentence.english);
                if (this.seenSentences.has(sentenceKey)) {
                    this.extractedSentences.statistics.duplicates_found++;
                    sentence.is_duplicate = true;
                } else {
                    this.seenSentences.add(sentenceKey);
                    sentence.is_duplicate = false;
                }
                
                this.extractedSentences.sentences.push(sentence);
            });
            
        } catch (error) {
            console.warn(`⚠️  Error processing file ${filePath}:`, error.message);
        }
    }

    /**
     * Extract sentences from file content based on file type
     */
    extractSentencesFromContent(content, filePath) {
        const sentences = [];
        const ext = path.extname(filePath);
        
        if (ext === '.json') {
            sentences.push(...this.extractFromJSON(content, filePath));
        } else if (ext === '.md') {
            sentences.push(...this.extractFromMarkdown(content, filePath));
        }
        
        return sentences;
    }

    /**
     * Extract sentences from JSON files
     */
    extractFromJSON(content, filePath) {
        const sentences = [];
        
        try {
            const data = JSON.parse(content);
            
            // Handle different JSON structures
            if (data.sentences && Array.isArray(data.sentences)) {
                // Standard bank file format
                data.sentences.forEach((item, index) => {
                    if (item.en && item.kr) {
                        sentences.push({
                            id: item.id || `${data.stage_id || 'unknown'}-${index + 1}`,
                            english: item.en,
                            korean: item.kr,
                            form: item.form || 'unknown',
                            stage_id: data.stage_id || this.extractStageFromPath(filePath),
                            level: this.extractLevelFromStageId(data.stage_id || this.extractStageFromPath(filePath))
                        });
                    }
                });
            } else if (data.coreExpressions && Array.isArray(data.coreExpressions)) {
                // Pattern definition format
                data.coreExpressions.forEach((item, index) => {
                    if (item.english && item.korean) {
                        sentences.push({
                            id: `pattern-${index + 1}`,
                            english: item.english,
                            korean: item.korean,
                            form: 'aff', // Assume affirmative for pattern examples
                            stage_id: data.stageId || 'unknown',
                            level: this.extractLevelFromStageId(data.stageId || 'unknown'),
                            grammar_point: item.grammarPoint
                        });
                    }
                });
            } else if (data.phases && Array.isArray(data.phases)) {
                // Phase system format
                data.phases.forEach(phase => {
                    if (phase.stages && Array.isArray(phase.stages)) {
                        phase.stages.forEach(stage => {
                            if (stage.coreExpressions && Array.isArray(stage.coreExpressions)) {
                                stage.coreExpressions.forEach((item, index) => {
                                    if (item.english && item.korean) {
                                        sentences.push({
                                            id: `${stage.stageId}-${index + 1}`,
                                            english: item.english,
                                            korean: item.korean,
                                            form: 'aff',
                                            stage_id: stage.stageId,
                                            level: data.levelInfo ? data.levelInfo.level : 1,
                                            grammar_point: item.grammarPoint
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            }
            
        } catch (error) {
            console.warn(`⚠️  Invalid JSON in ${filePath}:`, error.message);
        }
        
        return sentences;
    }

    /**
     * Extract sentences from Markdown files (basic English sentence detection)
     */
    extractFromMarkdown(content, filePath) {
        const sentences = [];
        
        // Simple regex to find English sentences in markdown
        // Look for sentences in quotes, code blocks, or after "en:" patterns
        const patterns = [
            /"([^"]*[a-zA-Z]+[^"]*)"/g,  // Quoted sentences
            /`([^`]*[a-zA-Z]+[^`]*)`/g,   // Code block sentences
            /en:\s*"?([^"\n]*[a-zA-Z]+[^"\n]*)"?/gi,  // "en:" patterns
            /english:\s*"?([^"\n]*[a-zA-Z]+[^"\n]*)"?/gi  // "english:" patterns
        ];
        
        patterns.forEach((pattern, patternIndex) => {
            let match;
            let sentenceIndex = 0;
            while ((match = pattern.exec(content)) !== null) {
                const englishText = match[1].trim();
                if (this.isValidEnglishSentence(englishText)) {
                    sentences.push({
                        id: `md-p${patternIndex}-${sentenceIndex++}`,
                        english: englishText,
                        korean: '',
                        form: 'unknown',
                        stage_id: 'markdown-extracted',
                        level: 0,
                        extraction_pattern: `pattern_${patternIndex}`
                    });
                }
            }
        });
        
        return sentences;
    }

    /**
     * Check if text is a valid English sentence
     */
    isValidEnglishSentence(text) {
        // Basic validation for English sentences
        return text.length > 3 && 
               text.length < 200 &&
               /[a-zA-Z]/.test(text) &&
               !/(function|const|let|var|if|for|while|class)/i.test(text) && // Exclude code
               !/^[0-9\s\-_]+$/.test(text); // Exclude pure numbers/symbols
    }

    /**
     * Extract stage ID from file path
     */
    extractStageFromPath(filePath) {
        const match = filePath.match(/[Ll]v?\d+-[PAD]\d+-S\d+/);
        return match ? match[0] : 'unknown';
    }

    /**
     * Extract level number from stage ID
     */
    extractLevelFromStageId(stageId) {
        const match = stageId.match(/[Ll]v?(\d+)/);
        return match ? parseInt(match[1]) : 0;
    }

    /**
     * Normalize sentence for duplicate detection
     */
    normalizeSentence(sentence) {
        return sentence.toLowerCase()
                      .replace(/[^\w\s]/g, '')  // Remove punctuation
                      .replace(/\s+/g, ' ')     // Normalize whitespace
                      .trim();
    }

    /**
     * Generate extraction statistics
     */
    generateStatistics() {
        console.log("📊 Generating statistics...");
        
        const stats = this.extractedSentences.statistics;
        stats.total_sentences = this.extractedSentences.sentences.length;
        
        // Statistics by source
        this.extractedSentences.sentences.forEach(sentence => {
            stats.by_source[sentence.source_type] = (stats.by_source[sentence.source_type] || 0) + 1;
            stats.by_level[sentence.level] = (stats.by_level[sentence.level] || 0) + 1;
            stats.by_form[sentence.form] = (stats.by_form[sentence.form] || 0) + 1;
        });
    }

    /**
     * Save extraction results
     */
    async saveResults() {
        console.log("💾 Saving results...");
        
        const outputPath = path.join(BASE_DIR, 'data/extracted_sentences.json');
        const unassignedPath = path.join(BASE_DIR, 'data/unassigned_sentences.json');
        
        // Ensure data directory exists
        const dataDir = path.dirname(outputPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        // Save all extracted sentences
        fs.writeFileSync(outputPath, JSON.stringify(this.extractedSentences, null, 2));
        console.log(`✅ All sentences saved to: ${path.relative(BASE_DIR, outputPath)}`);
        
        // Create unassigned sentences file (sentences without proper stage assignment)
        const unassignedSentences = this.extractedSentences.sentences.filter(s => 
            s.stage_id === 'unknown' || 
            s.stage_id === 'markdown-extracted' ||
            s.level === 0
        );
        
        const unassignedData = {
            metadata: {
                version: "1.0.0",
                created: new Date().toISOString(),
                description: "Sentences that need manual stage assignment"
            },
            sentences: unassignedSentences,
            count: unassignedSentences.length
        };
        
        fs.writeFileSync(unassignedPath, JSON.stringify(unassignedData, null, 2));
        console.log(`📋 Unassigned sentences saved to: ${path.relative(BASE_DIR, unassignedPath)}`);
        console.log(`   Unassigned count: ${unassignedSentences.length}`);
    }
}

// Run extraction if called directly
if (require.main === module) {
    const extractor = new SentenceExtractor();
    extractor.extractAll().catch(error => {
        console.error("💥 Extraction failed:", error);
        process.exit(1);
    });
}

module.exports = SentenceExtractor;
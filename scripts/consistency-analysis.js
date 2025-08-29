#!/usr/bin/env node

/**
 * 🔍 Consistency Analysis Loop
 * Automated detection of duplication, omissions, and regressions
 * as emphasized in DC (Development Consistency) best practices
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ConsistencyAnalyzer {
  constructor(config = {}) {
    this.config = {
      // Directories to analyze
      sourceDirs: ['web_app/src', 'backend/src'],
      // File patterns to include
      includePatterns: [/\.(ts|tsx|js|jsx)$/],
      // File patterns to exclude
      excludePatterns: [/node_modules/, /\.d\.ts$/, /\.test\.(ts|js)$/, /\.spec\.(ts|js)$/],
      // Analysis thresholds
      duplicateThreshold: 0.85, // 85% similarity for duplication detection
      complexityThreshold: 15,   // Cyclomatic complexity threshold
      lengthThreshold: 100,      // Function length threshold
      // Output configuration
      outputFile: 'consistency-analysis-report.json',
      exitOnIssues: false,       // Whether to exit with error code
      ...config
    };
    
    this.results = {
      timestamp: new Date().toISOString(),
      issues: [],
      metrics: {
        totalFiles: 0,
        duplicates: 0,
        omissions: 0,
        regressions: 0,
        complexityViolations: 0
      },
      suggestions: []
    };
  }

  /**
   * 🎯 Main analysis entry point
   */
  async analyze() {
    console.log('🔍 Starting Consistency Analysis...');
    
    try {
      // ✅ Step 1: Gather all source files
      const allFiles = await this.gatherSourceFiles();
      this.results.metrics.totalFiles = allFiles.length;
      console.log(`📁 Found ${allFiles.length} source files to analyze`);

      // ✅ Step 2: Analyze code duplication
      await this.analyzeDuplication(allFiles);

      // ✅ Step 3: Detect missing implementations (omissions)
      await this.detectOmissions(allFiles);

      // ✅ Step 4: Check for regressions
      await this.checkRegressions(allFiles);

      // ✅ Step 5: Analyze code complexity
      await this.analyzeComplexity(allFiles);

      // ✅ Step 6: Generate suggestions
      this.generateSuggestions();

      // ✅ Step 7: Output results
      await this.outputResults();

      console.log('✅ Consistency analysis completed');
      return this.results;

    } catch (error) {
      console.error('❌ Consistency analysis failed:', error);
      throw error;
    }
  }

  /**
   * 📁 Gather all source files for analysis
   */
  async gatherSourceFiles() {
    const allFiles = [];

    for (const sourceDir of this.config.sourceDirs) {
      if (!fs.existsSync(sourceDir)) {
        console.warn(`⚠️  Source directory not found: ${sourceDir}`);
        continue;
      }

      const files = this.walkDirectory(sourceDir);
      allFiles.push(...files);
    }

    return allFiles.filter(file => {
      // Apply include patterns
      const includeMatch = this.config.includePatterns.some(pattern => pattern.test(file));
      if (!includeMatch) return false;

      // Apply exclude patterns
      const excludeMatch = this.config.excludePatterns.some(pattern => pattern.test(file));
      return !excludeMatch;
    });
  }

  /**
   * 🚶 Walk directory recursively
   */
  walkDirectory(dir) {
    const files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        files.push(...this.walkDirectory(fullPath));
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * 🔍 Analyze code duplication
   */
  async analyzeDuplication(files) {
    console.log('🔍 Analyzing code duplication...');
    
    const fileContents = {};
    const functionHashes = new Map();
    
    // Read all files and extract functions
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        fileContents[file] = content;
        
        // Extract functions/methods using simple regex patterns
        const functions = this.extractFunctions(content, file);
        
        for (const func of functions) {
          const hash = this.generateFunctionHash(func.body);
          
          if (functionHashes.has(hash)) {
            // Found potential duplicate
            const existing = functionHashes.get(hash);
            const similarity = this.calculateSimilarity(existing.body, func.body);
            
            if (similarity >= this.config.duplicateThreshold) {
              this.results.issues.push({
                type: 'duplication',
                severity: 'medium',
                message: `Duplicate function detected`,
                files: [existing.file, func.file],
                functions: [existing.name, func.name],
                similarity: similarity,
                lines: [existing.lineNumber, func.lineNumber]
              });
              this.results.metrics.duplicates++;
            }
          } else {
            functionHashes.set(hash, func);
          }
        }
      } catch (error) {
        console.warn(`⚠️  Could not analyze file ${file}:`, error.message);
      }
    }

    console.log(`📊 Found ${this.results.metrics.duplicates} duplicate code blocks`);
  }

  /**
   * 🔨 Extract functions from source code
   */
  extractFunctions(content, file) {
    const functions = [];
    
    // TypeScript/JavaScript function patterns
    const patterns = [
      // Regular functions: function name() {}
      /function\s+(\w+)\s*\([^)]*\)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g,
      // Arrow functions: const name = () => {}
      /const\s+(\w+)\s*=\s*\([^)]*\)\s*=>\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g,
      // Method definitions: methodName() {}
      /(\w+)\s*\([^)]*\)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g
    ];

    let lineNumber = 1;
    const lines = content.split('\n');

    for (const pattern of patterns) {
      let match;
      pattern.lastIndex = 0; // Reset regex
      
      while ((match = pattern.exec(content)) !== null) {
        const functionStart = content.substring(0, match.index);
        const functionLineNumber = functionStart.split('\n').length;
        
        functions.push({
          name: match[1],
          body: match[2] || match[0],
          file: file,
          lineNumber: functionLineNumber,
          fullMatch: match[0]
        });
      }
    }

    return functions;
  }

  /**
   * 🎯 Generate hash for function body
   */
  generateFunctionHash(functionBody) {
    // Normalize function body for comparison
    const normalized = functionBody
      .replace(/\s+/g, ' ')           // Normalize whitespace
      .replace(/\/\/.*$/gm, '')       // Remove comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .toLowerCase()
      .trim();
    
    return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16);
  }

  /**
   * 📐 Calculate similarity between two code blocks
   */
  calculateSimilarity(text1, text2) {
    // Simple Levenshtein distance-based similarity
    const distance = this.levenshteinDistance(text1, text2);
    const maxLength = Math.max(text1.length, text2.length);
    return maxLength === 0 ? 1 : 1 - (distance / maxLength);
  }

  /**
   * 📏 Calculate Levenshtein distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * 🔍 Detect missing implementations (omissions)
   */
  async detectOmissions(files) {
    console.log('🔍 Detecting missing implementations...');
    
    const interfaces = new Map();
    const implementations = new Map();
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // Find interface definitions
        const interfaceMatches = content.matchAll(/interface\s+(\w+)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g);
        for (const match of interfaceMatches) {
          const interfaceName = match[1];
          const methods = this.extractInterfaceMethods(match[2]);
          interfaces.set(interfaceName, { file, methods });
        }
        
        // Find class implementations
        const classMatches = content.matchAll(/class\s+(\w+)\s+implements\s+([^{]+)\{/g);
        for (const match of classMatches) {
          const className = match[1];
          const implementedInterfaces = match[2].split(',').map(i => i.trim());
          const classMethods = this.extractClassMethods(content, match.index);
          
          implementations.set(className, {
            file,
            interfaces: implementedInterfaces,
            methods: classMethods
          });
        }
      } catch (error) {
        console.warn(`⚠️  Could not analyze omissions in ${file}:`, error.message);
      }
    }
    
    // Check for missing method implementations
    for (const [className, impl] of implementations) {
      for (const interfaceName of impl.interfaces) {
        if (interfaces.has(interfaceName)) {
          const requiredMethods = interfaces.get(interfaceName).methods;
          const implementedMethods = impl.methods.map(m => m.name);
          
          for (const requiredMethod of requiredMethods) {
            if (!implementedMethods.includes(requiredMethod.name)) {
              this.results.issues.push({
                type: 'omission',
                severity: 'high',
                message: `Missing method implementation: ${requiredMethod.name}`,
                class: className,
                interface: interfaceName,
                method: requiredMethod.name,
                file: impl.file
              });
              this.results.metrics.omissions++;
            }
          }
        }
      }
    }

    console.log(`📊 Found ${this.results.metrics.omissions} missing implementations`);
  }

  /**
   * 🔧 Extract methods from interface definition
   */
  extractInterfaceMethods(interfaceBody) {
    const methods = [];
    const methodMatches = interfaceBody.matchAll(/(\w+)\s*\([^)]*\)\s*:?[^;,}]*/g);
    
    for (const match of methodMatches) {
      methods.push({
        name: match[1],
        signature: match[0].trim()
      });
    }
    
    return methods;
  }

  /**
   * 🏗️ Extract methods from class implementation
   */
  extractClassMethods(content, classStart) {
    const methods = [];
    // This is a simplified extraction - in practice, you'd want more robust parsing
    const methodMatches = content.matchAll(/(\w+)\s*\([^)]*\)\s*\{/g);
    
    for (const match of methodMatches) {
      if (match.index > classStart) {
        methods.push({
          name: match[1],
          signature: match[0]
        });
      }
    }
    
    return methods;
  }

  /**
   * 📊 Check for regressions
   */
  async checkRegressions(files) {
    console.log('🔍 Checking for regressions...');
    
    // Load previous analysis results if available
    const previousResultsFile = 'previous-consistency-analysis.json';
    let previousResults = null;
    
    if (fs.existsSync(previousResultsFile)) {
      try {
        previousResults = JSON.parse(fs.readFileSync(previousResultsFile, 'utf8'));
      } catch (error) {
        console.warn('⚠️  Could not load previous analysis results');
      }
    }
    
    if (!previousResults) {
      console.log('📝 No previous results found - creating baseline');
      return;
    }
    
    // Compare current metrics with previous
    const currentMetrics = this.results.metrics;
    const previousMetrics = previousResults.metrics;
    
    // Check for regression in duplicates
    if (currentMetrics.duplicates > previousMetrics.duplicates) {
      const increase = currentMetrics.duplicates - previousMetrics.duplicates;
      this.results.issues.push({
        type: 'regression',
        severity: 'high',
        message: `Code duplication increased by ${increase} instances`,
        current: currentMetrics.duplicates,
        previous: previousMetrics.duplicates,
        delta: increase
      });
      this.results.metrics.regressions++;
    }
    
    // Check for regression in omissions
    if (currentMetrics.omissions > previousMetrics.omissions) {
      const increase = currentMetrics.omissions - previousMetrics.omissions;
      this.results.issues.push({
        type: 'regression',
        severity: 'critical',
        message: `Missing implementations increased by ${increase} instances`,
        current: currentMetrics.omissions,
        previous: previousMetrics.omissions,
        delta: increase
      });
      this.results.metrics.regressions++;
    }

    console.log(`📊 Found ${this.results.metrics.regressions} regressions`);
  }

  /**
   * 🔧 Analyze code complexity
   */
  async analyzeComplexity(files) {
    console.log('🔍 Analyzing code complexity...');
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const functions = this.extractFunctions(content, file);
        
        for (const func of functions) {
          // Calculate cyclomatic complexity (simplified)
          const complexity = this.calculateCyclomaticComplexity(func.body);
          const length = func.body.split('\n').length;
          
          if (complexity > this.config.complexityThreshold) {
            this.results.issues.push({
              type: 'complexity',
              severity: 'medium',
              message: `High cyclomatic complexity: ${complexity}`,
              function: func.name,
              file: func.file,
              line: func.lineNumber,
              complexity: complexity,
              threshold: this.config.complexityThreshold
            });
            this.results.metrics.complexityViolations++;
          }
          
          if (length > this.config.lengthThreshold) {
            this.results.issues.push({
              type: 'complexity',
              severity: 'low',
              message: `Function too long: ${length} lines`,
              function: func.name,
              file: func.file,
              line: func.lineNumber,
              length: length,
              threshold: this.config.lengthThreshold
            });
          }
        }
      } catch (error) {
        console.warn(`⚠️  Could not analyze complexity in ${file}:`, error.message);
      }
    }

    console.log(`📊 Found ${this.results.metrics.complexityViolations} complexity violations`);
  }

  /**
   * 🧮 Calculate cyclomatic complexity (simplified)
   */
  calculateCyclomaticComplexity(code) {
    // Count decision points (if, while, for, case, catch, &&, ||)
    const decisionPatterns = [
      /\bif\b/g,
      /\bwhile\b/g,
      /\bfor\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /&&/g,
      /\|\|/g
    ];
    
    let complexity = 1; // Start with 1 for the function itself
    
    for (const pattern of decisionPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }
    
    return complexity;
  }

  /**
   * 💡 Generate actionable suggestions
   */
  generateSuggestions() {
    console.log('💡 Generating suggestions...');
    
    // Group issues by type for better suggestions
    const issuesByType = {};
    for (const issue of this.results.issues) {
      if (!issuesByType[issue.type]) {
        issuesByType[issue.type] = [];
      }
      issuesByType[issue.type].push(issue);
    }
    
    // Generate suggestions based on issue patterns
    if (issuesByType.duplication && issuesByType.duplication.length > 3) {
      this.results.suggestions.push({
        type: 'refactoring',
        priority: 'high',
        title: 'Extract Common Utility Functions',
        description: `Found ${issuesByType.duplication.length} duplicate code blocks. Consider extracting common functionality into utility functions or shared modules.`,
        actionable: true,
        estimatedEffort: 'medium'
      });
    }
    
    if (issuesByType.omission && issuesByType.omission.length > 0) {
      this.results.suggestions.push({
        type: 'implementation',
        priority: 'critical',
        title: 'Complete Interface Implementations',
        description: `Found ${issuesByType.omission.length} missing method implementations. These should be implemented to ensure contracts are fulfilled.`,
        actionable: true,
        estimatedEffort: 'high'
      });
    }
    
    if (issuesByType.complexity && issuesByType.complexity.length > 5) {
      this.results.suggestions.push({
        type: 'refactoring',
        priority: 'medium',
        title: 'Reduce Function Complexity',
        description: `Found ${issuesByType.complexity.length} functions with high complexity. Consider breaking them into smaller, more focused functions.`,
        actionable: true,
        estimatedEffort: 'medium'
      });
    }

    console.log(`💡 Generated ${this.results.suggestions.length} suggestions`);
  }

  /**
   * 📄 Output analysis results
   */
  async outputResults() {
    // Save detailed results to JSON
    fs.writeFileSync(this.config.outputFile, JSON.stringify(this.results, null, 2));
    
    // Save as baseline for next run
    fs.writeFileSync('previous-consistency-analysis.json', JSON.stringify(this.results, null, 2));
    
    // Generate console summary
    console.log('\n📊 Consistency Analysis Summary');
    console.log('=====================================');
    console.log(`📁 Files analyzed: ${this.results.metrics.totalFiles}`);
    console.log(`🔍 Issues found: ${this.results.issues.length}`);
    console.log(`  - Duplications: ${this.results.metrics.duplicates}`);
    console.log(`  - Omissions: ${this.results.metrics.omissions}`);
    console.log(`  - Regressions: ${this.results.metrics.regressions}`);
    console.log(`  - Complexity violations: ${this.results.metrics.complexityViolations}`);
    console.log(`💡 Suggestions: ${this.results.suggestions.length}`);
    
    // Show critical issues
    const criticalIssues = this.results.issues.filter(issue => issue.severity === 'critical');
    if (criticalIssues.length > 0) {
      console.log(`\n🚨 Critical Issues (${criticalIssues.length}):`);
      criticalIssues.forEach(issue => {
        console.log(`  - ${issue.message} (${issue.file})`);
      });
    }
    
    console.log(`\n📄 Detailed report saved to: ${this.config.outputFile}`);
    
    // Exit with error code if configured and issues found
    if (this.config.exitOnIssues && criticalIssues.length > 0) {
      process.exit(1);
    }
  }
}

// ✅ CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const config = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--exit-on-issues':
        config.exitOnIssues = true;
        break;
      case '--output':
        config.outputFile = args[++i];
        break;
      case '--threshold':
        config.duplicateThreshold = parseFloat(args[++i]);
        break;
      case '--complexity':
        config.complexityThreshold = parseInt(args[++i]);
        break;
      case '--help':
        console.log(`
🔍 Consistency Analysis Tool

Usage: node consistency-analysis.js [options]

Options:
  --exit-on-issues     Exit with error code if critical issues found
  --output <file>      Output file for detailed results (default: consistency-analysis-report.json)
  --threshold <num>    Similarity threshold for duplicates (default: 0.85)
  --complexity <num>   Complexity threshold (default: 15)
  --help              Show this help message

Examples:
  node consistency-analysis.js
  node consistency-analysis.js --exit-on-issues --output results.json
        `);
        process.exit(0);
        break;
    }
  }
  
  // Run analysis
  const analyzer = new ConsistencyAnalyzer(config);
  analyzer.analyze().catch(error => {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  });
}

module.exports = ConsistencyAnalyzer;
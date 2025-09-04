/**
 * Level 1 Curriculum Validation Script
 * Validates that all generated sentences follow sequential learning principles
 */

const fs = require('fs').promises;
const path = require('path');

class Level1CurriculumValidator {
  constructor() {
    this.baseDir = path.join(__dirname, '..', 'web_app', 'public', 'patterns', 'banks', 'level_1');
    this.grammarRules = this.loadGrammarRules();
  }

  loadGrammarRules() {
    return {
      stage1: ['be_verb_present'],
      stage2: ['be_verb_present', 'simple_present'],
      stage3: ['be_verb_present', 'simple_present', 'simple_past'],
      stage4: ['be_verb_present', 'simple_present', 'simple_past', 'will_future'],
      stage5: ['be_verb_present', 'simple_present', 'simple_past', 'will_future', 'negation_basic'],
      stage6: ['be_verb_present', 'simple_present', 'simple_past', 'will_future', 'negation_basic', 'questions_yes_no'],
      stage7: ['be_verb_present', 'simple_present', 'simple_past', 'will_future', 'negation_basic', 'questions_yes_no', 'questions_wh_basic'],
      stage8: ['be_verb_present', 'simple_present', 'simple_past', 'will_future', 'negation_basic', 'questions_yes_no', 'questions_wh_basic', 'imperatives'],
      stage9: ['be_verb_present', 'simple_present', 'simple_past', 'will_future', 'negation_basic', 'questions_yes_no', 'questions_wh_basic', 'imperatives', 'personal_pronouns'],
      stage10: ['be_verb_present', 'simple_present', 'simple_past', 'will_future', 'negation_basic', 'questions_yes_no', 'questions_wh_basic', 'imperatives', 'personal_pronouns', 'basic_adjectives'],
      stage11: ['be_verb_present', 'simple_present', 'simple_past', 'will_future', 'negation_basic', 'questions_yes_no', 'questions_wh_basic', 'imperatives', 'personal_pronouns', 'basic_adjectives', 'prepositions_place_basic'],
      stage12: ['be_verb_present', 'simple_present', 'simple_past', 'will_future', 'negation_basic', 'questions_yes_no', 'questions_wh_basic', 'imperatives', 'personal_pronouns', 'basic_adjectives', 'prepositions_place_basic', 'prepositions_time_basic'],
      stage13: ['be_verb_present', 'simple_present', 'simple_past', 'will_future', 'negation_basic', 'questions_yes_no', 'questions_wh_basic', 'imperatives', 'personal_pronouns', 'basic_adjectives', 'prepositions_place_basic', 'prepositions_time_basic', 'there_is_are'],
      stage14: ['be_verb_present', 'simple_present', 'simple_past', 'will_future', 'negation_basic', 'questions_yes_no', 'questions_wh_basic', 'imperatives', 'personal_pronouns', 'basic_adjectives', 'prepositions_place_basic', 'prepositions_time_basic', 'there_is_are', 'greeting_expressions'],
      stage15: ['be_verb_present', 'simple_present', 'simple_past', 'will_future', 'negation_basic', 'questions_yes_no', 'questions_wh_basic', 'imperatives', 'personal_pronouns', 'basic_adjectives', 'prepositions_place_basic', 'prepositions_time_basic', 'there_is_are', 'greeting_expressions', 'thanks_apologies'],
      stage16: ['be_verb_present', 'simple_present', 'simple_past', 'will_future', 'negation_basic', 'questions_yes_no', 'questions_wh_basic', 'imperatives', 'personal_pronouns', 'basic_adjectives', 'prepositions_place_basic', 'prepositions_time_basic', 'there_is_are', 'greeting_expressions', 'thanks_apologies', 'basic_responses']
    };
  }

  async loadBankFile(stageNumber) {
    const phaseNumber = Math.ceil(stageNumber / 4);
    const filename = `Lv1-P${phaseNumber}-S${stageNumber.toString().padStart(2, '0')}_bank.json`;
    const filepath = path.join(this.baseDir, filename);
    
    try {
      const content = await fs.readFile(filepath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`Failed to load ${filename}:`, error.message);
      return null;
    }
  }

  validateSentenceGrammar(sentence, allowedGrammar, stageNumber) {
    const issues = [];
    const en = sentence.en.toLowerCase();

    // Check for forbidden advanced grammar
    const forbiddenPatterns = {
      'present_continuous': [/\b(am|is|are)\s+\w+ing\b/, /\bcurrently\b/, /\bright now\b/],
      'past_continuous': [/\b(was|were)\s+\w+ing\b/],
      'present_perfect': [/\bhave\s+(been|done|gone|seen|had)\b/, /\bhas\s+(been|done|gone|seen|had)\b/],
      'passive_voice': [/\b(was|were|is|are|am)\s+\w+ed\s+by\b/, /\bbe\s+\w+ed\b/],
      'conditional': [/\bif\s+.*would\b/, /\bwould.*if\b/],
      'relative_clauses': [/\b(who|which|that)\s+\w+\s+(is|are|was|were)\b/],
      'gerunds_infinitives': [/\blike\s+\w+ing\b/, /\bwant\s+to\s+\w+\b/],
      'modal_verbs': [/\b(can|could|may|might|must|should|would)\b/]
    };

    // Only check for patterns not allowed at this stage
    for (const [pattern, regexes] of Object.entries(forbiddenPatterns)) {
      if (!allowedGrammar.includes(pattern.toLowerCase())) {
        for (const regex of regexes) {
          if (regex.test(en)) {
            issues.push(`Uses forbidden grammar: ${pattern}`);
          }
        }
      }
    }

    // Word count validation (max 8 words for Level 1)
    const wordCount = sentence.en.split(/\s+/).length;
    if (wordCount > 8) {
      issues.push(`Exceeds word limit: ${wordCount} words (max 8 for Level 1)`);
    }

    // Check for incomplete templates
    if (sentence.en.includes('{') || sentence.en.includes('}')) {
      issues.push('Contains unfilled template placeholders');
    }

    return issues;
  }

  validateFormDistribution(bankData) {
    const { forms_distribution, count } = bankData;
    const issues = [];

    // Expected distribution: 60% aff, 20% neg, 20% int/wh_q
    const expectedAff = Math.round(count * 0.6);
    const expectedNeg = Math.round(count * 0.2);
    const expectedInt = count - expectedAff - expectedNeg;

    const totalInt = (forms_distribution.int || 0) + (forms_distribution.wh_q || 0);
    
    // Allow some tolerance (+/- 3)
    const tolerance = 3;
    
    if (Math.abs(forms_distribution.aff - expectedAff) > tolerance) {
      issues.push(`Affirmative form distribution off: expected ~${expectedAff}, got ${forms_distribution.aff}`);
    }
    
    if (Math.abs(forms_distribution.neg - expectedNeg) > tolerance) {
      issues.push(`Negative form distribution off: expected ~${expectedNeg}, got ${forms_distribution.neg}`);
    }
    
    if (Math.abs(totalInt - expectedInt) > tolerance) {
      issues.push(`Interrogative form distribution off: expected ~${expectedInt}, got ${totalInt}`);
    }

    return issues;
  }

  validateKoreanTranslations(bankData) {
    const issues = [];
    let problematicCount = 0;
    
    for (const sentence of bankData.sentences) {
      const { kr, en } = sentence;
      
      // Check for common Korean translation issues
      if (kr.includes('나는') && kr.includes('그는')) {
        problematicCount++;
      }
      if (kr.includes('[한국어]') || kr.includes('[한국어 번역]')) {
        problematicCount++;
      }
      if (kr.includes('아니요t') || kr.includes('w나는ll')) {
        problematicCount++;
      }
      if (kr === en) {
        problematicCount++;
      }
    }

    const problematicRatio = problematicCount / bankData.sentences.length;
    if (problematicRatio > 0.1) {
      issues.push(`High ratio of problematic Korean translations: ${Math.round(problematicRatio * 100)}%`);
    }

    return issues;
  }

  async validateStage(stageNumber) {
    console.log(`Validating Stage ${stageNumber}...`);
    
    const bankData = await this.loadBankFile(stageNumber);
    if (!bankData) {
      return { stage: stageNumber, valid: false, issues: ['Bank file not found or invalid'] };
    }

    const allowedGrammar = this.grammarRules[`stage${stageNumber}`] || [];
    const issues = [];

    // Basic metadata validation
    if (bankData.count !== 50) {
      issues.push(`Expected 50 sentences, got ${bankData.count}`);
    }

    if (!bankData.sentences || bankData.sentences.length === 0) {
      issues.push('No sentences found');
      return { stage: stageNumber, valid: false, issues };
    }

    // Form distribution validation
    issues.push(...this.validateFormDistribution(bankData));

    // Korean translation validation
    issues.push(...this.validateKoreanTranslations(bankData));

    // Individual sentence validation
    let sentenceIssues = 0;
    for (const sentence of bankData.sentences) {
      const sentenceValidation = this.validateSentenceGrammar(sentence, allowedGrammar, stageNumber);
      sentenceIssues += sentenceValidation.length;
    }

    if (sentenceIssues > 0) {
      issues.push(`${sentenceIssues} sentence-level issues found`);
    }

    // Sequential learning validation
    if (bankData.metadata && bankData.metadata.allowed_grammar) {
      const declaredGrammar = bankData.metadata.allowed_grammar;
      const missingGrammar = allowedGrammar.filter(g => !declaredGrammar.includes(g));
      const extraGrammar = declaredGrammar.filter(g => !allowedGrammar.includes(g));
      
      if (missingGrammar.length > 0) {
        issues.push(`Missing declared grammar: ${missingGrammar.join(', ')}`);
      }
      if (extraGrammar.length > 0) {
        issues.push(`Extra declared grammar: ${extraGrammar.join(', ')}`);
      }
    }

    return {
      stage: stageNumber,
      valid: issues.length === 0,
      issues: issues,
      sentenceCount: bankData.sentences.length,
      formsDistribution: bankData.forms_distribution
    };
  }

  async validateAllStages() {
    console.log('🔍 Validating Level 1 Curriculum (Stages 1-16)...\n');
    
    const results = [];
    
    // Include stage 1 for completeness
    for (let stage = 1; stage <= 16; stage++) {
      const result = await this.validateStage(stage);
      results.push(result);
    }

    // Generate summary
    const valid = results.filter(r => r.valid);
    const invalid = results.filter(r => !r.valid);

    console.log('\n' + '='.repeat(60));
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Valid stages: ${valid.length}/16`);
    console.log(`❌ Invalid stages: ${invalid.length}/16`);
    
    if (invalid.length > 0) {
      console.log('\n🚨 Issues found:');
      for (const result of invalid) {
        console.log(`\nStage ${result.stage}:`);
        result.issues.forEach(issue => console.log(`  • ${issue}`));
      }
    }

    // Form distribution summary
    console.log('\n📈 Form Distribution Overview:');
    console.log('Stage\tAff\tNeg\tInt\tTotal');
    console.log('-'.repeat(40));
    for (const result of results) {
      if (result.formsDistribution) {
        const { aff, neg, wh_q = 0, int = 0 } = result.formsDistribution;
        const totalInt = wh_q + int;
        console.log(`${result.stage.toString().padStart(2)}\t${aff}\t${neg}\t${totalInt}\t${result.sentenceCount}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(valid.length === 16 ? 
      '🎉 All stages pass validation! Sequential learning principles maintained.' : 
      '⚠️  Some issues found. Please review and fix before deployment.'
    );
    
    return results;
  }
}

module.exports = Level1CurriculumValidator;

// CLI execution
if (require.main === module) {
  const validator = new Level1CurriculumValidator();
  validator.validateAllStages()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Validation failed:', error);
      process.exit(1);
    });
}
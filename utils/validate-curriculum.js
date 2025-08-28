#!/usr/bin/env node
/**
 * 커리큘럼 데이터 검증 CLI 도구
 * Usage: node utils/validate-curriculum.js [directory] [options]
 */

const SchemaValidator = require('./schema-validator');
const fs = require('fs');
const path = require('path');

class CurriculumValidator {
  constructor() {
    this.validator = new SchemaValidator('./schemas');
  }

  /**
   * CLI 실행
   */
  async run() {
    const args = process.argv.slice(2);
    const options = this.parseArgs(args);

    if (!options.quiet) {
      console.log('🚀 DASI 커리큘럼 데이터 검증기 v1.0.0');
      console.log('='.repeat(50));
    }

    try {
      let results;
      
      if (options.file) {
        if (!options.quiet) console.log(`📄 단일 파일 검증: ${options.file}`);
        results = [this.validator.validateLevelFile(options.file)];
      } else if (options.glob) {
        if (!options.quiet) console.log(`🔍 Glob 패턴 검증: ${options.glob}`);
        const globResults = this.validator.validateGlobPattern(options.glob, options.quiet);
        results = globResults.results;
      } else {
        if (!options.quiet) console.log(`📂 디렉토리 검증: ${options.directory}`);
        const dirResults = this.validator.validateDirectory(options.directory, options.quiet);
        results = dirResults.results;
        
        if (!options.quiet) {
          console.log(`\n📊 검증 요약:`);
          console.log(`   총 파일: ${dirResults.totalFiles}`);
          console.log(`   통과: ${dirResults.validFiles} ✅`);
          console.log(`   실패: ${dirResults.invalidFiles} ❌`);
        }
      }

      // 상세 결과 출력
      if (options.verbose) {
        this.printDetailedResults(results);
      }

      // JSON 결과 저장
      if (options.output) {
        this.saveResults(results, options.output);
      }

      // 수정 제안
      if (options.suggest) {
        this.generateSuggestions(results);
      }

      // 실패한 파일이 있으면 exit code 1
      const hasFailures = results.some(r => !r.valid);
      const hasWarnings = results.some(r => r.consistencyCheck?.warnings?.length > 0);
      
      if (options.strict && (hasFailures || hasWarnings)) {
        if (!options.quiet) console.error('❌ Strict 모드: 경고 또는 오류로 인해 실패');
        process.exit(1);
      } else if (hasFailures) {
        if (!options.quiet) console.error('❌ 검증 오류 발생');
        process.exit(1);
      } else {
        if (!options.quiet) console.log('✅ 모든 검증 통과');
        process.exit(0);
      }

    } catch (error) {
      console.error('❌ 검증 실패:', error.message);
      process.exit(1);
    }
  }

  /**
   * 명령행 인자를 파싱합니다
   */
  parseArgs(args) {
    const options = {
      directory: './patterns',
      file: null,
      glob: null,
      verbose: false,
      output: null,
      suggest: false,
      fix: false,
      strict: false,
      quiet: false
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === '--file' || arg === '-f') {
        options.file = args[++i];
      } else if (arg === '--glob' || arg === '-g') {
        options.glob = args[++i];
      } else if (arg === '--verbose' || arg === '-v') {
        options.verbose = true;
      } else if (arg === '--output' || arg === '-o') {
        options.output = args[++i];
      } else if (arg === '--suggest' || arg === '-s') {
        options.suggest = true;
      } else if (arg === '--fix') {
        options.fix = true;
      } else if (arg === '--strict') {
        options.strict = true;
      } else if (arg === '--quiet' || arg === '-q') {
        options.quiet = true;
      } else if (arg === '--help' || arg === '-h') {
        this.printHelp();
        process.exit(0);
      } else if (!arg.startsWith('-')) {
        options.directory = arg;
      }
    }

    return options;
  }

  /**
   * 상세 결과를 출력합니다
   */
  printDetailedResults(results) {
    console.log('\n📋 상세 검증 결과:');
    console.log('='.repeat(50));

    for (const result of results) {
      const fileName = path.basename(result.file);
      console.log(`\n📄 ${fileName}:`);
      
      if (result.valid) {
        console.log('   ✅ 검증 통과');
        
        if (result.consistencyCheck?.statistics) {
          const stats = result.consistencyCheck.statistics;
          console.log(`   📊 통계: ${stats.totalPhases}개 단계, ${stats.totalStages}개 스테이지, ${stats.totalExpressions}개 표현`);
          console.log(`   ⏱️  예상 학습시간: ${stats.calculatedHours}시간`);
        }

        if (result.consistencyCheck?.warnings?.length > 0) {
          console.log('   ⚠️  경고:');
          result.consistencyCheck.warnings.forEach(warning => {
            console.log(`      • ${warning}`);
          });
        }
      } else {
        console.log('   ❌ 검증 실패');
        
        if (result.summary?.issues) {
          result.summary.issues.forEach(issue => {
            console.log(`      • ${issue}`);
          });
        }

        if (result.schemaValidation?.summary) {
          console.log('   🔍 스키마 오류:');
          result.schemaValidation.summary.slice(0, 5).forEach(error => {
            console.log(`      • ${error.path}: ${error.message}`);
          });
          
          if (result.schemaValidation.summary.length > 5) {
            console.log(`      ... 및 ${result.schemaValidation.summary.length - 5}개 추가 오류`);
          }
        }

        if (result.error) {
          console.log(`   💥 파싱 오류: ${result.error}`);
        }

        if (result.type) {
          console.log(`   🔍 오류 유형: ${result.type}`);
        }
      }
    }
  }

  /**
   * 결과를 JSON 파일로 저장합니다
   */
  saveResults(results, outputPath) {
    try {
      const report = {
        timestamp: new Date().toISOString(),
        summary: {
          totalFiles: results.length,
          validFiles: results.filter(r => r.valid).length,
          invalidFiles: results.filter(r => !r.valid).length
        },
        results: results.map(r => ({
          file: r.file,
          valid: r.valid,
          issues: r.summary?.issues || [],
          warnings: r.summary?.warnings || [],
          statistics: r.consistencyCheck?.statistics
        }))
      };

      fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
      console.log(`\n💾 검증 결과 저장: ${outputPath}`);
    } catch (error) {
      console.error('결과 저장 실패:', error.message);
    }
  }

  /**
   * 수정 제안을 생성합니다
   */
  generateSuggestions(results) {
    console.log('\n💡 수정 제안:');
    console.log('='.repeat(50));

    const suggestions = new Set();

    for (const result of results) {
      if (!result.valid) {
        // 공통 문제들에 대한 제안
        if (result.summary?.issues?.some(issue => issue.includes('version'))) {
          suggestions.add('• 모든 데이터 파일에 version 필드를 추가하세요 (예: "version": "1.0.0")');
        }

        if (result.summary?.issues?.some(issue => issue.includes('totalPhases'))) {
          suggestions.add('• levelInfo의 totalPhases와 실제 phases 배열 길이를 일치시키세요');
        }

        if (result.summary?.issues?.some(issue => issue.includes('totalStages'))) {
          suggestions.add('• levelInfo의 totalStages와 모든 단계의 스테이지 합계를 일치시키세요');
        }

        if (result.schemaValidation?.errors) {
          const requiredErrors = result.schemaValidation.errors.filter(e => 
            e.keyword === 'required'
          );
          
          if (requiredErrors.length > 0) {
            suggestions.add('• 필수 필드가 누락되었습니다. 스키마 정의를 확인하세요');
          }
        }
      }
    }

    if (suggestions.size === 0) {
      console.log('   🎉 모든 파일이 정상입니다!');
    } else {
      [...suggestions].forEach(suggestion => console.log(suggestion));
    }
  }

  /**
   * 도움말을 출력합니다
   */
  printHelp() {
    console.log(`
📚 DASI 커리큘럼 검증기 도움말

사용법:
  node utils/validate-curriculum.js [옵션] [디렉토리]

옵션:
  -f, --file <파일>      단일 파일 검증
  -g, --glob <패턴>      Glob 패턴으로 파일 검증 (예: "patterns/**/*.json")
  -v, --verbose          상세 결과 출력
  -o, --output <파일>    결과를 JSON 파일로 저장
  -s, --suggest          수정 제안 표시
  --strict               경고도 오류로 취급
  --quiet                최소한의 출력
  --fix                  자동 수정 (개발 중)
  -h, --help             이 도움말 표시

예시:
  node utils/validate-curriculum.js
  node utils/validate-curriculum.js ./patterns -v
  node utils/validate-curriculum.js -f level1.json --suggest
  node utils/validate-curriculum.js --glob "patterns/**/*.json" --strict
  node utils/validate-curriculum.js -o validation-report.json
    `);
  }
}

// CLI로 실행된 경우
if (require.main === module) {
  const validator = new CurriculumValidator();
  validator.run().catch(console.error);
}

module.exports = CurriculumValidator;
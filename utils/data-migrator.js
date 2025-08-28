#!/usr/bin/env node
/**
 * Data Migration Tool for DASI Curriculum Files
 * Fixes schema validation issues and updates data format
 */

const fs = require('fs');
const path = require('path');

class DataMigrator {
  constructor() {
    this.migrations = {
      '1.0.0': this.migrateTo1_0_0.bind(this)
    };
  }

  /**
   * CLI 실행
   */
  async run() {
    const args = process.argv.slice(2);
    const options = this.parseArgs(args);

    console.log('🔄 DASI 데이터 마이그레이션 도구 v1.0.0');
    console.log('='.repeat(50));

    try {
      if (options.file) {
        const mode = options.dryRun ? '드라이런' : '라이브';
        console.log(`📄 단일 파일 마이그레이션 (${mode}): ${options.file}`);
        await this.migrateFile(options.file, options.targetVersion, options);
      } else {
        console.log(`📂 디렉토리 마이그레이션: ${options.directory}`);
        await this.migrateDirectory(options.directory, options.targetVersion, options);
      }

      console.log('✅ 마이그레이션 완료!');
    } catch (error) {
      console.error('❌ 마이그레이션 실패:', error.message);
      process.exit(1);
    }
  }

  /**
   * 명령행 인자 파싱
   */
  parseArgs(args) {
    const options = {
      directory: './patterns',
      file: null,
      targetVersion: '1.0.0',
      backup: true,
      dryRun: false,
      output: null,
      force: false
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === '--file' || arg === '-f') {
        options.file = args[++i];
      } else if (arg === '--version' || arg === '-v') {
        options.targetVersion = args[++i];
      } else if (arg === '--output' || arg === '-o') {
        options.output = args[++i];
      } else if (arg === '--dry-run') {
        options.dryRun = true;
      } else if (arg === '--no-backup') {
        options.backup = false;
      } else if (arg === '--force' || arg === '-y') {
        options.force = true;
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
   * 단일 파일 마이그레이션
   */
  async migrateFile(filePath, targetVersion, options = {}) {
    try {
      console.log(`🔍 분석 중: ${filePath}`);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // 마이그레이션 실행
      const migratedData = await this.applyMigration(data, targetVersion);
      
      // 출력 파일 결정
      const outputPath = options.output || filePath;
      
      if (options.dryRun) {
        console.log(`🔄 드라이런 모드: ${outputPath}`);
        fs.writeFileSync(outputPath, JSON.stringify(migratedData, null, 2));
        console.log(`📄 임시 결과 생성: ${outputPath}`);
      } else {
        // 백업 생성 (원본을 덮어쓸 때만)
        if (outputPath === filePath && options.backup !== false) {
          const backupPath = filePath + '.backup';
          fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
          console.log(`💾 백업 생성: ${backupPath}`);
        }
        
        // 마이그레이션된 데이터 저장
        fs.writeFileSync(outputPath, JSON.stringify(migratedData, null, 2));
        console.log(`✅ 마이그레이션 완료: ${outputPath}`);
      }
      
      return migratedData;
    } catch (error) {
      console.error(`❌ 파일 마이그레이션 실패: ${filePath}`, error.message);
      throw error;
    }
  }

  /**
   * 디렉토리 마이그레이션
   */
  async migrateDirectory(dirPath, targetVersion, options = {}) {
    const files = fs.readdirSync(dirPath, { recursive: true })
      .filter(file => file.endsWith('.json'))
      .map(file => path.join(dirPath, file));

    console.log(`📊 발견된 파일: ${files.length}개`);

    for (const file of files) {
      try {
        await this.migrateFile(file, targetVersion, options);
      } catch (error) {
        console.warn(`⚠️  파일 건너뜀: ${file} - ${error.message}`);
        if (!options.force) {
          throw error;
        }
      }
    }
  }

  /**
   * 마이그레이션 적용
   */
  async applyMigration(data, targetVersion) {
    const migration = this.migrations[targetVersion];
    if (!migration) {
      throw new Error(`지원하지 않는 버전: ${targetVersion}`);
    }

    return migration(data);
  }

  /**
   * 1.0.0 버전으로 마이그레이션
   */
  migrateTo1_0_0(data) {
    const migratedData = { ...data };

    // 1. levelInfo에 version 필드 추가
    if (!migratedData.levelInfo.version) {
      migratedData.levelInfo.version = '1.0.0';
    }

    // 2. levelInfo에 targetCEFR 필드 추가 (레벨에 따라)
    if (!migratedData.levelInfo.targetCEFR) {
      const level = migratedData.levelInfo.level;
      const cefrMap = {
        1: 'A1', 2: 'A1', 3: 'A2', 4: 'A2', 5: 'B1',
        6: 'B1', 7: 'B2', 8: 'B2', 9: 'C1', 10: 'C2'
      };
      migratedData.levelInfo.targetCEFR = cefrMap[level] || 'A1';
    }

    // 3. phases에 필수 필드 추가
    if (migratedData.phases) {
      migratedData.phases = migratedData.phases.map((phase, phaseIndex) => {
        const updatedPhase = { ...phase };

        // version 필드 추가
        if (!updatedPhase.version) {
          updatedPhase.version = '1.0.0';
        }

        // learningObjectives 추가
        if (!updatedPhase.learningObjectives) {
          updatedPhase.learningObjectives = [
            `${updatedPhase.phaseTitle}의 핵심 개념 습득`,
            `실제 상황에서 응용 가능한 실력 개발`
          ];
        }

        // estimatedHours 추가
        if (!updatedPhase.estimatedHours) {
          updatedPhase.estimatedHours = updatedPhase.stages ? 
            Math.round(updatedPhase.stages.length * 2.5 * 10) / 10 : 10;
        }

        // difficultyLevel 추가
        if (!updatedPhase.difficultyLevel) {
          updatedPhase.difficultyLevel = Math.min(10, migratedData.levelInfo.level + 1);
        }

        // stages 처리
        if (updatedPhase.stages) {
          updatedPhase.stages = updatedPhase.stages.map(stage => {
            // 스키마에서 허용하는 stage 필드만 추출
            const allowedStageFields = {
              stageId: stage.stageId,
              stageTitle: stage.stageTitle,
              description: stage.description,
              grammarFocus: stage.grammarFocus,
              keyPatterns: stage.keyPatterns
            };

            // version 필드 추가
            allowedStageFields.version = stage.version || '1.0.0';

            // 선택 필드들 추가
            if (stage.estimatedMinutes !== undefined) {
              allowedStageFields.estimatedMinutes = stage.estimatedMinutes;
            } else {
              allowedStageFields.estimatedMinutes = 30; // 기본값
            }

            if (stage.targetAccuracy !== undefined) {
              allowedStageFields.targetAccuracy = stage.targetAccuracy;
            }

            if (stage.prerequisites && Array.isArray(stage.prerequisites)) {
              allowedStageFields.prerequisites = stage.prerequisites;
            }

            // coreExpressions 처리
            if (stage.coreExpressions) {
              allowedStageFields.coreExpressions = stage.coreExpressions.map(expr => {
                // 스키마에서 허용하는 필드만 추출
                const allowedFields = {
                  english: expr.english,
                  korean: expr.korean,
                  phoneticKorean: expr.phoneticKorean,
                  grammarPoint: expr.grammarPoint
                };

                // version 필드 추가
                allowedFields.version = expr.version || '1.0.0';

                // difficulty 필드 추가 (선택사항)
                if (expr.difficulty !== undefined) {
                  allowedFields.difficulty = Math.min(5, Math.max(1, expr.difficulty));
                } else {
                  allowedFields.difficulty = 1; // 기본 난이도
                }

                // IPA 필드 추가 (있는 경우)
                if (expr.ipa) {
                  allowedFields.ipa = expr.ipa;
                }

                return allowedFields;
              });
            }

            return allowedStageFields;
          });
        }

        return updatedPhase;
      });
    }

    // 4. metadata 필드 추가
    if (!migratedData.metadata) {
      migratedData.metadata = {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: "DASI System",
        tags: ["beginner"],
        changeLog: [
          {
            version: "1.0.0",
            date: new Date().toISOString().split('T')[0],
            changes: ["스키마 호환성을 위한 필드 추가", "데이터 구조 표준화"]
          }
        ]
      };
    }

    // 5. validation 필드 추가 (체크섬은 마지막에 계산)
    if (!migratedData.validation) {
      migratedData.validation = {
        schemaVersion: "1.0.0",
        validatedAt: new Date().toISOString()
      };
    }
    
    // 체크섬은 validation 필드를 제외하고 계산
    const dataForChecksum = { ...migratedData };
    delete dataForChecksum.validation;
    migratedData.validation.checksum = this.calculateChecksum(dataForChecksum);

    console.log(`✨ 마이그레이션 적용: ${migratedData.phases?.length || 0}개 단계, ${migratedData.phases?.reduce((sum, p) => sum + (p.stages?.length || 0), 0) || 0}개 스테이지 처리됨`);

    return migratedData;
  }

  /**
   * 스키마 호환 체크섬 계산 (64자)
   */
  calculateChecksum(data) {
    const crypto = require('crypto');
    const jsonString = JSON.stringify(data, null, 0);
    return crypto.createHash('sha256').update(jsonString).digest('hex');
  }

  /**
   * 도움말 출력
   */
  printHelp() {
    console.log(`
📚 DASI 데이터 마이그레이션 도구 도움말

사용법:
  node utils/data-migrator.js [옵션] [디렉토리]

옵션:
  -f, --file <파일>        단일 파일 마이그레이션
  -v, --version <버전>     목표 버전 (기본값: 1.0.0)
  --no-backup              백업 생성 안함
  -h, --help               이 도움말 표시

예시:
  node utils/data-migrator.js
  node utils/data-migrator.js ./patterns -v 1.0.0
  node utils/data-migrator.js -f level1.json
    `);
  }
}

// CLI로 실행된 경우
if (require.main === module) {
  const migrator = new DataMigrator();
  migrator.run().catch(console.error);
}

module.exports = DataMigrator;
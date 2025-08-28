/**
 * JSON Schema Validator for DASI Curriculum Data
 * 커리큘럼 데이터 무결성 검증 및 버전 관리
 */

const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const semver = require('semver');

class SchemaValidator {
  constructor(schemasDir = './schemas') {
    this.schemasDir = schemasDir;
    this.ajv = new Ajv({ 
      allErrors: true,
      verbose: true,
      strict: true,
      loadSchema: this.loadSchema.bind(this)
    });
    
    // 날짜/시간 포맷 추가
    addFormats(this.ajv);
    
    // 커스텀 키워드 추가
    this.addCustomKeywords();
    
    // 스키마 로드
    this.schemas = {};
    this.loadAllSchemas();
    
    // 버전 설정 로드
    this.versionConfig = this.loadVersionConfig();
  }

  /**
   * 모든 스키마 파일을 로드합니다
   */
  loadAllSchemas() {
    const schemaFiles = [
      'core-expression.schema.json',
      'stage.schema.json', 
      'phase.schema.json',
      'level.schema.json'
    ];

    schemaFiles.forEach(filename => {
      try {
        const schemaPath = path.join(this.schemasDir, filename);
        const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
        const schemaName = filename.replace('.schema.json', '');
        
        this.schemas[schemaName] = schema;
        this.ajv.addSchema(schema, schemaName);
        
        console.log(`✅ 스키마 로드 완료: ${schemaName}`);
      } catch (error) {
        console.error(`❌ 스키마 로드 실패: ${filename}`, error.message);
      }
    });
  }

  /**
   * 외부 스키마 참조를 로드합니다
   */
  async loadSchema(uri) {
    try {
      const filename = path.basename(uri);
      const schemaPath = path.join(this.schemasDir, filename);
      const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
      return schema;
    } catch (error) {
      throw new Error(`Schema not found: ${uri}`);
    }
  }

  /**
   * 커스텀 검증 키워드를 추가합니다
   */
  addCustomKeywords() {
    // 한국어 텍스트 검증
    this.ajv.addKeyword({
      keyword: 'koreanText',
      type: 'string',
      schemaType: 'boolean',
      compile: (schemaValue) => {
        return function validate(data) {
          if (!schemaValue) return true;
          // 한글이 포함되어 있는지 검사
          return /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(data);
        };
      }
    });

    // 영어 텍스트 검증
    this.ajv.addKeyword({
      keyword: 'englishText',
      type: 'string',
      schemaType: 'boolean',
      compile: (schemaValue) => {
        return function validate(data) {
          if (!schemaValue) return true;
          // 기본 영어 문자와 구두점만 허용
          return /^[a-zA-Z\s.,!?'"()-]+$/.test(data);
        };
      }
    });

    // Semantic Version 검증
    this.ajv.addKeyword({
      keyword: 'semver',
      type: 'string',
      schemaType: 'boolean',
      compile: (schemaValue) => {
        return function validate(data) {
          if (!schemaValue) return true;
          return semver.valid(data) !== null;
        };
      }
    });
  }

  /**
   * 버전 설정을 로드합니다
   */
  loadVersionConfig() {
    try {
      const configPath = path.join(this.schemasDir, 'version-config.json');
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      console.warn('버전 설정 파일을 찾을 수 없습니다:', error.message);
      return {
        currentVersion: '1.0.0',
        supportedVersions: [{ version: '1.0.0', status: 'stable' }]
      };
    }
  }

  /**
   * 데이터 파일의 스키마를 검증합니다
   */
  validateData(data, schemaName) {
    const validate = this.ajv.getSchema(schemaName);
    
    if (!validate) {
      throw new Error(`스키마를 찾을 수 없습니다: ${schemaName}`);
    }

    const valid = validate(data);
    
    if (!valid) {
      return {
        valid: false,
        errors: validate.errors,
        summary: this.formatErrors(validate.errors)
      };
    }

    return {
      valid: true,
      checksum: this.calculateChecksum(data),
      validatedAt: new Date().toISOString()
    };
  }

  /**
   * 버전 호환성을 확인합니다
   */
  checkVersionCompatibility(dataVersion, targetVersion = null) {
    const target = targetVersion || this.versionConfig.currentVersion;
    
    const supportedVersions = this.versionConfig.compatibility.api[target] || [];
    const isCompatible = supportedVersions.includes(dataVersion);
    
    const migrationPath = this.versionConfig.migrationPaths.find(
      path => path.from === dataVersion && path.to === target
    );

    return {
      compatible: isCompatible,
      dataVersion,
      targetVersion: target,
      migrationAvailable: !!migrationPath,
      migrationPath: migrationPath || null,
      recommendedAction: this.getRecommendedAction(isCompatible, migrationPath)
    };
  }

  /**
   * 권장 액션을 결정합니다
   */
  getRecommendedAction(isCompatible, migrationPath) {
    if (isCompatible) {
      return 'none';
    }
    
    if (migrationPath) {
      return migrationPath.automatic ? 'auto_migrate' : 'manual_migrate';
    }
    
    return 'update_required';
  }

  /**
   * 레벨 파일을 검증합니다
   */
  validateLevelFile(filePath) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // 레벨 스키마 검증
      const levelValidation = this.validateData(data, 'level');
      
      if (!levelValidation.valid) {
        return {
          file: filePath,
          valid: false,
          type: 'schema_error',
          schemaValidation: levelValidation,
          summary: {
            issues: ['스키마 검증 실패'],
            warnings: []
          }
        };
      }

      // 버전 호환성 확인
      const dataVersion = data.levelInfo?.version;
      if (!dataVersion) {
        return {
          file: filePath,
          valid: false,
          type: 'version_missing',
          errors: ['version field is required in levelInfo']
        };
      }

      const versionCheck = this.checkVersionCompatibility(dataVersion);
      
      // 내부 일관성 검증
      const consistencyCheck = this.validateInternalConsistency(data);

      return {
        file: filePath,
        valid: levelValidation.valid && versionCheck.compatible && consistencyCheck.valid,
        schemaValidation: levelValidation,
        versionCompatibility: versionCheck,
        consistencyCheck: consistencyCheck,
        summary: this.generateValidationSummary(levelValidation, versionCheck, consistencyCheck)
      };

    } catch (error) {
      return {
        file: filePath,
        valid: false,
        type: 'parse_error',
        error: error.message
      };
    }
  }

  /**
   * 내부 데이터 일관성을 검증합니다
   */
  validateInternalConsistency(levelData) {
    const errors = [];
    const warnings = [];

    // 레벨 정보와 실제 데이터 일치 확인
    const { levelInfo, phases } = levelData;
    
    if (phases.length !== levelInfo.totalPhases) {
      errors.push(`totalPhases mismatch: expected ${levelInfo.totalPhases}, got ${phases.length}`);
    }

    // 총 스테이지 수 확인
    const totalStages = phases.reduce((sum, phase) => sum + phase.stages.length, 0);
    if (totalStages !== levelInfo.totalStages) {
      errors.push(`totalStages mismatch: expected ${levelInfo.totalStages}, got ${totalStages}`);
    }

    // 단계 ID 중복 확인
    const phaseIds = phases.map(p => p.phaseId);
    const duplicatePhaseIds = phaseIds.filter((id, index) => phaseIds.indexOf(id) !== index);
    if (duplicatePhaseIds.length > 0) {
      errors.push(`Duplicate phase IDs: ${duplicatePhaseIds.join(', ')}`);
    }

    // 스테이지 ID 중복 확인
    const stageIds = phases.flatMap(p => p.stages.map(s => s.stageId));
    const duplicateStageIds = stageIds.filter((id, index) => stageIds.indexOf(id) !== index);
    if (duplicateStageIds.length > 0) {
      errors.push(`Duplicate stage IDs: ${duplicateStageIds.join(', ')}`);
    }

    // 예상 시간 일관성 확인
    const calculatedHours = phases.reduce((sum, phase) => {
      return sum + phase.stages.reduce((stageSum, stage) => {
        return stageSum + (stage.estimatedMinutes || 30) / 60;
      }, 0);
    }, 0);

    const hoursDiff = Math.abs(calculatedHours - levelInfo.estimatedHours);
    if (hoursDiff > 2) {
      warnings.push(`Estimated hours mismatch: level says ${levelInfo.estimatedHours}h, calculated ${calculatedHours.toFixed(1)}h`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      statistics: {
        totalPhases: phases.length,
        totalStages,
        totalExpressions: phases.reduce((sum, p) => 
          sum + p.stages.reduce((stageSum, s) => stageSum + s.coreExpressions.length, 0), 0),
        calculatedHours: Math.round(calculatedHours * 10) / 10
      }
    };
  }

  /**
   * 에러 메시지를 포맷팅합니다
   */
  formatErrors(errors) {
    return errors.map(error => ({
      path: error.instancePath || error.dataPath || 'root',
      message: error.message,
      value: error.data,
      constraint: error.params
    }));
  }

  /**
   * 검증 요약을 생성합니다
   */
  generateValidationSummary(schema, version, consistency) {
    const issues = [];
    const warnings = [];

    if (!schema.valid) {
      issues.push(`스키마 검증 실패: ${schema.errors.length}개 오류`);
    }

    if (!version.compatible) {
      issues.push(`버전 호환성 문제: ${version.dataVersion} → ${version.targetVersion}`);
    }

    if (!consistency.valid) {
      issues.push(`데이터 일관성 문제: ${consistency.errors.length}개 오류`);
    }

    if (consistency.warnings) {
      warnings.push(...consistency.warnings);
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
      statistics: consistency.statistics
    };
  }

  /**
   * 데이터 체크섬을 계산합니다
   */
  calculateChecksum(data) {
    const jsonString = JSON.stringify(data, null, 0);
    return crypto.createHash('sha256').update(jsonString).digest('hex');
  }

  /**
   * Glob 패턴으로 파일들을 검증합니다 (순수 Node.js, 교차 플랫폼)
   */
  validateGlobPattern(pattern, quiet = false) {
    const results = [];
    
    try {
      // Glob 패턴을 Node.js 방식으로 처리 (교차 플랫폼 안전)
      const files = this.expandGlobPattern(pattern);
      
      for (const file of files) {
        if (!quiet) console.log(`🔍 검증 중: ${file}`);
        const result = this.validateLevelFile(file);
        results.push(result);
        
        if (!quiet) {
          if (result.valid) {
            console.log(`✅ 통과: ${path.basename(file)}`);
          } else {
            console.log(`❌ 실패: ${path.basename(file)} - ${result.summary?.issues?.join(', ')}`);
          }
        }
      }
    } catch (error) {
      console.error('Glob 패턴 처리 실패:', error.message);
    }

    return {
      totalFiles: results.length,
      validFiles: results.filter(r => r.valid).length,
      invalidFiles: results.filter(r => !r.valid).length,
      results
    };
  }

  /**
   * Glob 패턴을 순수 Node.js로 확장 (교차 플랫폼 안전)
   */
  expandGlobPattern(pattern) {
    const files = [];
    
    // 간단한 glob 패턴 지원: **/*.json
    if (pattern.includes('**/*.json')) {
      const baseDir = pattern.split('**')[0] || './';
      this.walkDirectory(path.resolve(baseDir), files, '.json');
    } else if (pattern.includes('*.json')) {
      const baseDir = path.dirname(pattern);
      const dirFiles = fs.readdirSync(baseDir);
      for (const file of dirFiles) {
        if (file.endsWith('.json')) {
          files.push(path.join(baseDir, file));
        }
      }
    } else {
      // 단일 파일 또는 디렉토리
      if (fs.existsSync(pattern)) {
        const stat = fs.statSync(pattern);
        if (stat.isFile() && pattern.endsWith('.json')) {
          files.push(pattern);
        } else if (stat.isDirectory()) {
          this.walkDirectory(pattern, files, '.json');
        }
      }
    }
    
    return files;
  }

  /**
   * 디렉토리를 재귀적으로 탐색 (순수 Node.js)
   */
  walkDirectory(dir, files, extension) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          this.walkDirectory(fullPath, files, extension);
        } else if (entry.isFile() && entry.name.endsWith(extension)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`디렉토리 접근 실패: ${dir} - ${error.message}`);
    }
  }

  /**
   * 디렉토리의 모든 레벨 파일을 검증합니다
   */
  validateDirectory(dir, quiet = false) {
    const results = [];
    
    try {
      const files = [];
      this.walkDirectory(dir, files, '.json');

      for (const file of files) {
        if (!quiet) console.log(`🔍 검증 중: ${file}`);
        const result = this.validateLevelFile(file);
        results.push(result);
        
        if (!quiet) {
          if (result.valid) {
            console.log(`✅ 통과: ${path.basename(file)}`);
          } else {
            console.log(`❌ 실패: ${path.basename(file)} - ${result.summary?.issues?.join(', ')}`);
          }
        }
      }
    } catch (error) {
      console.error('디렉토리 읽기 실패:', error.message);
    }

    return {
      totalFiles: results.length,
      validFiles: results.filter(r => r.valid).length,
      invalidFiles: results.filter(r => !r.valid).length,
      results
    };
  }
}

module.exports = SchemaValidator;
/**
 * Standalone AJV validators for schema validation
 */

const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const fs = require('fs');
const path = require('path');

// AJV 인스턴스 생성
const ajv = new Ajv({ 
  allErrors: true,
  verbose: false,
  strict: false
});
addFormats(ajv);

// 스키마 로드 함수
function loadSchema(schemaName) {
  const schemaPath = path.join(__dirname, '..', '..', 'schemas', `${schemaName}.schema.json`);
  return JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
}

// 스키마들을 로드하고 컴파일
const schemas = {
  'core-expression': loadSchema('core-expression'),
  'stage': loadSchema('stage'),
  'phase': loadSchema('phase'),
  'level': loadSchema('level')
};

// 검증 함수들 생성
const validateCoreExpression = ajv.compile(schemas['core-expression']);
const validateStage = ajv.compile(schemas['stage']);
const validatePhase = ajv.compile(schemas['phase']);
const validateLevel = ajv.compile(schemas['level']);

module.exports = {
  validateCoreExpression,
  validateStage,
  validatePhase,
  validateLevel,
  schemas
};
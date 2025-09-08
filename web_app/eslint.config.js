import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  // 테스트 파일 및 빌드 파일 제외
  {
    ignores: [
      '**/__tests__/**',
      '**/*.test.*',
      '**/*.spec.*',
      'dist/**',
      'node_modules/**',
      'build/**'
    ]
  },
  // 메인 린팅 설정
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
        // Speech Recognition API
        webkitSpeechRecognition: 'readonly',
        SpeechRecognition: 'readonly',
        // Node.js globals
        process: 'readonly',
        require: 'readonly',
        NodeJS: 'readonly',
      },
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // 경고로 낮춰서 빌드 중단 방지
      '@typescript-eslint/no-unused-vars': [
        'warn', 
        { 
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true
        }
      ],
      'no-unused-vars': 'off',
      'no-undef': 'warn',
      
      // React 관련 규칙
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      
      // 실용적 규칙들
      'no-console': 'off',
      'no-debugger': 'warn',
    },
  },
];
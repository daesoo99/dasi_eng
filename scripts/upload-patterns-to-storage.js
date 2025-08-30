/**
 * Patterns Data Upload to Firebase Storage
 * 로컬 패턴 데이터를 Firebase Storage로 업로드하는 스크립트
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');

// Firebase Admin 초기화
const serviceAccount = require('../backend/src/config/firebaseServiceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'dasi-english-default-rtdb.appspot.com' // 실제 버킷명으로 변경 필요
});

const bucket = admin.storage().bucket();

class PatternUploader {
  constructor() {
    this.sourceDir = './web_app/public/patterns/banks';
    this.uploadedCount = 0;
    this.failedUploads = [];
  }

  /**
   * 메인 업로드 프로세스
   */
  async uploadAll() {
    console.log('🚀 Starting patterns upload to Firebase Storage...');
    
    try {
      const levels = await this.getLevelDirectories();
      
      for (const level of levels) {
        console.log(`\n📁 Processing ${level}...`);
        await this.uploadLevel(level);
      }
      
      this.printSummary();
    } catch (error) {
      console.error('❌ Upload failed:', error);
      process.exit(1);
    }
  }

  /**
   * 레벨 디렉토리 목록 가져오기
   */
  async getLevelDirectories() {
    const items = await fs.readdir(this.sourceDir);
    return items.filter(item => item.startsWith('level_'));
  }

  /**
   * 특정 레벨의 모든 파일 업로드
   */
  async uploadLevel(levelDir) {
    const levelPath = path.join(this.sourceDir, levelDir);
    const files = await fs.readdir(levelPath);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    console.log(`  📊 Found ${jsonFiles.length} JSON files in ${levelDir}`);
    
    for (const file of jsonFiles) {
      await this.uploadFile(levelDir, file);
    }
  }

  /**
   * 개별 파일 업로드
   */
  async uploadFile(levelDir, fileName) {
    try {
      const localPath = path.join(this.sourceDir, levelDir, fileName);
      const remotePath = `patterns/banks/${levelDir}/${fileName}`;
      
      // 파일 읽기
      const fileContent = await fs.readFile(localPath);
      
      // Firebase Storage에 업로드
      const file = bucket.file(remotePath);
      await file.save(fileContent, {
        metadata: {
          contentType: 'application/json',
          metadata: {
            uploadedAt: new Date().toISOString(),
            originalPath: localPath,
            version: '2.2.0'
          }
        }
      });
      
      // 공개 읽기 권한 설정
      await file.makePublic();
      
      this.uploadedCount++;
      console.log(`  ✅ Uploaded: ${remotePath}`);
      
    } catch (error) {
      console.error(`  ❌ Failed to upload ${fileName}:`, error.message);
      this.failedUploads.push({ levelDir, fileName, error: error.message });
    }
  }

  /**
   * 업로드 결과 요약
   */
  printSummary() {
    console.log(`\n📊 Upload Summary:`);
    console.log(`✅ Successfully uploaded: ${this.uploadedCount} files`);
    console.log(`❌ Failed uploads: ${this.failedUploads.length} files`);
    
    if (this.failedUploads.length > 0) {
      console.log(`\n🚨 Failed files:`);
      this.failedUploads.forEach(({ levelDir, fileName, error }) => {
        console.log(`  - ${levelDir}/${fileName}: ${error}`);
      });
    }
    
    console.log(`\n🎉 Upload process completed!`);
    console.log(`📂 Files are now available at: patterns/banks/level_X/`);
  }

  /**
   * 업로드된 파일 URL 생성
   */
  getPublicUrl(levelDir, fileName) {
    const bucketName = bucket.name;
    return `https://storage.googleapis.com/${bucketName}/patterns/banks/${levelDir}/${fileName}`;
  }
}

// 스크립트 실행
async function main() {
  const uploader = new PatternUploader();
  await uploader.uploadAll();
  process.exit(0);
}

// CLI에서 직접 실행 시
if (require.main === module) {
  main().catch(console.error);
}

module.exports = PatternUploader;
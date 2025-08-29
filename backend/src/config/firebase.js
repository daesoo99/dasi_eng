
const admin = require('firebase-admin');

let db = null;
let auth = null;
let fcm = null;

// Required environment variables validation
const requiredEnvVars = [
    'FIREBASE_SERVICE_ACCOUNT_PATH',
    'FIREBASE_DATABASE_URL'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
    console.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
    console.error('   Please check your .env file configuration');
}

// Firebase 서비스 계정 키 환경변수에서 로드
let serviceAccount = null;
try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        // Option 1: JSON string from environment variable
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        // Option 2: JSON file path from environment variable
        serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    } else {
        throw new Error('No Firebase service account configuration found');
    }
} catch (e) {
    console.log("⚠️  Firebase 서비스 계정 키를 환경변수에서 찾을 수 없습니다.");
    console.log("   개발 모드로 실행합니다. (Firebase 기능 제한)");
    console.log("   Error:", e.message);
}

if (serviceAccount && process.env.FIREBASE_DATABASE_URL) {
    try {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: process.env.FIREBASE_DATABASE_URL,
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        });
        
        db = admin.firestore();
        auth = admin.auth();
        fcm = admin.messaging();
        console.log("✅ Firebase 초기화 완료");
    } catch (error) {
        console.error("❌ Firebase 초기화 실패:", error.message);
    }
} else {
    console.log("🔧 개발 모드: Firebase Mock 객체 사용");
    // Mock objects for development
    db = {
        collection: () => ({
            doc: () => ({
                get: () => Promise.resolve({ exists: false }),
                set: () => Promise.resolve(),
                update: () => Promise.resolve(),
                delete: () => Promise.resolve()
            })
        })
    };
    auth = {
        verifyIdToken: () => Promise.reject(new Error("Firebase not initialized"))
    };
    fcm = {
        send: () => Promise.reject(new Error("Firebase not initialized"))
    };
}

module.exports = { db, auth, fcm, admin };

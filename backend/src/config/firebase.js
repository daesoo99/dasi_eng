
const admin = require('firebase-admin');

let db = null;
let auth = null;
let fcm = null;

// Firebase 서비스 계정 키 파일 확인
let serviceAccount;
try {
    serviceAccount = require('./firebaseServiceAccountKey.json'); 
} catch (e) {
    console.log("⚠️  Firebase 서비스 계정 키 파일을 찾을 수 없습니다.");
    console.log("   개발 모드로 실행합니다. (Firebase 기능 제한)");
}

if (serviceAccount) {
    try {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: 'https://<YOUR-PROJECT-ID>.firebaseio.com'
        });
        
        db = admin.firestore();
        auth = admin.auth();
        fcm = admin.messaging();
        console.log("✅ Firebase 초기화 완료");
    } catch (error) {
        console.error("Firebase 초기화 실패:", error.message);
    }
} else {
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

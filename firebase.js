// 환경 변수 로드
require('dotenv').config();

const admin = require('firebase-admin');

// 환경 변수에서 Firebase 설정 읽기
const serviceAccount = {
  type: process.env.FIREBASE_TYPE || 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY ? 
    process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
  token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
};

// Firebase 초기화 (환경 변수가 설정된 경우에만)
let db, bucket, auth;

if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });

    db = admin.firestore();
    bucket = admin.storage().bucket();
    auth = admin.auth();
    
    console.log('Firebase 초기화 성공');
  } catch (error) {
    console.error('Firebase 초기화 실패:', error.message);
    console.log('Firebase 기능을 사용할 수 없습니다. 로컬 파일 시스템을 사용합니다.');
  }
} else {
  console.log('Firebase 환경 변수가 설정되지 않았습니다. 로컬 파일 시스템을 사용합니다.');
}

module.exports = { admin, db, bucket, auth };
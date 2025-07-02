# Particle Photo Admin

Particle Photo 관리자 페이지 서버

## 🚀 Render.com 배포 가이드

### 1. Render.com 계정 생성 및 로그인
1. [Render.com](https://render.com)에 접속하여 계정을 생성합니다.
2. GitHub 계정으로 로그인하거나 새 계정을 만듭니다.

### 2. GitHub 저장소 연결
1. 이 프로젝트를 GitHub 저장소에 푸시합니다.
2. Render.com 대시보드에서 "New +" 버튼을 클릭합니다.
3. "Web Service"를 선택합니다.
4. GitHub 저장소를 연결하고 이 프로젝트를 선택합니다.

### 3. 서비스 설정
- **Name**: `particle-photo-admin` (또는 원하는 이름)
- **Environment**: `Node`
- **Region**: 가장 가까운 지역 선택
- **Branch**: `main` (또는 기본 브랜치)
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: `Free` (무료 플랜)

### 4. 환경 변수 설정
Render.com 대시보드의 "Environment" 탭에서 다음 환경 변수들을 설정합니다:

#### 필수 환경 변수:
```
NODE_ENV=production
PORT=10000
ALLOWED_ORIGINS=https://your-app-name.onrender.com
```

#### 선택적 환경 변수 (Firebase 사용 시):
```
FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
```

### 5. 배포 실행
1. "Create Web Service" 버튼을 클릭합니다.
2. Render.com이 자동으로 빌드 및 배포를 시작합니다.
3. 배포가 완료되면 제공된 URL로 접속할 수 있습니다.

### 6. 자동 배포 설정
- GitHub 저장소에 코드를 푸시하면 자동으로 재배포됩니다.
- 수동 배포도 대시보드에서 가능합니다.

## 🔧 로컬 개발 환경

### 설치
```bash
npm install
```

### 개발 서버 실행
```bash
npm run dev
```

### 테스트 실행
```bash
npm test
```

## 📁 프로젝트 구조
- `server.js` - Express 서버 메인 파일
- `firebase.js` - Firebase 설정 및 초기화
- `admin.html` - 관리자 페이지
- `index.html` - 메인 페이지
- `images/` - 업로드된 이미지 저장소
- `words.js` - 텍스트 데이터

## 🔒 보안 설정
- CORS 설정으로 허용된 도메인만 접근 가능
- 파일 업로드 시 타입 및 크기 제한
- 환경 변수를 통한 민감한 정보 관리

## 📝 주의사항
- Render.com 무료 플랜은 15분 동안 요청이 없으면 서비스가 슬립 모드로 전환됩니다.
- 첫 요청 시 서비스가 다시 시작되므로 약간의 지연이 있을 수 있습니다.
- 파일 업로드 기능은 Render.com의 임시 파일 시스템을 사용하므로, 서비스 재시작 시 업로드된 파일이 사라질 수 있습니다.
- 영구적인 파일 저장이 필요하다면 Firebase Storage 사용을 권장합니다.

## 프로젝트 소개
- 사진과 인적 정보를 관리하는 웹 기반 관리자 페이지입니다.
- 사진(이미지) 업로드, 이름/조직/직무/직위/이메일 등 정보 추가/수정/삭제, 검색 기능 제공
- people.json 파일과 이미지 파일을 관리하며, 서버 API를 통해 실시간으로 데이터가 반영됩니다.

---

## 주요 기능
- **목록 조회/검색**: 이름, 조직, 직무, 직위, 이메일 등으로 검색
- **항목 추가**: 이미지 업로드 및 정보 입력 후 추가
- **항목 편집**: 정보 및 이미지 교체 가능
- **항목 삭제**: 선택 또는 개별 삭제
- **실시간 반영**: 모든 변경사항이 서버의 people.json 및 images 폴더에 즉시 반영

---

## 폴더 구조
```
particlePhotoEN/
├── admin.html          # 관리자 페이지 (프론트엔드)
├── admin.css           # 관리자 페이지 스타일
├── admin.js            # 관리자 페이지 JS
├── server.js           # Node.js Express 서버 (API 및 이미지 업로드)
├── images/
│   ├── people.json     # 인적 데이터(JSON)
│   └── *.png           # 인물 사진 이미지 파일
├── index.html          # 메인 페이지
└── ...
```

---

## 🔒 보안 설정 가이드

### 1. 환경 변수 설정 (.env 파일)

프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```bash
# ===========================================
# 서버 설정
# ===========================================
PORT=3000
NODE_ENV=development

# ===========================================
# Firebase 설정 (Firebase 사용 시)
# ===========================================
FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxx%40your-project.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app

# ===========================================
# 데이터베이스 설정 (외부 DB 사용 시)
# ===========================================
DATABASE_URL=your-database-url
DATABASE_USER=your-username
DATABASE_PASSWORD=your-password

# ===========================================
# API 키 (외부 서비스 사용 시)
# ===========================================
API_KEY=your-api-key

# ===========================================
# 보안 설정
# ===========================================
JWT_SECRET=your-jwt-secret-key-here
SESSION_SECRET=your-session-secret-key-here

# ===========================================
# CORS 설정
# ===========================================
ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.com

# ===========================================
# 파일 업로드 설정
# ===========================================
MAX_FILE_SIZE=10
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif
```

#### ✅ **Firebase 서비스 계정 키 환경 변수로 변환하는 방법**

1. **Firebase Console에서 서비스 계정 키(json) 다운로드**
   - [Firebase Console](https://console.firebase.google.com/) → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성 → json 파일 다운로드

2. **json 파일의 각 항목을 .env에 맞게 변환**
   - 예시 json:
     ```json
     {
       "type": "service_account",
       "project_id": "your-project-id",
       "private_key_id": "xxxx",
       "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
       "client_email": "firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com",
       "client_id": "xxx",
       "auth_uri": "https://accounts.google.com/o/oauth2/auth",
       "token_uri": "https://oauth2.googleapis.com/token",
       "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
       "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com"
     }
     ```

   - .env에 아래와 같이 입력:
     ```env
     FIREBASE_TYPE=service_account
     FIREBASE_PROJECT_ID=your-project-id
     FIREBASE_PRIVATE_KEY_ID=xxxx
     FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
     FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
     FIREBASE_CLIENT_ID=xxx
     FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
     FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
     FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
     FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
     FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
     ```
   - **private_key**는 줄바꿈을 반드시 `\n`으로 변환해서 한 줄로 넣어야 합니다.
   - 예시: 여러 줄을 한 줄로 붙이고 줄바꿈은 `\n`으로 대체

3. **.env 파일은 반드시 .gitignore에 추가!**

### 2. Firebase 설정 (선택사항)

Firebase를 사용하는 경우:

1. **Firebase Console에서 서비스 계정 키 생성**
   - [Firebase Console](https://console.firebase.google.com/) 접속
   - 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성
   - 다운로드된 JSON 파일을 `firebase-service-account.json`으로 저장

2. **firebase.js 파일 수정**
   ```javascript
   const admin = require('firebase-admin');
   
   // 환경 변수에서 설정 읽기
   const serviceAccount = {
     type: process.env.FIREBASE_TYPE,
     project_id: process.env.FIREBASE_PROJECT_ID,
     private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
     private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
     client_email: process.env.FIREBASE_CLIENT_EMAIL,
     client_id: process.env.FIREBASE_CLIENT_ID,
     auth_uri: process.env.FIREBASE_AUTH_URI,
     token_uri: process.env.FIREBASE_TOKEN_URI,
     auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
     client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
   };

   admin.initializeApp({
     credential: admin.credential.cert(serviceAccount),
     storageBucket: process.env.FIREBASE_STORAGE_BUCKET
   });
   ```

### 3. CORS 설정

`cors.json` 파일을 생성하여 허용할 도메인을 설정하세요:

```json
[
  {
    "origin": [
      "http://localhost:3000",
      "https://your-domain.com"
    ],
    "method": [
      "GET",
      "POST",
      "PUT",
      "DELETE"
    ],
    "maxAgeSeconds": 3600,
    "responseHeader": [
      "Content-Type",
      "Authorization"
    ]
  }
]
```

### 4. 데이터 파일 설정

#### people.json 샘플 데이터
```json
[
  {
    "koreanName": "홍길동",
    "englishName": "HongGilDong",
    "organization": "개발팀",
    "role": "프론트엔드",
    "position": "주임",
    "email": "hong@company.com",
    "imageFile": "HongGilDong.png"
  }
]
```

### 5. 보안 체크리스트

- [ ] `.env` 파일이 `.gitignore`에 포함되어 있는지 확인
- [ ] `firebase-service-account.json`이 `.gitignore`에 포함되어 있는지 확인
- [ ] 실제 개인 정보가 포함된 `people.json`을 샘플 데이터로 교체
- [ ] CORS 설정에서 허용 도메인을 제한적으로 설정
- [ ] 환경 변수에서 민감한 정보를 관리
- [ ] 프로덕션 환경에서는 HTTPS 사용
- [ ] Firebase 키가 노출되지 않도록 주의
- [ ] API 엔드포인트에 적절한 인증/인가 추가
- [ ] 파일 업로드 시 파일 타입 및 크기 제한 설정
- [ ] 정기적인 보안 업데이트 수행

### 6. 프로덕션 배포 시 보안 고려사항

#### Render 배포 시 환경 변수 설정
1. Render 대시보드에서 프로젝트 선택
2. **Environment** 탭으로 이동
3. **Environment Variables** 섹션에서 다음 변수들을 추가:
   ```
   NODE_ENV=production
   PORT=10000
   JWT_SECRET=your-production-jwt-secret
   SESSION_SECRET=your-production-session-secret
   ALLOWED_ORIGINS=https://your-domain.com
   ```

#### HTTPS 설정
- Render는 자동으로 HTTPS를 제공합니다
- 커스텀 도메인 사용 시 SSL 인증서 설정 필요

#### 데이터 백업
- 정기적으로 `people.json` 파일 백업
- 이미지 파일은 외부 스토리지(AWS S3, Firebase Storage) 사용 권장

### 7. 문제 해결

#### 일반적인 보안 이슈
1. **Firebase 키 노출**: 키가 노출된 경우 즉시 재생성
2. **CORS 오류**: `ALLOWED_ORIGINS`에 올바른 도메인 추가
3. **파일 업로드 실패**: `MAX_FILE_SIZE` 및 `ALLOWED_FILE_TYPES` 확인
4. **환경 변수 로드 실패**: `.env` 파일 경로 및 형식 확인

---

## 로컬 개발 및 실행 방법

1. **보안 설정 파일 생성**
   ```bash
   # .env 파일 생성
   cp .env.example .env
   # .env 파일을 편집하여 실제 값 입력
   ```

2. **의존성 설치**
   ```bash
   npm install
   ```

3. **서버 실행**
   ```bash
   node server.js
   ```

4. **접속**
   - [http://localhost:3000/admin.html](http://localhost:3000/admin.html)

---

## Render 무료 서버 배포 방법

1. **GitHub 저장소에 코드 업로드**
2. [Render.com](https://render.com/) 회원가입 및 로그인
3. **New + → Web Service** 선택, GitHub 저장소 연결
4. **환경 변수 설정**
   - Render 대시보드에서 Environment Variables 추가
   - `.env` 파일의 내용을 키-값 쌍으로 입력
5. **설정**
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Root Directory: (비워두기)
   - Free Plan 선택
6. **배포 주소로 접속**
   - 예시: `https://your-app-name.onrender.com/admin.html`

> **주의:** Render 무료 플랜은 서버 재시작 시 업로드된 이미지 파일(images 폴더)이 사라질 수 있습니다. 영구 저장이 필요하다면 AWS S3 등 외부 스토리지 연동을 권장합니다.

---

## people.json 구조 예시
```json
[
  {
    "koreanName": "홍길동",
    "englishName": "HongGilDong",
    "organization": "개발팀",
    "role": "프론트엔드",
    "position": "주임",
    "email": "hong@company.com",
    "imageFile": "HongGilDong.png"
  },
  ...
]
```

---

## 기타 참고사항
- **이미지 파일**은 반드시 images 폴더에 업로드되어야 합니다.
- **API 경로**: `/api/people` (CRUD)
- **관리자 페이지**: `/admin.html`
- **메인 페이지**: `/index.html`

---

## 문의
- 추가 문의사항은 이슈 또는 PR로 남겨주세요. 
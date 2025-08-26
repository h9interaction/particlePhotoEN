# Particle Photo Admin

Particle Photo 관리자 페이지 서버

## 프로젝트 소개
- 사진과 인적 정보를 관리하는 웹 기반 관리자 페이지입니다.
- 사진(이미지) 업로드, 이름/조직/직무/직위/이메일 등 정보 추가/수정/삭제, 검색 기능 제공
- **운영/배포 환경에서는 모든 데이터와 이미지를 Firebase Firestore/Storage에 저장**하며, 로컬 파일(images/people.json, images/*.png)은 필요하지 않습니다.
- **로컬 개발/테스트 환경에서는 Firebase 환경변수가 없을 때만 images/people.json, images/*.png를 샘플 데이터로 사용**합니다.

---

## 주요 기능
- **목록 조회/검색**: 이름, 조직, 직무, 직위, 이메일 등으로 검색
- **항목 추가**: 이미지 업로드 및 정보 입력 후 추가
- **항목 편집**: 정보 및 이미지 교체 가능
- **항목 삭제**: 선택 또는 개별 삭제
- **실시간 반영**: 모든 변경사항이 서버의 데이터에 즉시 반영

---

## 폴더 구조 (최신 권장)
```
particlePhotoEN/
├── admin.html        # 관리자 페이지 (프론트엔드)
├── admin.css         # 관리자 페이지 스타일
├── admin.js          # 관리자 페이지 JS
├── server.js         # Node.js Express 서버 (API 및 이미지 업로드)
├── firebase.js       # Firebase 연동 설정
├── index.html        # 메인 페이지
├── package.json
├── README.md
└── ... (테스트, 설정, 기타 파일)
```
> 운영/배포 환경에서는 images/people.json, images/*.png 파일 및 폴더가 필요하지 않습니다.
> 로컬 개발/테스트 시에만 샘플 데이터로 존재할 수 있습니다.

---

## 보안 및 환경 변수 설정 가이드

### 1. 환경 변수 설정 (.env 파일)

프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.com
MAX_FILE_SIZE=10
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif

# (Firebase 사용 시)
FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
```

- **private_key**는 줄바꿈을 반드시 `\n`으로 변환해서 한 줄로 넣어야 합니다.
- `.env` 파일은 반드시 `.gitignore`에 추가하세요.

### 2. people.json 샘플 데이터 (로컬 개발/테스트용)
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

---

## 로컬 개발 및 실행 방법

1. **환경 변수 파일 생성**
   ```bash
   cp .env.example .env
   # .env 파일을 편집하여 실제 값 입력
   ```
2. **의존성 설치**
   ```bash
   npm install
   ```
3. **서버 실행**
   ```bash
   npm start
   ```
4. **접속**
   - [http://localhost:3000/admin.html](http://localhost:3000/admin.html)

---

## 기타 참고사항
- **운영/배포 환경에서는 모든 데이터와 이미지를 Firebase에 저장**하며, images/people.json, images/*.png는 필요하지 않습니다.
- **로컬 개발/테스트 환경에서는 Firebase 환경변수가 없을 때만 images/people.json, images/*.png를 사용**합니다.
- **API 경로**: `/api/people` (CRUD)
- **관리자 페이지**: `/admin.html`
- **메인 페이지**: `/index.html`

---

## Railway 배포 가이드

Railway는 Git 기반의 간편한 배포 플랫폼입니다. Firebase와 함께 사용하여 프로덕션 환경에서 안정적으로 서비스를 운영할 수 있습니다.

### 1. 배포 전 준비사항

#### 1-1. package.json 확인
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

#### 1-2. 포트 설정 확인
`server.js`에서 Railway의 동적 포트를 사용하도록 설정:
```javascript
const PORT = process.env.PORT || 3000;
```

### 2. Railway 프로젝트 생성

1. **Railway 계정 생성**: [railway.app](https://railway.app) 가입
2. **GitHub 연결**: GitHub 계정과 연동
3. **새 프로젝트 생성**:
   ```bash
   # Railway CLI 설치 (선택사항)
   npm install -g @railway/cli
   
   # 또는 웹 대시보드에서 GitHub 저장소 연결
   ```

### 3. 환경 변수 설정

Railway 대시보드에서 다음 환경 변수를 설정하세요:

#### 3-1. 기본 서버 설정
```
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://your-app-name.up.railway.app
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,image/webp
```

#### 3-2. Firebase 설정
```
FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
```

### 4. 배포 단계

#### 4-1. Railway CLI 방법
```bash
# Railway CLI 로그인
railway login

# 프로젝트 연결
railway link

# 환경 변수 설정 (CLI에서)
railway variables set NODE_ENV=production
railway variables set FIREBASE_PROJECT_ID=your-project-id
# ... 기타 환경 변수들

# 배포
railway deploy
```

#### 4-2. GitHub 연동 방법 (권장)
1. Railway 대시보드에서 **"Deploy from GitHub"** 선택
2. 저장소 선택 및 권한 승인
3. **Variables** 탭에서 환경 변수 설정
4. **Settings** 탭에서 배포 설정 확인:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Root Directory**: `/` (루트)
5. **Deploy** 버튼 클릭

### 5. 도메인 설정

#### 5-1. 기본 도메인
- Railway에서 자동으로 `https://your-app-name.up.railway.app` 형태의 도메인 제공

#### 5-2. 커스텀 도메인 (선택사항)
1. Railway 대시보드 → **Settings** → **Domains**
2. **Custom Domain** 추가
3. DNS 설정에 CNAME 레코드 추가

### 6. 배포 후 확인사항

#### 6-1. 서비스 상태 확인
```bash
# Railway CLI로 로그 확인
railway logs

# 또는 웹 대시보드에서 **Logs** 탭 확인
```

#### 6-2. 기능 테스트
1. **메인 페이지**: `https://your-app-name.up.railway.app`
2. **관리자 페이지**: `https://your-app-name.up.railway.app/admin.html`
3. **API 테스트**: 
   ```bash
   curl https://your-app-name.up.railway.app/api/people
   ```

#### 6-3. Firebase 연결 확인
- Railway 로그에서 "Firebase 초기화 성공" 메시지 확인
- 관리자 페이지에서 데이터 로드/업로드 테스트

### 7. 트러블슈팅

#### 7-1. 일반적인 문제
```bash
# 포트 관련 오류
Error: EADDRINUSE
해결: Railway는 동적 포트를 사용합니다. server.js에서 process.env.PORT 확인

# Firebase 연결 실패
Error: Firebase initialization failed
해결: 환경 변수 형식 확인, 특히 FIREBASE_PRIVATE_KEY의 개행문자(\n) 확인

# CORS 오류
Access-Control-Allow-Origin
해결: ALLOWED_ORIGINS에 Railway 도메인 추가
```

#### 7-2. 로그 모니터링
```bash
# 실시간 로그 확인
railway logs --follow

# 특정 서비스 로그
railway logs [service-name]
```

### 8. Railway 장점

- **간편한 배포**: Git push만으로 자동 배포
- **무료 플랜**: 월 $5 크레딧 제공 (적당한 트래픽 처리 가능)
- **자동 HTTPS**: SSL 인증서 자동 관리
- **스케일링**: 트래픽에 따른 자동 확장
- **데이터베이스**: PostgreSQL, MySQL, Redis 등 지원
- **모니터링**: 리소스 사용량 및 성능 메트릭 제공

### 9. 비용 참고

- **Starter 플랜**: $5/월 크레딧 (무료)
- **Developer 플랜**: $20/월
- **Team 플랜**: $100/월

자세한 내용은 [Railway 공식 문서](https://docs.railway.app)를 참고하세요.

---

## 문의
- 추가 문의사항은 이슈 또는 PR로 남겨주세요. 
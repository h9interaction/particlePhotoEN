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

## 문의
- 추가 문의사항은 이슈 또는 PR로 남겨주세요. 
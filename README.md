# Particle Photo Admin

Particle Photo 관리자 페이지 서버

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

### 2. people.json 샘플 데이터
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
   npm run dev
   ```
4. **접속**
   - [http://localhost:3000/admin.html](http://localhost:3000/admin.html)

---

## 기타 참고사항
- **이미지 파일**은 반드시 images 폴더에 업로드되어야 합니다.
- **API 경로**: `/api/people` (CRUD)
- **관리자 페이지**: `/admin.html`
- **메인 페이지**: `/index.html`

---

## 문의
- 추가 문의사항은 이슈 또는 PR로 남겨주세요. 
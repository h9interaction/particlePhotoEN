# 🚀 Render.com 배포 체크리스트

## 📋 사전 준비 사항

### 1. GitHub 저장소 준비
- [ ] 프로젝트가 GitHub 저장소에 푸시되어 있는지 확인
- [ ] 모든 파일이 커밋되어 있는지 확인
- [ ] `.gitignore` 파일이 올바르게 설정되어 있는지 확인

### 2. 환경 변수 준비
- [ ] `env.example` 파일을 참고하여 필요한 환경 변수 목록 작성
- [ ] Firebase 사용 시 서비스 계정 키 준비
- [ ] CORS 허용 도메인 목록 준비

## 🔧 Render.com 설정

### 3. Render.com 계정 및 서비스 생성
- [ ] [Render.com](https://render.com)에 로그인
- [ ] "New +" → "Web Service" 선택
- [ ] GitHub 저장소 연결
- [ ] 프로젝트 선택

### 4. 서비스 기본 설정
- [ ] **Name**: `particle-photo-admin` (또는 원하는 이름)
- [ ] **Environment**: `Node`
- [ ] **Region**: 가장 가까운 지역 선택 (예: Singapore)
- [ ] **Branch**: `main` (또는 기본 브랜치)
- [ ] **Build Command**: `npm install`
- [ ] **Start Command**: `npm start`
- [ ] **Plan**: `Free`

### 5. 환경 변수 설정
Render.com 대시보드의 "Environment" 탭에서 설정:

#### 필수 환경 변수:
- [ ] `NODE_ENV` = `production`
- [ ] `PORT` = `10000`
- [ ] `ALLOWED_ORIGINS` = `https://your-app-name.onrender.com`

#### 선택적 환경 변수 (Firebase 사용 시):
- [ ] `FIREBASE_TYPE` = `service_account`
- [ ] `FIREBASE_PROJECT_ID` = `your-project-id`
- [ ] `FIREBASE_PRIVATE_KEY_ID` = `your-private-key-id`
- [ ] `FIREBASE_PRIVATE_KEY` = `"-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"`
- [ ] `FIREBASE_CLIENT_EMAIL` = `your-service-account@your-project.iam.gserviceaccount.com`
- [ ] `FIREBASE_CLIENT_ID` = `your-client-id`
- [ ] `FIREBASE_AUTH_URI` = `https://accounts.google.com/o/oauth2/auth`
- [ ] `FIREBASE_TOKEN_URI` = `https://oauth2.googleapis.com/token`
- [ ] `FIREBASE_AUTH_PROVIDER_X509_CERT_URL` = `https://www.googleapis.com/oauth2/v1/certs`
- [ ] `FIREBASE_CLIENT_X509_CERT_URL` = `https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com`
- [ ] `FIREBASE_STORAGE_BUCKET` = `your-project-id.appspot.com`

## 🚀 배포 실행

### 6. 배포 시작
- [ ] "Create Web Service" 버튼 클릭
- [ ] 빌드 로그 확인
- [ ] 배포 완료 대기 (보통 2-5분 소요)

### 7. 배포 후 확인
- [ ] 제공된 URL로 접속 테스트
- [ ] 메인 페이지 (`/index.html`) 접속 확인
- [ ] 관리자 페이지 (`/admin.html`) 접속 확인
- [ ] API 엔드포인트 테스트 (`/api/items`)

## 🔍 문제 해결

### 8. 일반적인 문제들
- [ ] **빌드 실패**: `package.json`의 의존성 확인
- [ ] **포트 오류**: `PORT` 환경 변수가 `10000`으로 설정되어 있는지 확인
- [ ] **CORS 오류**: `ALLOWED_ORIGINS`에 올바른 도메인이 포함되어 있는지 확인
- [ ] **파일 업로드 실패**: `images/` 디렉토리가 존재하는지 확인

### 9. 로그 확인
- [ ] Render.com 대시보드에서 "Logs" 탭 확인
- [ ] 빌드 로그와 런타임 로그 구분하여 확인
- [ ] 에러 메시지 분석

## 📝 배포 완료 후

### 10. 최종 확인
- [ ] 모든 기능이 정상 작동하는지 테스트
- [ ] 파일 업로드 기능 테스트
- [ ] 데이터 추가/삭제/수정 기능 테스트
- [ ] 모바일 환경에서 접속 테스트

### 11. 문서화
- [ ] 배포된 URL 기록
- [ ] 환경 변수 설정 내용 백업
- [ ] 문제 해결 과정 기록

## ⚠️ 주의사항

### 12. 무료 플랜 제한사항
- [ ] 15분 동안 요청이 없으면 서비스가 슬립 모드로 전환됨
- [ ] 첫 요청 시 서비스 재시작으로 인한 지연 발생 가능
- [ ] 파일 업로드는 임시 저장소 사용 (서비스 재시작 시 사라질 수 있음)

### 13. 보안 고려사항
- [ ] 환경 변수에 민감한 정보가 노출되지 않도록 주의
- [ ] Firebase 키는 안전하게 관리
- [ ] CORS 설정으로 허용된 도메인만 접근 가능하도록 설정 
@echo off
REM Particle Photo 서버 실행 배치 파일 (Windows)

REM 현재 디렉토리로 이동 (필요시 수정)
cd /d %~dp0

REM 서버 실행
start "ParticlePhotoServer" cmd /k "node server.js"

REM 3초 대기 후 브라우저에서 관리자 페이지 열기
ping 127.0.0.1 -n 3 > nul
start http://localhost:3000/admin.html 
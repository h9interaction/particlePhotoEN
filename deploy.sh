#!/bin/bash

# Render.com 배포 스크립트
echo "🚀 Particle Photo Admin 배포 준비 중..."

# 1. 현재 상태 확인
echo "📋 현재 Git 상태 확인..."
git status

# 2. 변경사항 커밋
echo "💾 변경사항 커밋 중..."
git add .
git commit -m "Deploy to Render.com - $(date)"

# 3. GitHub에 푸시
echo "📤 GitHub에 푸시 중..."
git push origin main

echo "✅ 배포 준비 완료!"
echo ""
echo "📝 다음 단계:"
echo "1. Render.com에 로그인"
echo "2. 'New +' → 'Web Service' 선택"
echo "3. GitHub 저장소 연결"
echo "4. 환경 변수 설정 (DEPLOYMENT_CHECKLIST.md 참고)"
echo "5. 'Create Web Service' 클릭"
echo ""
echo "🔗 배포 체크리스트: DEPLOYMENT_CHECKLIST.md"
echo "�� 상세 가이드: README.md" 
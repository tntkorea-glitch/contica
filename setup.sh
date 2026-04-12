#!/bin/sh
# 새 PC 최초 셋업 스크립트 - 한 번만 실행하면 됨
# 사용법: bash setup.sh
set -e

echo "🚀 프로젝트 셋업 시작..."

# 1. gitleaks 설치 (Windows: winget)
if ! command -v gitleaks >/dev/null 2>&1 && [ ! -x "/c/Users/$USER/AppData/Local/Microsoft/WinGet/Packages/Gitleaks.Gitleaks_Microsoft.Winget.Source_8wekyb3d8bbwe/gitleaks.exe" ]; then
  echo "📦 gitleaks 설치 중..."
  if command -v winget >/dev/null 2>&1; then
    winget install -e --id Gitleaks.Gitleaks --accept-source-agreements --accept-package-agreements || echo "⚠️  gitleaks 설치 실패 — 수동 설치 필요"
  else
    echo "⚠️  winget 없음 — gitleaks 수동 설치 필요: https://github.com/gitleaks/gitleaks"
  fi
else
  echo "✅ gitleaks 이미 설치됨"
fi

# 2. pre-commit hook 설치 (시크릿 차단)
echo "🔒 gitleaks pre-commit hook 설치 중..."
mkdir -p .git/hooks
cat > .git/hooks/pre-commit << 'HOOK_EOF'
#!/bin/sh
# gitleaks pre-commit hook - 시크릿 들어간 커밋 차단
GITLEAKS=""
if command -v gitleaks >/dev/null 2>&1; then
  GITLEAKS=gitleaks
else
  for p in "/c/Users/$USER/AppData/Local/Microsoft/WinGet/Packages/Gitleaks.Gitleaks_Microsoft.Winget.Source_8wekyb3d8bbwe/gitleaks.exe" "/usr/local/bin/gitleaks" "/opt/homebrew/bin/gitleaks"; do
    [ -x "$p" ] && GITLEAKS="$p" && break
  done
fi
if [ -z "$GITLEAKS" ]; then
  echo "⚠️  gitleaks 없음 - 시크릿 검사 스킵 (bash setup.sh 실행 권장)"
  exit 0
fi
"$GITLEAKS" git --pre-commit --staged --redact -v
if [ $? -ne 0 ]; then
  echo ""
  echo "❌ 커밋 차단됨: 시크릿이 감지되었습니다"
  echo "   위에 표시된 시크릿을 제거 후 다시 커밋하세요"
  echo "   강제 우회 (위험): git commit --no-verify"
  exit 1
fi
exit 0
HOOK_EOF
chmod +x .git/hooks/pre-commit
echo "✅ pre-commit hook 설치 완료"

# 3. npm 의존성 설치
if [ -f package.json ]; then
  echo "📦 npm install..."
  npm install
fi

# 4. Vercel 환경변수 받기
if [ -f package.json ]; then
  if command -v vercel >/dev/null 2>&1; then
    if [ ! -f .env.local ]; then
      echo "🔑 Vercel 환경변수 다운로드 중..."
      echo "   (vercel link 후 env pull 실행 - 브라우저 인증 필요할 수 있음)"
      vercel link || echo "⚠️  vercel link 실패 - 수동으로 'vercel link' 실행하세요"
      vercel env pull .env.local || echo "⚠️  vercel env pull 실패 - 수동으로 실행하세요"
    else
      echo "✅ .env.local 이미 존재함"
    fi
  else
    echo "⚠️  vercel CLI 없음 - 설치: npm i -g vercel, 그 후 'vercel link && vercel env pull .env.local'"
  fi
fi

echo ""
echo "🎉 셋업 완료! 이제 개발 시작하면 됩니다."
echo "   dev 서버: npm run dev"

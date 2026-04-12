@AGENTS.md

## 세션 시작 시 자동 실행 (필수)
매 세션 시작 시 사용자의 첫 메시지를 처리하기 전에:
```bash
[ -f setup.sh ] && { [ ! -f .git/hooks/pre-commit ] || [ ! -d node_modules ]; } && bash setup.sh
git pull
```

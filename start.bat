@echo off
chcp 65001 >nul
title 상품캡처 및 가격조회

cd /d "%~dp0"

if not exist "node_modules\" (
  echo node_modules 없음. setup.bat 을 먼저 실행하세요.
  pause
  exit /b 1
)

if not exist ".env.local" (
  echo .env.local 없음. setup.bat 을 먼저 실행하세요.
  pause
  exit /b 1
)

echo 서버 시작 중... http://localhost:3000
echo 종료: Ctrl+C
echo.
call npm run dev

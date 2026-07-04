@echo off
chcp 65001 >nul
title 상품캡처 및 가격조회 - 설치

echo ========================================
echo   상품캡처 및 가격조회 - Windows 설치
echo   위치: D:\함께온라인\sangpum-capture-price
echo ========================================
echo.

cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo [오류] Node.js가 없습니다.
  echo https://nodejs.org 에서 LTS 버전 설치 후 다시 실행하세요.
  pause
  exit /b 1
)

echo [1/4] Node.js 확인 OK
node -v
npm -v
echo.

echo [2/4] 패키지 설치 중...
call npm install
if errorlevel 1 (
  echo [오류] npm install 실패
  pause
  exit /b 1
)

echo.
echo [3/4] 환경설정 파일 생성...
if not exist ".env.local" (
  copy /Y ".env.example" ".env.local" >nul
  echo .env.local 파일을 생성했습니다.
  echo.
  echo  ★ 메모장으로 .env.local 을 열어 아래 값을 입력하세요:
  echo     NAVER_CLIENT_ID=발급받은_ID
  echo     NAVER_CLIENT_SECRET=발급받은_SECRET
  echo.
  notepad ".env.local"
) else (
  echo .env.local 이 이미 있습니다.
)

echo.
echo [4/4] 설치 완료!
echo.
echo 실행: start.bat 더블클릭
echo 브라우저: http://localhost:3000
echo.
pause

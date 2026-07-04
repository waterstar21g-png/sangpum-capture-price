@echo off
cd /d "%~dp0"
echo [폴더] %CD%
where node && node -v
where npm && npm -v
if exist node_modules\ (echo [OK] node_modules) else echo [X] npm install 필요
if exist .env.local (echo [OK] .env.local) else echo [X] .env.local 없음
pause
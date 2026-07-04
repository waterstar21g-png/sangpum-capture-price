# D:\함께온라인 설치 가이드 (Windows)

## 최종 폴더 위치

```
D:\함께온라인\sangpum-capture-price\
├── setup.bat          ← 1회 설치
├── start.bat          ← 매번 실행
├── .env.local         ← 네이버 API 키 입력
├── app\
├── components\
└── package.json
```

---

## 방법 A) Git으로 받기 (권장)

### 1. 폴더 만들기

**명령 프롬프트(cmd)** 또는 **PowerShell** 열기:

```cmd
mkdir D:\함께온라인
cd /d D:\함께온라인
```

### 2. 프로젝트 다운로드

```cmd
git clone -b cursor/sangpum-capture-price-b9de https://github.com/waterstar21g-png/nutrifarmer-v6000.git temp-repo
xcopy temp-repo\sangpum-capture-price sangpum-capture-price\ /E /I /Y
rmdir /s /q temp-repo
cd sangpum-capture-price
```

### 3. 설치 실행

```cmd
setup.bat
```

메모장이 열리면 `.env.local` 에 네이버 키 입력 후 저장.

### 4. 실행

```cmd
start.bat
```

브라우저에서 http://localhost:3000 접속

---

## 방법 B) Cursor/VS Code에서 폴더 열기

1. **파일** → **폴더 열기**
2. `D:\함께온라인\sangpum-capture-price` 선택
3. 터미널에서 `setup.bat` → `start.bat`

---

## .env.local 예시

`D:\함께온라인\sangpum-capture-price\.env.local` 파일:

```env
NAVER_CLIENT_ID=abc123your_id
NAVER_CLIENT_SECRET=xyz789your_secret
```

- 따옴표 없이 입력
- 저장 후 `start.bat` 재실행

---

## 네이버 API 키 발급 (요약)

1. https://developers.naver.com 로그인
2. **Application** → **애플리케이션 등록**
3. **사용 API**: 검색 ✅
4. **WEB URL**: `http://localhost:3000`
5. **Client ID / Client Secret** 복사 → `.env.local` 에 붙여넣기

---

## 문제 해결

| 문제 | 해결 |
|------|------|
| `node` 명령 없음 | https://nodejs.org LTS 설치 |
| 데모 데이터만 표시 | `.env.local` 키 확인 후 `start.bat` 재시작 |
| 포트 사용 중 | 다른 터미널에서 `npm run dev` 종료 (Ctrl+C) |

---

## 매일 사용

```
D:\함께온라인\sangpum-capture-price\start.bat  더블클릭
```

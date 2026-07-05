# PostgreSQL 서버 DB 설정

상품 이미지·키워드 50건·결과 세션은 **PostgreSQL**에 저장됩니다.

## 자동 설정 (권장)

```bash
npm run db:provision
```

1. Neon PostgreSQL 인스턴스 생성 (또는 기존 `DATABASE_URL` 사용)
2. `.env.local` 에 `DATABASE_URL` 기록
3. 테이블 `sc_keywords`, `sc_product_images`, `sc_app_sessions` 생성

## Vercel 프로덕션 연동

### 방법 A — Vercel 대시보드

1. [Vercel](https://vercel.com/nutrifarmer-front/sangpum-capture-price/settings/environment-variables) → **Environment Variables**
2. 이름: `DATABASE_URL`
3. 값: `.env.local` 의 `DATABASE_URL` (Neon 연결 문자열)
4. 환경: **Production**, **Preview**, **Development** 모두 체크
5. **Redeploy** 실행

### 방법 B — CLI (VERCEL_TOKEN 필요)

```bash
export VERCEL_TOKEN=your_token
npm run db:provision   # DATABASE_URL Vercel에 자동 등록
npm run vercel:deploy
```

또는:

```bash
export VERCEL_TOKEN=your_token
npm run vercel:deploy:db
```

## Neon DB 영구 보관 (claim)

자동 생성된 Neon DB는 **72시간** 후 만료될 수 있습니다. 영구 사용하려면 Neon 계정에 연결(claim)하세요:

https://neon.new/claim/019f3124-14a9-71bf-9c41-7dd120b40eb3

## API 엔드포인트

| 경로 | 설명 |
|------|------|
| `GET/POST /api/db/keywords` | 키워드 이력 (최대 50건) |
| `GET/POST /api/db/images` | 상품 이미지 |
| `GET/PUT/DELETE /api/db/session` | 결과 화면 세션 |

`DATABASE_URL` 미설정 시 → IndexedDB·localStorage 폴백

import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'sc-session';
/** 세션 쿠키 유효기간 — 30일 */
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;
/** DB 이미지 보관 기간 — 세션과 동일 */
export const IMAGE_RETENTION_SEC = SESSION_MAX_AGE_SEC;

export async function ensureSessionId(): Promise<string> {
  const jar = await cookies();
  let id = jar.get(SESSION_COOKIE)?.value?.trim();
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    id = crypto.randomUUID();
    jar.set(SESSION_COOKIE, id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE_SEC,
      path: '/',
    });
  }
  return id;
}

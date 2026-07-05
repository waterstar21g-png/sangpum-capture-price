import {
  clipItemscoutKeyword,
  itemscoutKeywordPageUrl,
  resolveItemscoutKeywordId,
} from '@/lib/itemscout/resolve-keyword';
import { openInKiwiBrowser, type OpenInKiwiResult } from '@/lib/kiwi-browser';

export interface OpenItemscoutResult {
  ok: boolean;
  keyword: string;
  id?: number;
  url?: string;
  /** 클립보드에 복사된 상품명 (붙여넣기용) */
  copied: boolean;
  message: string;
  kiwi?: OpenInKiwiResult;
}

/** 아이템스카우트 검색란 붙여넣기용 — 상품명을 클립보드에 보관 */
export async function copyProductNameForPaste(
  productName: string,
  keyword?: string,
  options?: { clipForItemscout?: boolean },
): Promise<{ text: string; copied: boolean }> {
  const raw = (productName || keyword || '').trim();
  const text = options?.clipForItemscout ? clipItemscoutKeyword(raw) : raw;
  if (!text) return { text: '', copied: false };

  try {
    await navigator.clipboard.writeText(text);
    return { text, copied: true };
  } catch {
    // clipboard API 실패 시 폴백
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return { text, copied: ok };
    } catch {
      return { text, copied: false };
    }
  }
}

/**
 * 상품명으로 아이템스카우트 키워드 ID를 찾은 뒤 분석 페이지 URL을 만든다.
 * (아이템스카우트 검색란은 외부 URL로 채울 수 없음 → ID 페이지로 직접 진입)
 */
export async function resolveItemscoutOpen(
  productName: string,
  keyword?: string,
): Promise<OpenItemscoutResult> {
  const primary = clipItemscoutKeyword(productName);
  const secondary = clipItemscoutKeyword(keyword ?? '');

  // 1) 붙여넣기 직전 단계: 상품명을 클립보드에 보관
  const { text: pasteText, copied } = await copyProductNameForPaste(productName, keyword);

  if (!primary && !secondary) {
    return { ok: false, keyword: '', copied: false, message: '전달할 상품명이 없습니다.' };
  }

  const tryTexts = [...new Set([primary, secondary].filter(Boolean))];
  const pasteNote = copied
    ? `상품명 복사됨 → 검색란에서 Ctrl+V`
    : `상품명 복사 실패 — 직접 입력: ${pasteText}`;

  // 서버 폴백 (모바일 CORS 대비 — 항상 시도)
  for (const text of tryTexts) {
    try {
      const res = await fetch(`/api/itemscout-resolve?q=${encodeURIComponent(text)}`);
      const data = (await res.json()) as { ok?: boolean; id?: number; keyword?: string };
      if (data.ok && data.id) {
        const kw = data.keyword || text;
        return {
          ok: true,
          keyword: kw,
          id: data.id,
          url: itemscoutKeywordPageUrl(data.id),
          copied,
          message: `「${kw}」${pasteNote}`,
        };
      }
    } catch {
      /* next */
    }
  }

  // 클라이언트 직접 API (PC)
  for (const text of tryTexts) {
    try {
      const id = await resolveItemscoutKeywordId(text);
      if (id != null) {
        return {
          ok: true,
          keyword: text,
          id,
          url: itemscoutKeywordPageUrl(id),
          copied,
          message: `「${text}」${pasteNote}`,
        };
      }
    } catch {
      /* next */
    }
  }

  return {
    ok: false,
    keyword: primary || secondary,
    url: 'https://itemscout.io/keyword',
    copied,
    message: `「${primary || secondary}」${pasteNote} (키워드 페이지로 이동)`,
  };
}

/**
 * 아이템스카우트 키워드 분석 — Android는 Kiwi Browser, 그 외는 새 탭
 */
export async function openItemscoutInKiwi(
  productName: string,
  keyword?: string,
): Promise<OpenItemscoutResult> {
  const resolved = await resolveItemscoutOpen(productName, keyword);

  if (!resolved.url || !resolved.id) {
    return {
      ...resolved,
      ok: false,
      message:
        resolved.message ||
        `「${resolved.keyword}」키워드 ID를 찾지 못했습니다. 아이템스카우트에서 직접 검색해 주세요.`,
    };
  }

  const pageUrl = resolved.url;
  const kiwi = await openInKiwiBrowser(pageUrl);

  const pastePart = resolved.copied ? ' · 상품명 복사됨(붙여넣기)' : '';

  return {
    ...resolved,
    ok: true,
    url: pageUrl,
    kiwi,
    message: `${kiwi.message}${pastePart}`,
  };
}

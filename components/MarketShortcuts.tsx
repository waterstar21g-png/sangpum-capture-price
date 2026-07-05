'use client';

import { useEffect, useState } from 'react';
import {
  MARKET_SHORTCUTS,
  shortcutSearchText,
  type ShortcutQuery,
} from '@/lib/market-shortcuts';
import { clipItemscoutKeyword } from '@/lib/itemscout/resolve-keyword';
import { copyProductNameForPaste, openItemscoutInKiwi } from '@/lib/itemscout/open-keyword';
import { openCoupangSearch } from '@/lib/coupang-app';
import { openNaverShoppingSearch } from '@/lib/naver-shopping-app';
import { NaverShoppingPreview, type ItemscoutPreview } from './NaverShoppingPreview';
import type { NaverShopListing } from '@/lib/naver-shopping';

interface Props {
  productName: string;
  keyword: string;
  /** 카메라·갤러리로 선택한 이미지 (있을 때만 이미지보기 토글 표시) */
  capturedImageUrl?: string | null;
  /** 네이버 채널 경쟁강도 (키워드 분석 패널) */
  naverProductCount?: number;
  naverMonthlySearches?: number;
  naverIntensity?: number;
  /** 외부 앱·브라우저로 나가기 직전 메인 화면 스냅샷 저장 */
  onBeforeLeaveApp?: () => void | Promise<void>;
}

export function MarketShortcuts({
  productName,
  keyword,
  capturedImageUrl,
  naverProductCount,
  naverMonthlySearches,
  naverIntensity,
  onBeforeLeaveApp,
}: Props) {
  const q: ShortcutQuery = {
    productName: productName.trim(),
    keyword: keyword.trim(),
  };
  const searchText = shortcutSearchText(q);
  const pasteText = clipItemscoutKeyword(searchText);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [copiedReady, setCopiedReady] = useState(false);
  const [imageVisible, setImageVisible] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewErr, setPreviewErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    itemscout: ItemscoutPreview;
    listings: NaverShopListing[];
    total: number;
    compareUrl: string;
  } | null>(null);

  // 결과 화면 진입 시 상품명을 클립보드에 미리 보관 (붙여넣기 직전 단계)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { copied } = await copyProductNameForPaste(productName, keyword);
      if (!cancelled) {
        setCopiedReady(copied);
        if (copied) {
          setHint(`「${pasteText}」복사됨 — 아이템스카우트 검색란에서 Ctrl+V`);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productName, keyword, pasteText]);

  useEffect(() => {
    setImageVisible(false);
  }, [capturedImageUrl]);

  if (!searchText) return null;

  async function beforeLeave() {
    await onBeforeLeaveApp?.();
  }

  async function openNaverShopping(e: React.MouseEvent) {
    e.preventDefault();
    setPreviewLoading(true);
    setPreviewErr(null);

    const params = new URLSearchParams({
      keyword: keyword.trim(),
      productName: productName.trim(),
    });
    if (naverProductCount != null) params.set('productCount', String(naverProductCount));
    if (naverMonthlySearches != null) params.set('monthlySearches', String(naverMonthlySearches));
    if (naverIntensity != null) params.set('intensity', String(naverIntensity));

    try {
      const res = await fetch(`/api/naver-shopping-preview?${params}`);
      const json = (await res.json()) as {
        ok: boolean;
        message?: string;
        itemscout?: ItemscoutPreview;
        naver?: { listings: NaverShopListing[]; total: number; compareUrl: string };
      };
      if (!res.ok || !json.ok || !json.itemscout || !json.naver) {
        throw new Error(json.message ?? '조회 실패');
      }
      setPreview({
        itemscout: json.itemscout,
        listings: json.naver.listings,
        total: json.naver.total,
        compareUrl: json.naver.compareUrl,
      });
    } catch (err) {
      setPreviewErr(err instanceof Error ? err.message : '네이버쇼핑 정보를 불러오지 못했습니다.');
    } finally {
      setPreviewLoading(false);
    }
  }

  async function openItemscout(e: React.MouseEvent) {
    e.preventDefault();
    setBusy(true);
    setHint(null);
    await beforeLeave();

    const result = await openItemscoutInKiwi(productName, keyword);
    setCopiedReady(result.copied);
    setHint(result.message);

    setBusy(false);
  }

  async function openNaver(e: React.MouseEvent) {
    e.preventDefault();
    await beforeLeave();
    const r = openNaverShoppingSearch(searchText);
    setHint(r.message);
  }

  async function openCoupang(e: React.MouseEvent) {
    e.preventDefault();
    await beforeLeave();
    const r = openCoupangSearch(searchText);
    setHint(r.message);
  }

  async function copyOnly() {
    const { text, copied } = await copyProductNameForPaste(productName, keyword);
    setCopiedReady(copied);
    setHint(
      copied
        ? `「${text}」복사됨 — 검색란에서 Ctrl+V 로 붙여넣기`
        : `복사 실패 — 아래 상품명을 직접 선택해 복사하세요: ${text}`,
    );
  }

  return (
    <article className="card">
      <h3 className="card__title">바로가기</h3>
      <div className="paste-ready">
        <div className="paste-ready__row">
          <span className="paste-ready__label">붙여넣기용 상품명</span>
          {copiedReady && <span className="paste-ready__badge">복사됨</span>}
        </div>
        <code className="paste-ready__text">{pasteText}</code>
        <div className="paste-ready__actions">
          <button type="button" className="paste-ready__btn" onClick={copyOnly}>
            상품명 다시 복사
          </button>
          {capturedImageUrl && (
            <button
              type="button"
              className={`paste-ready__toggle${imageVisible ? ' paste-ready__toggle--on' : ''}`}
              onClick={() => setImageVisible(v => !v)}
              aria-pressed={imageVisible}
              aria-label={imageVisible ? '이미지 숨기기' : '이미지보기'}
              title={imageVisible ? '이미지 숨기기' : '캡처·갤러리 이미지 보기'}
            >
              <span className="paste-ready__toggle-icon" aria-hidden>🖼</span>
              <span className="paste-ready__toggle-label">이미지보기</span>
            </button>
          )}
        </div>
        {imageVisible && capturedImageUrl && (
          <div className="paste-ready__image">
            <img src={capturedImageUrl} alt="캡처·갤러리에서 선택한 상품" className="paste-ready__image-img" />
          </div>
        )}
      </div>
      <div className="shortcuts" role="list">
        {MARKET_SHORTCUTS.map(site => {
          const isItemscout = site.id === 'itemscout';
          const isNaverShopping = site.id === 'naver-shopping';
          const isNaver = site.id === 'naver';
          const isCoupang = site.id === 'coupang';
          const title = isItemscout
            ? `아이템스카우트 키워드 분석: ${searchText}`
            : isNaverShopping
              ? `앱 내 가격비교·키워드: ${searchText}`
              : isNaver
                ? `네이버쇼핑 앱에서 검색: ${searchText}`
              : isCoupang
                ? `쿠팡 앱에서 검색: ${searchText}`
                : `${site.label}에서 검색: ${searchText}`;

          if (isItemscout) {
            return (
              <button
                key={site.id}
                type="button"
                role="listitem"
                className="shortcut shortcut--btn"
                title={title}
                disabled={busy}
                onClick={openItemscout}
              >
                <span className="shortcut__icon" style={{ background: site.color }} aria-hidden>
                  {site.mark}
                </span>
                <span className="shortcut__label">{site.label}</span>
              </button>
            );
          }

          if (isNaverShopping) {
            return (
              <button
                key={site.id}
                type="button"
                role="listitem"
                className="shortcut shortcut--btn"
                title={title}
                disabled={previewLoading}
                onClick={openNaverShopping}
              >
                <span className="shortcut__icon" style={{ background: site.color }} aria-hidden>
                  {site.mark}
                </span>
                <span className="shortcut__label">{site.label}</span>
              </button>
            );
          }

          if (isCoupang) {
            return (
              <button
                key={site.id}
                type="button"
                role="listitem"
                className="shortcut shortcut--btn"
                title={title}
                onClick={openCoupang}
              >
                <span className="shortcut__icon" style={{ background: site.color }} aria-hidden>
                  {site.mark}
                </span>
                <span className="shortcut__label">{site.label}</span>
              </button>
            );
          }

          if (isNaver) {
            return (
              <button
                key={site.id}
                type="button"
                role="listitem"
                className="shortcut shortcut--btn"
                title={title}
                onClick={openNaver}
              >
                <span className="shortcut__icon" style={{ background: site.color }} aria-hidden>
                  {site.mark}
                </span>
                <span className="shortcut__label">{site.label}</span>
              </button>
            );
          }

          return (
            <a
              key={site.id}
              role="listitem"
              className="shortcut"
              href={site.buildUrl(q)}
              target="_blank"
              rel="noopener noreferrer"
              title={title}
              onClick={() => void beforeLeave()}
            >
              <span className="shortcut__icon" style={{ background: site.color }} aria-hidden>
                {site.mark}
              </span>
              <span className="shortcut__label">{site.label}</span>
            </a>
          );
        })}
      </div>
      {hint && (
        <p className={`shortcut-hint${hint.includes('못') || hint.includes('실패') ? ' shortcut-hint--err' : ''}`}>
          {hint}
        </p>
      )}
      {previewErr && <p className="shortcut-hint shortcut-hint--err">{previewErr}</p>}
      {preview && (
        <NaverShoppingPreview
          itemscout={preview.itemscout}
          listings={preview.listings}
          total={preview.total}
          compareUrl={preview.compareUrl}
          onClose={() => setPreview(null)}
        />
      )}
    </article>
  );
}

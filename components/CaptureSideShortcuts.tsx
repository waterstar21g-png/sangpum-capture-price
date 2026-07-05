'use client';

import { useState } from 'react';
import { filterMarketShortcuts, shortcutSearchText, type ShortcutQuery } from '@/lib/market-shortcuts';
import { openCoupangSearch } from '@/lib/coupang-app';
import { openNaverShoppingSearch } from '@/lib/naver-shopping-app';
import type { NaverShopListing } from '@/lib/naver-shopping';
import type { ItemscoutPreview } from './NaverShoppingPreview';

export interface CaptureNaverPreview {
  itemscout: ItemscoutPreview;
  listings: NaverShopListing[];
  total: number;
  compareUrl: string;
}

interface Props {
  keyword: string;
  disabled?: boolean;
  onPreview?: (preview: CaptureNaverPreview | null) => void;
  onHint?: (message: string | null) => void;
}

/** 캡처 화면 — 이미지 우측 세로 바로가기 (6개) */
export function CaptureSideShortcuts({ keyword, disabled, onPreview, onHint }: Props) {
  const q: ShortcutQuery = { productName: keyword.trim(), keyword: keyword.trim() };
  const searchText = shortcutSearchText(q);
  const sites = filterMarketShortcuts();
  const [loading, setLoading] = useState(false);

  async function openNaverShopping() {
    if (!searchText) {
      onHint?.('키워드를 입력하거나 사진을 선택해 주세요.');
      return;
    }
    setLoading(true);
    onHint?.(null);
    onPreview?.(null);
    const params = new URLSearchParams({ keyword: searchText, productName: searchText });
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
      onPreview?.({
        itemscout: json.itemscout,
        listings: json.naver.listings,
        total: json.naver.total,
        compareUrl: json.naver.compareUrl,
      });
    } catch (e) {
      onHint?.(e instanceof Error ? e.message : '가격비교 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  function onSiteClick(site: ReturnType<typeof filterMarketShortcuts>[number]) {
    if (!searchText) {
      onHint?.('키워드를 입력하거나 사진을 선택해 주세요.');
      return;
    }
    if (site.id === 'coupang') onHint?.(openCoupangSearch(searchText).message);
    else if (site.id === 'naver') onHint?.(openNaverShoppingSearch(searchText).message);
    else if (site.id === 'naver-shopping') void openNaverShopping();
    else window.open(site.buildUrl(q), '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="capture-shortcuts" role="list" aria-label="마켓 바로가기">
      {sites.map(site => (
        <button
          key={site.id}
          type="button"
          role="listitem"
          className="shortcut shortcut--btn capture-shortcuts__btn"
          title={`${site.label}: ${searchText || '검색어 없음'}`}
          disabled={disabled || (site.id === 'naver-shopping' && loading)}
          onClick={() => onSiteClick(site)}
        >
          <span className="shortcut__icon" style={{ background: site.color }} aria-hidden>
            {site.mark}
          </span>
          <span className="shortcut__label">{site.label}</span>
        </button>
      ))}
    </div>
  );
}

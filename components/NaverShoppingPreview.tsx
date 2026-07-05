'use client';

import type { NaverShopListing } from '@/lib/naver-shopping';
import { openInKiwiBrowser } from '@/lib/kiwi-browser';

export interface ItemscoutPreview {
  keyword: string;
  keywordId: number | null;
  productCount: number;
  monthlySearches: number;
  intensity: number;
  intensityLabel: string;
  analyzeUrl: string;
}

interface Props {
  itemscout: ItemscoutPreview;
  listings: NaverShopListing[];
  total: number;
  compareUrl: string;
  onClose: () => void;
}

export function NaverShoppingPreview({ itemscout, listings, total, compareUrl, onClose }: Props) {
  return (
    <article className="card naver-preview">
      <div className="naver-preview__head">
        <h3 className="card__title">네이버 가격비교 · 키워드</h3>
        <button type="button" className="naver-preview__close" onClick={onClose} aria-label="닫기">
          ✕
        </button>
      </div>

      <section className="is-panel">
        <h4 className="is-panel__title">
          키워드 분석 <span className="is-panel__kw">「{itemscout.keyword}」</span>
        </h4>
        <div className="is-stats">
          <div className="is-stat">
            <span className="is-stat__label">등록 상품수</span>
            <span className="is-stat__value">{fmt(itemscout.productCount)}</span>
          </div>
          <div className="is-stat">
            <span className="is-stat__label">월간 검색수</span>
            <span className="is-stat__value">{fmt(itemscout.monthlySearches)}</span>
          </div>
          <div className="is-stat">
            <span className="is-stat__label">경쟁강도</span>
            <span className="is-stat__value">
              {itemscout.intensity.toFixed(2)}{' '}
              <em className={`is-badge is-badge--${badgeTone(itemscout.intensityLabel)}`}>
                {itemscout.intensityLabel}
              </em>
            </span>
          </div>
        </div>
        <button
          type="button"
          className="is-panel__link"
          onClick={() => openInKiwiBrowser(itemscout.analyzeUrl)}
        >
          아이템스카우트에서 상세 보기 ↗ (Kiwi)
        </button>
      </section>

      <section className="nv-list-panel">
        <h4 className="nv-list-panel__title">네이버쇼핑 검색 결과</h4>
        <p className="nv-list-panel__meta">총 {fmt(total)}건</p>
        <ul className="nv-product-list">
          {listings.map((item, i) => (
            <li key={`${item.url}-${i}`} className="nv-product">
              {item.badge && <span className="nv-product__badge">{item.badge}</span>}
              {item.isAd && <span className="nv-product__ad">AD</span>}
              <a className="nv-product__link" href={item.url} target="_blank" rel="noopener noreferrer">
                <span className="nv-product__title">{item.title}</span>
                <span className="nv-product__meta">
                  <span className="nv-product__mall">{item.mallName}</span>
                  <span className="nv-product__price">{item.price.toLocaleString('ko-KR')}원</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
        <a className="nv-list-panel__more" href={compareUrl} target="_blank" rel="noopener noreferrer">
          네이버쇼핑에서 전체 보기 ↗
        </a>
      </section>
    </article>
  );
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('ko-KR');
}

function badgeTone(label: string): string {
  if (label.includes('아주')) return 'best';
  if (label.includes('좋')) return 'good';
  if (label.includes('보')) return 'mid';
  return 'bad';
}

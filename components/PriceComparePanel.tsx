'use client';

import type { PriceCompare, PriceCompareItem } from '@/lib/itemscout/types';

interface Props {
  data: PriceCompare;
}

export function PriceComparePanel({ data }: Props) {
  const mall = data.mallLowest ?? [];
  const brand = data.brandCatalog ?? [];
  const productName = data.productName?.trim();

  return (
    <article className="card">
      <h3 className="card__title">가격비교 정보</h3>
      <p className="card__hint">네이버쇼핑 가격비교 · 동일 상품명</p>

      {productName && (
        <div className="nv-product">
          <p className="nv-product__name">{productName}</p>
          {data.lowestPrice != null && (
            <p className="nv-product__low">
              최저가 <strong>{data.lowestPrice.toLocaleString('ko-KR')}</strong>원
            </p>
          )}
          {data.compareUrl && (
            <a
              className="nv-product__link"
              href={data.compareUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              네이버쇼핑에서 가격비교 보기 ↗
            </a>
          )}
        </div>
      )}

      <div className="nv-panels">
        <NaverPricePanel title="쇼핑몰별 최저가" variant="mall" items={mall} />
        <NaverPricePanel title="브랜드 카탈로그" variant="brand" items={brand} />
      </div>
    </article>
  );
}

function NaverPricePanel({
  title,
  variant,
  items,
}: {
  title: string;
  variant: 'mall' | 'brand';
  items: PriceCompareItem[];
}) {
  return (
    <section className={`nv-panel nv-panel--${variant}`}>
      <h4 className="nv-panel__title">{title}</h4>
      {items.length ? (
        <ul className="nv-list">
          {items.map((item, idx) => (
            <NaverPriceRow key={`${variant}-${item.name}-${item.price}-${idx}`} item={item} />
          ))}
        </ul>
      ) : (
        <p className="muted">동일 상품 데이터가 없습니다.</p>
      )}
    </section>
  );
}

function NaverPriceRow({ item }: { item: PriceCompareItem }) {
  const lowest = Boolean(item.isLowest);
  const priceText = `${lowest ? '↓' : ''}${item.price.toLocaleString('ko-KR')}`;

  const inner = (
    <>
      <span className="nv-row__left">
        <span className={`nv-row__name${lowest ? ' nv-row__name--low' : ''}`}>{item.name}</span>
        {item.npay && <span className="nv-npay" title="네이버페이">Npay+</span>}
      </span>
      <span className={`nv-row__price${lowest ? ' nv-row__price--low' : ''}`}>{priceText}</span>
    </>
  );

  if (item.url) {
    return (
      <li>
        <a className="nv-row" href={item.url} target="_blank" rel="noopener noreferrer">
          {inner}
        </a>
      </li>
    );
  }

  return <li className="nv-row">{inner}</li>;
}

'use client';

import { MARKET_SHORTCUTS } from '@/lib/market-shortcuts';

interface Props {
  keyword: string;
}

export function MarketShortcuts({ keyword }: Props) {
  const q = keyword.trim();
  if (!q) return null;

  return (
    <article className="card">
      <h3 className="card__title">바로가기</h3>
      <div className="shortcuts" role="list">
        {MARKET_SHORTCUTS.map(site => (
          <a
            key={site.id}
            role="listitem"
            className="shortcut"
            href={site.buildUrl(q)}
            target="_blank"
            rel="noopener noreferrer"
            title={`${site.label}에서 검색`}
          >
            <span className="shortcut__icon" style={{ background: site.color }} aria-hidden>
              {site.mark}
            </span>
            <span className="shortcut__label">{site.label}</span>
          </a>
        ))}
      </div>
    </article>
  );
}

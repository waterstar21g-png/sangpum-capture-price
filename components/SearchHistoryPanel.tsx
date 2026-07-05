'use client';

import { HISTORY_SCROLL_ROWS, type SearchHistoryEntry } from '@/lib/input-history';

interface Props {
  items: SearchHistoryEntry[];
  onPick: (entry: SearchHistoryEntry) => void;
}

/** 검색 이력 — 화면에 5건, 스크롤로 전체 */
export function SearchHistoryPanel({ items, onPick }: Props) {
  if (!items.length) return null;

  return (
    <section className="history-panel" aria-label="검색 이력">
      <div className="history-panel__head">
        <h3 className="history-panel__title">검색 이력</h3>
        <span className="history-panel__count">{items.length}건</span>
      </div>
      <p className="history-panel__hint">5건씩 표시 · 아래로 스크롤하여 전체 보기</p>
      <div className="history-panel__scroll-wrap">
        <ul
          className="history-panel__list"
          role="list"
          style={{ ['--history-scroll-rows' as string]: HISTORY_SCROLL_ROWS }}
        >
          {items.map(entry => (
            <li key={`${entry.searchedAt}-${entryDedupeKey(entry)}`}>
              <button type="button" className="history-panel__item" onClick={() => onPick(entry)}>
                <span className="history-panel__name">{entry.productName}</span>
                {entry.keyword !== entry.productName && (
                  <span className="history-panel__sub">키워드: {entry.keyword}</span>
                )}
                {entry.hint && entry.hint !== entry.productName && (
                  <span className="history-panel__sub">힌트: {entry.hint}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function entryDedupeKey(entry: SearchHistoryEntry): string {
  return (entry.productName || entry.keyword).trim().toLowerCase();
}

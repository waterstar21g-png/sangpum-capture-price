'use client';

import { useState } from 'react';
import { HISTORY_SCROLL_ROWS, type SearchHistoryEntry } from '@/lib/input-history';

interface Props {
  items: SearchHistoryEntry[];
  onPick: (entry: SearchHistoryEntry) => void;
  disabled?: boolean;
}

/** 검색 이력 — 숨기기/보이기 토글 + 5건 스크롤 */
export function SearchHistoryPanel({ items, onPick, disabled }: Props) {
  const [open, setOpen] = useState(false);
  if (!items.length) return null;

  return (
    <div className="search-history-panel">
      <button
        type="button"
        className="search-history-panel__toggle"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        disabled={disabled}
      >
        <span className="search-history-panel__label">검색 이력</span>
        <span className="search-history-panel__count">{items.length}건</span>
        <span className="search-history-panel__arrow" aria-hidden>
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && (
        <div className="history-panel__scroll-wrap">
          <ul
            className="history-panel__list search-history-panel__list"
            role="list"
            style={{ ['--history-scroll-rows' as string]: HISTORY_SCROLL_ROWS }}
          >
            {items.map(entry => (
              <li key={`${entry.searchedAt}-${entryDedupeKey(entry)}`}>
                <button
                  type="button"
                  className="history-panel__item"
                  onClick={() => onPick(entry)}
                  disabled={disabled}
                >
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
      )}
    </div>
  );
}

function entryDedupeKey(entry: SearchHistoryEntry): string {
  return (entry.productName || entry.keyword).trim().toLowerCase();
}

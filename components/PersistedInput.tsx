'use client';

import { useEffect, useState } from 'react';
import {
  loadInputStore,
  saveInputDraft,
  pushSearchHistory,
  MAX_HISTORY,
  type SearchHistoryEntry,
} from '@/lib/input-history';

interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/** 상품 힌트 입력 (draft만 저장, 이력은 통합 목록) */
export function PersistedHintInput(props: Props) {
  return (
    <div className="field field--persisted">
      <label className="field__label" htmlFor={props.id}>
        {props.label}
      </label>
      <input
        id={props.id}
        type="text"
        inputMode="text"
        enterKeyHint="next"
        value={props.value}
        onChange={e => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        disabled={props.disabled}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
    </div>
  );
}

interface KeywordProps extends Props {
  searchHistory?: SearchHistoryEntry[];
  onPickEntry?: (entry: SearchHistoryEntry) => void;
  /** true면 검색 이력은 패널 하단 SearchHistoryPanel 사용 */
  hideHistory?: boolean;
}

/** 키워드 직접 입력 + 통합 최근 검색 이력 */
export function PersistedKeywordInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled,
  searchHistory,
  onPickEntry,
  hideHistory,
}: KeywordProps) {
  const listId = `${id}-history-list`;
  const datalistValues = (searchHistory ?? []).map(e => e.productName || e.keyword);

  return (
    <div className="field field--persisted">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="search"
        inputMode="search"
        enterKeyHint="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        list={datalistValues.length ? listId : undefined}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      {datalistValues.length > 0 && (
        <datalist id={listId}>
          {datalistValues.map(kw => (
            <option key={kw} value={kw} />
          ))}
        </datalist>
      )}
      {searchHistory && searchHistory.length > 0 && !hideHistory && onPickEntry && (
        <SearchHistoryList items={searchHistory} onPick={onPickEntry} />
      )}
    </div>
  );
}

/** 패널 하단 검색 이력 — 숨기기/보이기 토글 + 스크롤 */
export function SearchHistoryPanel({
  items,
  onPick,
  disabled,
}: {
  items: SearchHistoryEntry[];
  onPick: (entry: SearchHistoryEntry) => void;
  disabled?: boolean;
}) {
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
        <span className="search-history-panel__arrow" aria-hidden>
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && (
        <ul className="search-history-panel__list" role="list">
          {items.map(entry => (
            <li key={`${entry.searchedAt}-${entryDedupeKey(entry)}`}>
              <button
                type="button"
                className="search-history-panel__item"
                onClick={() => onPick(entry)}
                disabled={disabled}
              >
                {entry.productName || entry.keyword}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SearchHistoryList({
  items,
  onPick,
}: {
  items: SearchHistoryEntry[];
  onPick: (entry: SearchHistoryEntry) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="input-history">
      <button
        type="button"
        className="input-history__toggle"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        최근 검색 {items.length}건
        {items.length >= MAX_HISTORY ? ` (최대 ${MAX_HISTORY})` : ''}
        <span aria-hidden>{open ? ' ▲' : ' ▼'}</span>
      </button>
      {open && (
        <ul className="input-history__list input-history__list--rich" role="list">
          {items.map(entry => (
            <li key={`${entry.searchedAt}-${entryDedupeKey(entry)}`}>
              <button type="button" className="input-history__chip-rich" onClick={() => onPick(entry)}>
                <span className="input-history__name">{entry.productName}</span>
                {entry.keyword !== entry.productName && (
                  <span className="input-history__kw">키워드: {entry.keyword}</span>
                )}
                {entry.hint && entry.hint !== entry.productName && (
                  <span className="input-history__hint">힌트: {entry.hint}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function entryDedupeKey(entry: SearchHistoryEntry): string {
  return (entry.productName || entry.keyword).trim().toLowerCase();
}

export function usePersistedInputs() {
  const [hint, setHint] = useState('');
  const [manualKeyword, setManualKeyword] = useState('');
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const store = loadInputStore();
    setHint(store.hint);
    setManualKeyword(store.keyword);
    setSearchHistory(store.searchHistory);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveInputDraft(hint, manualKeyword);
  }, [hint, manualKeyword, hydrated]);

  function pickSearchEntry(entry: SearchHistoryEntry) {
    setManualKeyword(entry.productName || entry.keyword);
    if (entry.hint) setHint(entry.hint);
  }

  function recordSuccessfulAnalysis(params: {
    keyword: string;
    productName: string;
    hint?: string;
  }) {
    const next = pushSearchHistory(params);
    setSearchHistory(next);
  }

  return {
    hint,
    setHint,
    manualKeyword,
    setManualKeyword,
    searchHistory,
    pickSearchEntry,
    recordSuccessfulAnalysis,
    hydrated,
  };
}

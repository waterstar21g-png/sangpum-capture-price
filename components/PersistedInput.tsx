'use client';

import { useEffect, useState } from 'react';
import {
  loadInputStore,
  saveInputDraft,
  pushSearchHistory,
  mergeSearchHistoryWithDb,
  saveSearchHistory,
  type SearchHistoryEntry,
} from '@/lib/input-history';
import { fetchSessionSearchImages } from '@/lib/search-image-client';

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
  onCommitSearch: (text: string) => void;
  searchHistory?: SearchHistoryEntry[];
  onPickEntry?: (entry: SearchHistoryEntry) => void;
}

/** 키워드 직접 입력 + 통합 최근 검색 이력 */
export function PersistedKeywordInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled,
  searchHistory = [],
  onPickEntry,
  onCommitSearch,
}: KeywordProps) {
  const listId = `${id}-history-list`;
  const datalistValues = searchHistory.map(e => e.productName || e.keyword);

  function findHistoryMatch(text: string): SearchHistoryEntry | undefined {
    const trimmed = text.trim();
    if (!trimmed) return undefined;
    return searchHistory.find(e => (e.productName || e.keyword).trim() === trimmed);
  }

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
        onInput={e => {
          const hit = findHistoryMatch(e.currentTarget.value);
          if (hit && onPickEntry) onPickEntry(hit);
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onCommitSearch(value);
          }
        }}
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
    </div>
  );
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

    void fetchSessionSearchImages().then(fromDb => {
      if (!fromDb.length) return;
      const merged = mergeSearchHistoryWithDb(store.searchHistory, fromDb);
      setSearchHistory(merged);
      saveSearchHistory(merged);
    });
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
    imageThumb?: string;
    imageId?: string;
    imageUrl?: string;
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

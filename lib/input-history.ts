const STORAGE_KEY = 'sangpum-capture:input-store';
const MAX_HISTORY = 50;

/** 최근 검색 1건 — 키워드 + 상품명(full name) + 힌트 */
export interface SearchHistoryEntry {
  keyword: string;
  productName: string;
  hint?: string;
  searchedAt: string;
}

export interface InputStore {
  hint: string;
  keyword: string;
  searchHistory: SearchHistoryEntry[];
  /** @deprecated v1 호환 */
  hintHistory?: string[];
  keywordHistory?: string[];
}

const DEFAULT_STORE: InputStore = {
  hint: '',
  keyword: '',
  searchHistory: [],
};

function normKey(s: string): string {
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

/** 중복 판별 — 상품명 우선, 없으면 키워드 */
function entryDedupeKey(entry: Pick<SearchHistoryEntry, 'productName' | 'keyword'>): string {
  const name = normKey(entry.productName);
  const kw = normKey(entry.keyword);
  return name || kw;
}

function sanitizeEntry(raw: unknown): SearchHistoryEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const keyword = typeof o.keyword === 'string' ? o.keyword.trim() : '';
  const productName = typeof o.productName === 'string' ? o.productName.trim() : '';
  if (!keyword && !productName) return null;
  const hint = typeof o.hint === 'string' && o.hint.trim() ? o.hint.trim() : undefined;
  const searchedAt =
    typeof o.searchedAt === 'string' && o.searchedAt ? o.searchedAt : new Date().toISOString();
  return {
    keyword: keyword || productName,
    productName: productName || keyword,
    hint,
    searchedAt,
  };
}

function migrateLegacy(parsed: Partial<InputStore>): SearchHistoryEntry[] {
  if (Array.isArray(parsed.searchHistory) && parsed.searchHistory.length) {
    return parsed.searchHistory
      .map(sanitizeEntry)
      .filter((e): e is SearchHistoryEntry => e != null)
      .slice(0, MAX_HISTORY);
  }

  const entries: SearchHistoryEntry[] = [];
  const seen = new Set<string>();

  const add = (keyword: string, productName?: string, hint?: string) => {
    const entry = sanitizeEntry({
      keyword,
      productName: productName ?? keyword,
      hint,
      searchedAt: new Date().toISOString(),
    });
    if (!entry) return;
    const key = entryDedupeKey(entry);
    if (seen.has(key)) return;
    seen.add(key);
    entries.push(entry);
  };

  for (const kw of sanitizeStringList(parsed.keywordHistory)) {
    add(kw, kw);
  }
  for (const h of sanitizeStringList(parsed.hintHistory)) {
    add(h, h, h);
  }

  return entries.slice(0, MAX_HISTORY);
}

function sanitizeStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === 'string').map(v => v.trim()).filter(Boolean);
}

function readStore(): InputStore {
  if (typeof window === 'undefined') return { ...DEFAULT_STORE };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STORE };
    const parsed = JSON.parse(raw) as Partial<InputStore>;
    return {
      hint: typeof parsed.hint === 'string' ? parsed.hint : '',
      keyword: typeof parsed.keyword === 'string' ? parsed.keyword : '',
      searchHistory: migrateLegacy(parsed),
    };
  } catch {
    return { ...DEFAULT_STORE };
  }
}

function writeStore(store: InputStore): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        hint: store.hint,
        keyword: store.keyword,
        searchHistory: store.searchHistory.slice(0, MAX_HISTORY),
      }),
    );
  } catch {
    /* ignore */
  }
}

export function loadInputStore(): InputStore {
  return readStore();
}

export function saveInputDraft(hint: string, keyword: string): void {
  const store = readStore();
  writeStore({ ...store, hint, keyword });
}

/** 분석 성공 시 — 상품명(full)+키워드+힌트, 중복 제거·최신 맨 앞 */
export function pushSearchHistory(entry: {
  keyword: string;
  productName: string;
  hint?: string;
}): SearchHistoryEntry[] {
  const keyword = entry.keyword.trim();
  const productName = entry.productName.trim();
  if (!keyword && !productName) return readStore().searchHistory;

  const newEntry = sanitizeEntry({
    keyword: keyword || productName,
    productName: productName || keyword,
    hint: entry.hint?.trim() || undefined,
    searchedAt: new Date().toISOString(),
  });
  if (!newEntry) return readStore().searchHistory;

  const store = readStore();
  const key = entryDedupeKey(newEntry);
  const rest = store.searchHistory.filter(e => entryDedupeKey(e) !== key);
  const next = [newEntry, ...rest].slice(0, MAX_HISTORY);
  writeStore({ ...store, searchHistory: next });
  return next;
}

/** @deprecated — pushSearchHistory 사용 */
export function pushInputHistory(kind: 'hint' | 'keyword', value: string): void {
  const text = value.trim();
  if (!text) return;
  if (kind === 'hint') {
    pushSearchHistory({ keyword: text, productName: text, hint: text });
  } else {
    pushSearchHistory({ keyword: text, productName: text });
  }
}

export { MAX_HISTORY };

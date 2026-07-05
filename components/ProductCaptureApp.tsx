'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProductScoutResult } from '@/lib/itemscout/types';
import type { SearchHistoryEntry } from '@/lib/input-history';
import { compressImageToDataUrl } from '@/lib/compress-image';
import { ViewTrendChart } from './ViewTrendChart';
import { MarketShortcuts } from './MarketShortcuts';
import { OverviewChart } from './OverviewChart';
import { RatioBars } from './RatioBars';
import { PriceComparePanel } from './PriceComparePanel';
import { openItemscoutInKiwi } from '@/lib/itemscout/open-keyword';
import { isAndroidDevice } from '@/lib/kiwi-browser';
import { PersistedHintInput, PersistedKeywordInput, usePersistedInputs } from './PersistedInput';

type ActiveField = 'image' | 'hint' | 'keyword';

interface AnalyzeResponse {
  ok: boolean;
  message?: string;
  scout?: ProductScoutResult;
  vision?: { confidence: number; keyword: string; productName: string; category?: string };
}

export function ProductCaptureApp() {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const {
    hint,
    setHint,
    manualKeyword,
    setManualKeyword,
    searchHistory,
    recordSuccessfulAnalysis,
  } = usePersistedInputs();
  const [result, setResult] = useState<ProductScoutResult | null>(null);
  const [visionInfo, setVisionInfo] = useState<AnalyzeResponse['vision'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kiwiHint, setKiwiHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const textTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const revokePreview = useCallback((url: string | null) => {
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
  }, []);

  useEffect(() => () => revokePreview(preview), [preview, revokePreview]);
  useEffect(() => () => { if (textTimerRef.current) clearTimeout(textTimerRef.current); }, []);

  /** 액션 항목만 남기고 나머지 입력·사진 전부 제거 */
  function clearExcept(active: ActiveField) {
    if (active !== 'image') {
      revokePreview(preview);
      setPreview(null);
      if (cameraRef.current) cameraRef.current.value = '';
      if (galleryRef.current) galleryRef.current.value = '';
    }
    if (active !== 'hint') setHint('');
    if (active !== 'keyword') setManualKeyword('');
  }

  async function onPickFile(file: File | undefined) {
    if (!file || !file.type.startsWith('image/')) {
      setError('이미지 파일만 선택할 수 있습니다.');
      return;
    }
    clearExcept('image');
    revokePreview(preview);
    setPreview(URL.createObjectURL(file));
    setError(null);
    setResult(null);
    setVisionInfo(null);
    await searchByImage(file);
  }

  function onHintChange(value: string) {
    clearExcept('hint');
    setHint(value);
    queueTextSearch(value);
  }

  function onKeywordChange(value: string) {
    clearExcept('keyword');
    setManualKeyword(value);
    queueTextSearch(value);
  }

  function onPickHistoryEntry(entry: SearchHistoryEntry) {
    const text = (entry.productName || entry.keyword).trim();
    clearExcept('keyword');
    setManualKeyword(text);
    if (text) void searchByText(text);
  }

  function queueTextSearch(text: string) {
    if (textTimerRef.current) clearTimeout(textTimerRef.current);
    const trimmed = text.trim();
    if (!trimmed) return;
    textTimerRef.current = setTimeout(() => void searchByText(trimmed), 450);
  }

  async function searchByImage(file: File | Blob) {
    setError(null);
    setResult(null);
    setVisionInfo(null);
    setBusy(true);
    try {
      const dataUrl = await compressImageToDataUrl(file);
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: dataUrl, searchPriority: 'productName' }),
      });
      await finishSearch(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : '분석에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function searchByText(text: string) {
    setError(null);
    setResult(null);
    setVisionInfo(null);
    setBusy(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: text,
          productName: text,
          skipVision: true,
          searchPriority: 'productName',
        }),
      });
      await finishSearch(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : '분석에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function finishSearch(res: Response) {
    const data = await parseAnalyzeResponse(res);
    if (!res.ok || !data.ok || !data.scout) {
      throw new Error(data.message ?? '분석에 실패했습니다.');
    }
    setResult(data.scout);
    setVisionInfo(data.vision ?? null);
    setManualKeyword(data.scout.productName);
    recordSuccessfulAnalysis({
      keyword: data.scout.productName,
      productName: data.scout.productName,
    });
  }

  function reset() {
    revokePreview(preview);
    setPreview(null);
    setHint('');
    setManualKeyword('');
    setResult(null);
    setVisionInfo(null);
    setError(null);
    setKiwiHint(null);
    if (cameraRef.current) cameraRef.current.value = '';
    if (galleryRef.current) galleryRef.current.value = '';
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__inner">
          <span className="app-header__logo" aria-hidden>📷</span>
          <div>
            <h1 className="app-header__title">상품캡처 및 가격조회</h1>
            <p className="app-header__sub">입력창은 항상 유지 · 조작 시 바로 새 검색</p>
          </div>
        </div>
      </header>

      <main className="app-main">
        <section className="panel">
          <h2 className="panel__title">상품 캡처</h2>
          <p className="panel__lead">
            카메라·갤러리·힌트·키워드 중 하나만 사용합니다. 조작 시 <strong>나머지는 자동 삭제</strong> 후 <strong>새 검색</strong>합니다.
            결과가 있어도 이 입력창은 그대로 유지됩니다.
          </p>

          <div className="capture-box">
            {preview ? (
              <>
                <img src={preview} alt="선택한 상품" className="capture-box__img" />
                <button
                  type="button"
                  className="capture-box__clear"
                  onClick={() => {
                    revokePreview(preview);
                    setPreview(null);
                    if (cameraRef.current) cameraRef.current.value = '';
                    if (galleryRef.current) galleryRef.current.value = '';
                  }}
                  disabled={busy}
                  aria-label="선택한 사진 제거"
                >
                  ✕
                </button>
              </>
            ) : (
              <div className="capture-box__empty">
                <span aria-hidden>📦</span>
                <p>상품 사진을 촬영하거나<br />갤러리에서 선택하세요</p>
              </div>
            )}
          </div>

          <div className="btn-row">
            <button type="button" className="btn btn--primary" onClick={() => cameraRef.current?.click()} disabled={busy}>
              카메라 촬영
            </button>
            <button type="button" className="btn" onClick={() => galleryRef.current?.click()} disabled={busy}>
              갤러리 선택
            </button>
          </div>

          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" aria-label="카메라 촬영" onChange={e => onPickFile(e.target.files?.[0])} />
          <input ref={galleryRef} type="file" accept="image/*" className="sr-only" aria-label="갤러리 선택" onChange={e => onPickFile(e.target.files?.[0])} />

          <PersistedHintInput
            id="product-hint"
            label="상품 힌트"
            value={hint}
            onChange={onHintChange}
            placeholder="예: 유기농 현미 2kg"
            disabled={busy}
          />

          <div className="divider"><span>또는</span></div>

          <PersistedKeywordInput
            id="manual-keyword"
            label="키워드 직접 입력"
            value={manualKeyword}
            onChange={onKeywordChange}
            placeholder="예: 보온병 1리터"
            disabled={busy}
            searchHistory={searchHistory}
            onPickEntry={onPickHistoryEntry}
          />

          {error && <p className="alert" role="alert">{error}</p>}
        </section>

        {busy && (
          <section className="panel panel--center panel--loading" aria-live="polite">
            <div className="spinner" aria-hidden />
            <p className="loading-title">분석 중…</p>
            <p className="loading-sub">새 검색 조회 중</p>
          </section>
        )}

        {result && !busy && (
          <section className="result">
            <div className="result__meta">
              <span className={`badge badge--${result.source}`}>
                {result.source === 'naver' ? '네이버 쇼핑' : result.source === 'itemscout' ? '아이템스카우트' : '데모 데이터'}
              </span>
              {visionInfo && (
                <span className="result__confidence">인식 신뢰도 {Math.round(visionInfo.confidence * 100)}%</span>
              )}
            </div>

            <h2 className="result__name">{result.productName}</h2>
            <p className="result__keyword">
              검색: <strong>{result.productName}</strong>
              {result.category && <span className="result__cat"> · {result.category}</span>}
            </p>

            <MarketShortcuts
              productName={result.productName}
              keyword={result.keyword}
              naverProductCount={
                result.itemscoutMetricsAvailable
                  ? result.competitionByChannel?.find(c => c.channel === 'naver')?.productCount
                  : undefined
              }
              naverMonthlySearches={
                result.itemscoutMetricsAvailable
                  ? result.competitionByChannel?.find(c => c.channel === 'naver')?.monthlySearches
                  : undefined
              }
              naverIntensity={
                result.itemscoutMetricsAvailable
                  ? result.competitionByChannel?.find(c => c.channel === 'naver')?.intensity
                  : undefined
              }
            />

            {result.itemscoutMetricsAvailable ? (
              <>
                <article className="card">
                  <h3 className="card__title">상품 경쟁강도 정보</h3>
                  <div className="channel-grid">
                    {(result.competitionByChannel ?? []).map(ch => (
                      <div key={ch.channel} className="channel-card">
                        <h4 className="channel-card__name">{ch.label}</h4>
                        <dl className="channel-stats">
                          <div><dt>상품수</dt><dd>{fmt(ch.productCount)}개</dd></div>
                          <div><dt>한 달 검색수</dt><dd>{fmt(ch.monthlySearches)}회</dd></div>
                          <div>
                            <dt>경쟁강도</dt>
                            <dd>
                              <span className="channel-stats__intensity">{ch.intensity.toFixed(2)}</span>
                              <span className="channel-stats__label">{ch.intensityLabel}</span>
                            </dd>
                          </div>
                        </dl>
                        <div className="competition">
                          <div className="competition__track">
                            <div className="competition__fill" style={{ width: `${Math.min(100, ch.intensity * 100)}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                {(result.overviewChart?.length ?? 0) > 0 && (
                  <article className="card">
                    <h3 className="card__title">종합 차트</h3>
                    <p className="card__hint">최근 12개월 · 검색량(%) · 클릭량(%)</p>
                    <OverviewChart data={result.overviewChart ?? []} />
                  </article>
                )}

                {((result.genderClickRatio?.length ?? 0) > 0 || (result.ageClickRatio?.length ?? 0) > 0) && (
                  <div className="ratio-grid">
                    {(result.genderClickRatio?.length ?? 0) > 0 && (
                      <article className="card">
                        <h3 className="card__title">성별 클릭 비율</h3>
                        <RatioBars data={result.genderClickRatio ?? []} colors={['#2563eb', '#db2777']} />
                      </article>
                    )}
                    {(result.ageClickRatio?.length ?? 0) > 0 && (
                      <article className="card">
                        <h3 className="card__title">연령별 클릭 비율</h3>
                        <RatioBars data={result.ageClickRatio ?? []} />
                      </article>
                    )}
                  </div>
                )}

                {(result.weeklyViews > 0 || result.weeklySales > 0) && (
                  <div className="metrics">
                    {result.weeklyViews > 0 && (
                      <div className="metric"><span className="metric__label">1주 조회수</span><span className="metric__value">{fmt(result.weeklyViews)}</span></div>
                    )}
                    {result.weeklySales > 0 && (
                      <div className="metric"><span className="metric__label">1주 판매량</span><span className="metric__value">{fmt(result.weeklySales)}</span></div>
                    )}
                  </div>
                )}

                {(result.viewTrend?.length ?? 0) > 0 && (
                  <article className="card">
                    <h3 className="card__title">조회 추세</h3>
                    <p className="card__hint">최근 12개월 · 아이템스카우트 실데이터</p>
                    <ViewTrendChart data={result.viewTrend} />
                  </article>
                )}
              </>
            ) : (
              <article className="card card--muted">
                <h3 className="card__title">키워드 분석 · 추세</h3>
                <p className="metrics-unavailable">
                  검색 추세·경쟁강도·클릭 비율은 <strong>아이템스카우트 실데이터</strong> 연동 후에만 표시합니다.
                </p>
                <button
                  type="button"
                  className="btn btn--link metrics-unavailable__link"
                  onClick={async () => {
                    const r = await openItemscoutInKiwi(result.productName, result.keyword);
                    if (!r.ok) setKiwiHint(r.message);
                    else setKiwiHint(isAndroidDevice() ? r.message : null);
                  }}
                >
                  아이템스카우트에서 「{result.keyword}」 추세 확인 ↗
                  {isAndroidDevice() ? ' (Kiwi)' : ''}
                </button>
              </article>
            )}

            <PriceComparePanel
              data={
                result.priceCompare ?? {
                  productName: result.productName,
                  mallLowest: [],
                  brandCatalog: [],
                  compareUrl: `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(result.productName)}`,
                }
              }
            />

            {(result.source === 'demo' || result.priceSource === 'demo') && (
              <p className="notice">
                가격비교는 데모 샘플입니다. NAVER_CLIENT_ID/SECRET 설정 시 네이버쇼핑 실가격으로 대체됩니다.
                <a href="https://developers.naver.com/apps/#/list" target="_blank" rel="noopener noreferrer"> 네이버 개발자센터</a>
              </p>
            )}

            <div className="btn-row">
              <button type="button" className="btn btn--primary" onClick={reset}>새 상품 조회</button>
              <button
                type="button"
                className="btn btn--link"
                onClick={async () => {
                  const r = await openItemscoutInKiwi(result.productName, result.keyword);
                  if (!r.ok) setKiwiHint(r.message);
                  else if (isAndroidDevice()) setKiwiHint(r.message);
                  else if (r.copied) setKiwiHint(`${r.message} · 상품명 복사됨`);
                  else setKiwiHint(null);
                }}
              >
                아이템스카우트 키워드 분석 ↗{isAndroidDevice() ? ' (Kiwi)' : ''}
              </button>
            </div>
            {kiwiHint && <p className="notice" role="status">{kiwiHint}</p>}
          </section>
        )}
      </main>

      <footer className="app-footer">
        <p>가격비교: 네이버 쇼핑 · 키워드 추세·경쟁강도: 아이템스카우트 API 연동 시에만 표시</p>
      </footer>
    </div>
  );
}

async function parseAnalyzeResponse(res: Response): Promise<AnalyzeResponse> {
  const text = await res.text();
  try {
    return JSON.parse(text) as AnalyzeResponse;
  } catch {
    const lower = text.slice(0, 80).toLowerCase();
    if (res.status === 413 || lower.includes('request entity') || lower.includes('too large')) {
      throw new Error('이미지가 너무 큽니다. 더 작은 사진을 사용하거나 키워드로 조회해 주세요.');
    }
    if (res.status >= 500) throw new Error('서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    throw new Error('서버 응답을 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.');
  }
}

function fmt(n: number) {
  return n.toLocaleString('ko-KR');
}

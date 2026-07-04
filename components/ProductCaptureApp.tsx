'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProductScoutResult } from '@/lib/itemscout/types';
import { compressImageToDataUrl } from '@/lib/compress-image';
import { ViewTrendChart } from './ViewTrendChart';
import { MarketShortcuts } from './MarketShortcuts';
import { OverviewChart } from './OverviewChart';
import { RatioBars } from './RatioBars';

type Step = 'capture' | 'analyzing' | 'result';

interface AnalyzeResponse {
  ok: boolean;
  message?: string;
  scout?: ProductScoutResult;
  vision?: { confidence: number; keyword: string; productName: string; category?: string };
}

export function ProductCaptureApp() {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('capture');
  const [preview, setPreview] = useState<string | null>(null);
  const [hint, setHint] = useState('');
  const [manualKeyword, setManualKeyword] = useState('');
  const [result, setResult] = useState<ProductScoutResult | null>(null);
  const [visionInfo, setVisionInfo] = useState<AnalyzeResponse['vision'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const revokePreview = useCallback((url: string | null) => {
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
  }, []);

  useEffect(() => () => revokePreview(preview), [preview, revokePreview]);

  function onPickFile(file: File | undefined) {
    if (!file || !file.type.startsWith('image/')) {
      setError('이미지 파일만 선택할 수 있습니다.');
      return;
    }
    revokePreview(preview);
    setPreview(URL.createObjectURL(file));
    setError(null);
    setResult(null);
    setVisionInfo(null);
  }

  async function analyze() {
    setError(null);
    setBusy(true);
    setStep('analyzing');

    try {
      let body: Record<string, unknown> = {};

      if (manualKeyword.trim()) {
        body = {
          keyword: manualKeyword.trim(),
          productName: manualKeyword.trim(),
          skipVision: true,
        };
      } else if (preview) {
        const input = cameraRef.current?.files?.[0] ?? galleryRef.current?.files?.[0];
        let source: Blob | string = preview;
        if (input && input.size > 0) {
          source = input;
        } else if (preview.startsWith('blob:')) {
          source = await fetch(preview).then(r => r.blob());
        }
        const dataUrl = await compressImageToDataUrl(source);
        body = { imageDataUrl: dataUrl, hint: hint.trim() || undefined };
      } else {
        throw new Error('사진을 촬영하거나 키워드를 입력해 주세요.');
      }

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await parseAnalyzeResponse(res);
      if (!res.ok || !data.ok || !data.scout) {
        throw new Error(data.message ?? '분석에 실패했습니다.');
      }

      setResult(data.scout);
      setVisionInfo(data.vision ?? null);
      setStep('result');
    } catch (e) {
      setError(e instanceof Error ? e.message : '분석에 실패했습니다.');
      setStep('capture');
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    revokePreview(preview);
    setPreview(null);
    setHint('');
    setManualKeyword('');
    setResult(null);
    setVisionInfo(null);
    setError(null);
    setStep('capture');
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
            <p className="app-header__sub">아이템스카우트 기반 시장 분석</p>
          </div>
        </div>
      </header>

      <main className="app-main">
        {step === 'capture' && (
          <section className="panel">
            <h2 className="panel__title">상품 캡처</h2>
            <p className="panel__lead">사진을 촬영하거나 이미지를 선택하면 상품을 자동 인식합니다.</p>

            <div className="capture-box">
              {preview ? (
                <img src={preview} alt="선택한 상품" className="capture-box__img" />
              ) : (
                <div className="capture-box__empty">
                  <span aria-hidden>📦</span>
                  <p>상품 사진을 촬영하거나<br />갤러리에서 선택하세요</p>
                </div>
              )}
            </div>

            <div className="btn-row">
              <button type="button" className="btn btn--primary" onClick={() => cameraRef.current?.click()}>
                카메라 촬영
              </button>
              <button type="button" className="btn" onClick={() => galleryRef.current?.click()}>
                갤러리 선택
              </button>
            </div>

            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={e => onPickFile(e.target.files?.[0])} />
            <input ref={galleryRef} type="file" accept="image/*" className="sr-only" onChange={e => onPickFile(e.target.files?.[0])} />

            <label className="field">
              <span className="field__label">상품 힌트 (선택)</span>
              <input type="text" value={hint} onChange={e => setHint(e.target.value)} placeholder="예: 유기농 현미 2kg" disabled={busy} />
            </label>

            <div className="divider"><span>또는</span></div>

            <label className="field">
              <span className="field__label">키워드 직접 입력</span>
              <input type="text" value={manualKeyword} onChange={e => setManualKeyword(e.target.value)} placeholder="예: 보온병 1리터" disabled={busy} />
            </label>

            {error && <p className="alert" role="alert">{error}</p>}

            <button
              type="button"
              className="btn btn--accent btn--block"
              onClick={analyze}
              disabled={busy || (!preview && !manualKeyword.trim())}
            >
              가격·시장 조회
            </button>
          </section>
        )}

        {step === 'analyzing' && (
          <section className="panel panel--center">
            <div className="spinner" aria-hidden />
            <p className="loading-title">분석 중…</p>
            <p className="loading-sub">상품 인식 → 아이템스카우트 데이터 조회</p>
          </section>
        )}

        {step === 'result' && result && (
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
              키워드: <strong>{result.keyword}</strong>
              {result.category && <span className="result__cat"> · {result.category}</span>}
            </p>

            <MarketShortcuts keyword={result.keyword} />

            <article className="card">
              <h3 className="card__title">상품 경쟁강도 정보</h3>
              <div className="channel-grid">
                {(result.competitionByChannel ?? []).map(ch => (
                  <div key={ch.channel} className="channel-card">
                    <h4 className="channel-card__name">{ch.label}</h4>
                    <dl className="channel-stats">
                      <div>
                        <dt>상품수</dt>
                        <dd>{fmt(ch.productCount)}개</dd>
                      </div>
                      <div>
                        <dt>한 달 검색수</dt>
                        <dd>{fmt(ch.monthlySearches)}회</dd>
                      </div>
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
                        <div
                          className="competition__fill"
                          style={{ width: `${Math.min(100, ch.intensity * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="card">
              <h3 className="card__title">종합 차트</h3>
              <OverviewChart data={result.overviewChart ?? []} />
            </article>

            <div className="ratio-grid">
              <article className="card">
                <h3 className="card__title">성별 클릭 비율</h3>
                <RatioBars
                  data={result.genderClickRatio ?? []}
                  colors={['#2563eb', '#db2777']}
                />
              </article>
              <article className="card">
                <h3 className="card__title">연령별 클릭 비율</h3>
                <RatioBars data={result.ageClickRatio ?? []} />
              </article>
            </div>

            <div className="metrics">
              <div className="metric">
                <span className="metric__label">1주 조회수</span>
                <span className="metric__value">{fmt(result.weeklyViews)}</span>
              </div>
              <div className="metric">
                <span className="metric__label">1주 판매량</span>
                <span className="metric__value">{fmt(result.weeklySales)}</span>
              </div>
            </div>

            <article className="card">
              <h3 className="card__title">조회 추세 (최근 1주)</h3>
              <ViewTrendChart data={result.viewTrend} />
            </article>

            <article className="card">
              <h3 className="card__title">가격비교 정보</h3>
              <p className="card__hint">동일상품 대비 최소 5개 사이트</p>
              {result.lowestPrices.length ? (
                <ol className="price-list">
                  {result.lowestPrices.map(item => (
                    <li key={`${item.rank}-${item.mallName}`} className="price-item">
                      <span className="price-item__rank">{item.rank}</span>
                      <div className="price-item__info">
                        <span className="price-item__name">{item.productName}</span>
                        <span className="price-item__mall">{item.mallName}</span>
                      </div>
                      {item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="price-item__price price-item__price--link"
                        >
                          {fmtPrice(item.price)}
                        </a>
                      ) : (
                        <span className="price-item__price">{fmtPrice(item.price)}</span>
                      )}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="muted">가격비교 데이터가 없습니다.</p>
              )}
            </article>

            {(result.source === 'demo' || result.priceSource === 'demo') && (
              <p className="notice">
                NAVER_CLIENT_ID/SECRET 미설정 시 최저가·상품수는 데모입니다.
                <a href="https://developers.naver.com/apps/#/list" target="_blank" rel="noopener noreferrer"> 네이버 개발자센터</a>에서 무료 발급 후 .env.local에 추가하세요.
              </p>
            )}

            <div className="btn-row">
              <button type="button" className="btn btn--primary" onClick={reset}>새 상품 조회</button>
              <a
                href={`https://itemscout.io/keyword/${encodeURIComponent(result.keyword)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn--link"
              >
                아이템스카우트에서 보기 ↗
              </a>
            </div>
          </section>
        )}
      </main>

      <footer className="app-footer">
        <p>최저가 출처: 네이버 쇼핑 · 기타 지표: 아이템스카우트(선택)</p>
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
    if (res.status >= 500) {
      throw new Error('서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    }
    throw new Error('서버 응답을 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.');
  }
}

function fmt(n: number) {
  return n.toLocaleString('ko-KR');
}

function fmtPrice(n: number) {
  return `${n.toLocaleString('ko-KR')}원`;
}

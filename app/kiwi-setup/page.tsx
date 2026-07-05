'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import {
  ITEMSCOUT_EXTENSION_NAME,
  KIWI_APK_ARM64_URL,
  KIWI_EXTENSIONS_URL,
  KIWI_GITHUB_RELEASE_URL,
  copyKiwiExtensionsAddress,
  openKiwiApkDownload,
  openKiwiInstallPage,
  openItemscoutExtensionGuide,
} from '@/lib/kiwi-browser';

function KiwiSetupContent() {
  const params = useSearchParams();
  const step = params.get('step') === 'extension' ? 'extension' : 'install';
  const [hint, setHint] = useState('');

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__inner">
          <span className="app-header__logo" aria-hidden>
            📱
          </span>
          <div>
            <h1 className="app-header__title">Kiwi Browser 설치 안내</h1>
            <p className="app-header__sub">Intent 대신 Kiwi에서 직접 붙여넣기</p>
          </div>
        </div>
      </header>

      <main className="app-main">
        <section className="panel">
          <p className="panel__lead">
            앱 선택창에서 <strong>Kiwi</strong>를 골라도 <strong>홈화면만</strong> 열리는 경우가
            많습니다. 아래처럼 <strong>Kiwi를 직접 실행</strong>한 뒤 주소창에 붙여넣으세요.
          </p>

          <h2 className="panel__title">1. Kiwi Browser 설치</h2>
          <ol className="kiwi-setup__steps">
            <li>GitHub에서 <strong>arm64 APK</strong> 다운로드 → 설치</li>
            <li>「알 수 없는 앱」 허용 필요 시 설정에서 켜기</li>
            <li>Play Store版 Kiwi가 있으면 삭제 후 GitHub版 설치</li>
          </ol>
          <div className="kiwi-bar__actions kiwi-setup__actions">
            <button type="button" className="btn btn--primary" onClick={() => setHint(openKiwiInstallPage().message)}>
              GitHub 릴리스
            </button>
            <button type="button" className="btn" onClick={() => setHint(openKiwiApkDownload().message)}>
              arm64 APK
            </button>
          </div>

          <h2 className="panel__title">2. 아이템스카우트 확장 설치</h2>
          <ol className="kiwi-setup__steps">
            <li>
              <strong>Kiwi Browser</strong> 앱 아이콘으로 직접 실행 (앱 선택창 사용 X)
            </li>
            <li>
              방법 A: ⋮ → <strong>Extensions</strong> → <strong>+ (from store)</strong>
            </li>
            <li>
              방법 B: 주소창에 <code>{KIWI_EXTENSIONS_URL}</code> 붙여넣기
            </li>
            <li>
              스토어에서 <strong>{ITEMSCOUT_EXTENSION_NAME}</strong> → <strong>Chrome에 추가</strong>
            </li>
          </ol>
          <div className="kiwi-bar__actions kiwi-setup__actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={async () => setHint((await copyKiwiExtensionsAddress()).message)}
            >
              kiwi://extensions 복사
            </button>
            <button type="button" className="btn" onClick={() => setHint(openItemscoutExtensionGuide().message)}>
              설치 순서 보기
            </button>
          </div>

          <h2 className="panel__title">3. 추세 그래프 보기</h2>
          <ol className="kiwi-setup__steps">
            <li>상품캡처 앱에서 「추세 확인」 클릭 → <strong>링크 자동 복사</strong></li>
            <li>Kiwi Browser 직접 실행 → 주소창 → <strong>붙여넣기</strong> → 이동</li>
          </ol>

          {step === 'extension' && (
            <p className="alert" role="status">
              Kiwi가 없으면 1단계를 먼저 완료하세요.
            </p>
          )}

          {hint && <p className="kiwi-bar__hint">{hint}</p>}

          <p className="kiwi-setup__links">
            <a href={KIWI_GITHUB_RELEASE_URL} target="_blank" rel="noopener noreferrer">
              GitHub 릴리스
            </a>
            {' · '}
            <a href={KIWI_APK_ARM64_URL} target="_blank" rel="noopener noreferrer">
              arm64 APK
            </a>
          </p>

          <Link href="/" className="btn btn--block">
            ← 상품캡처 앱으로 돌아가기
          </Link>
        </section>
      </main>
    </div>
  );
}

export default function KiwiSetupPage() {
  return (
    <Suspense fallback={<div className="app"><main className="app-main">로딩…</main></div>}>
      <KiwiSetupContent />
    </Suspense>
  );
}

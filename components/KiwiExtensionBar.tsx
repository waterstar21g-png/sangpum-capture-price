'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ITEMSCOUT_EXTENSION_NAME,
  isAndroidDevice,
  isItemscoutExtensionMarkedInstalled,
  kiwiSetupPageUrl,
  markItemscoutExtensionInstalled,
  openItemscoutExtensionGuide,
  openKiwiApkDownload,
  openKiwiInstallPage,
  copyKiwiExtensionsAddress,
  reinstallItemscoutExtensionInKiwi,
} from '@/lib/kiwi-browser';

/** Android 휴대폰 — Kiwi + 아이템스카우트 확장 설치·재설치 */
export function KiwiExtensionBar() {
  const [installed, setInstalled] = useState(false);
  const [hint, setHint] = useState('');

  const refreshInstalled = useCallback(() => {
    setInstalled(isItemscoutExtensionMarkedInstalled());
  }, []);

  useEffect(() => {
    refreshInstalled();
  }, [refreshInstalled]);

  if (!isAndroidDevice()) return null;

  return (
    <div className="kiwi-bar">
      <p className="kiwi-bar__title">📱 Android · Kiwi Browser</p>
      {!installed ? (
        <>
          <p className="kiwi-bar__text">
            Play 스토어 Kiwi는 <strong>종료</strong>되었습니다. GitHub APK 설치 후, 확장은{' '}
            <strong>Kiwi 앱 안</strong>에서만 추가하세요. (앱 선택창·Intent는 홈화면만 열릴 수
            있음)
          </p>
          <ol className="kiwi-bar__steps">
            <li>
              <strong>Kiwi APK 받기</strong> → 설치
            </li>
            <li>
              Kiwi 실행 → ⋮ → <strong>Extensions</strong> → <strong>+ (스토어)</strong>
            </li>
            <li>
              <strong>{ITEMSCOUT_EXTENSION_NAME}</strong> → <strong>Chrome에 추가</strong>
            </li>
            <li>
              <strong>설치 완료</strong> 버튼
            </li>
          </ol>
          <p className="kiwi-bar__warn">
            「추세 확인」→ 앱 선택에서 <strong>Kiwi</strong> → itemscout 자동 이동. 홈만 열리면
            복사된 링크를 Kiwi 주소창에 붙여넣기.
          </p>
          <div className="kiwi-bar__actions">
            <button
              type="button"
              className="kiwi-bar__btn kiwi-bar__btn--primary"
              onClick={() => setHint(openKiwiInstallPage().message)}
            >
              Kiwi APK 받기
            </button>
            <button
              type="button"
              className="kiwi-bar__btn"
              onClick={() => setHint(openKiwiApkDownload().message)}
            >
              arm64 바로 받기
            </button>
            <button
              type="button"
              className="kiwi-bar__btn"
              onClick={async () => setHint((await copyKiwiExtensionsAddress()).message)}
            >
              확장 주소 복사
            </button>
            <button
              type="button"
              className="kiwi-bar__btn"
              onClick={() => setHint(openItemscoutExtensionGuide().message)}
            >
              확장 설치 안내
            </button>
            <a className="kiwi-bar__btn" href={kiwiSetupPageUrl('install')}>
              상세 안내
            </a>
            <button
              type="button"
              className="kiwi-bar__btn kiwi-bar__btn--ok"
              onClick={() => {
                markItemscoutExtensionInstalled();
                refreshInstalled();
                setHint('');
              }}
            >
              설치 완료
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="kiwi-bar__text kiwi-bar__text--ok">
            Kiwi + {ITEMSCOUT_EXTENSION_NAME} 준비됨 · 「추세 확인」→ Kiwi 선택 → itemscout 자동
            이동.
          </p>
          <div className="kiwi-bar__actions">
            <button
              type="button"
              className="kiwi-bar__btn kiwi-bar__btn--primary"
              onClick={() => {
                setHint(reinstallItemscoutExtensionInKiwi().message);
                refreshInstalled();
              }}
            >
              확장 재설치 안내
            </button>
            <button
              type="button"
              className="kiwi-bar__btn"
              onClick={async () => setHint((await copyKiwiExtensionsAddress()).message)}
            >
              확장 주소 복사
            </button>
            <a className="kiwi-bar__btn" href={kiwiSetupPageUrl('extension')}>
              상세 안내
            </a>
          </div>
        </>
      )}
      {hint && <p className="kiwi-bar__hint">{hint}</p>}
    </div>
  );
}

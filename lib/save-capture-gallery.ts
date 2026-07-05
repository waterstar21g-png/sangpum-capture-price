/** 카메라 촬영 사진을 기기(갤러리·다운로드)에 저장 */

function captureFilename(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `상품캡처_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.jpg`;
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/** 카메라 촬영 직후 갤러리·사진첩에 복사 (갤러리 선택은 제외) */
export async function saveCaptureToGallery(
  source: Blob | string,
): Promise<{ ok: boolean; message: string }> {
  if (typeof window === 'undefined') {
    return { ok: false, message: '브라우저 환경이 아닙니다.' };
  }

  try {
    const blob =
      typeof source === 'string'
        ? await fetch(source).then(r => r.blob())
        : source;
    const name = captureFilename();

    // iOS: capture 입력으로 찍은 사진은 OS가 이미 사진 앱에 저장함
    if (isIOS()) {
      return { ok: true, message: '사진이 갤러리(사진 앱)에 저장되었습니다.' };
    }

    const url = URL.createObjectURL(blob);
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.rel = 'noopener';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return { ok: true, message: '사진이 갤러리·다운로드에 저장되었습니다.' };
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return { ok: false, message: '갤러리 저장에 실패했습니다.' };
  }
}

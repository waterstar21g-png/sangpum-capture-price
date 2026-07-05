import type { MetadataRoute } from 'next';

/** 모바일 홈 화면 추가(PWA) — Android Chrome · iOS Safari */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '상품캡처 및 가격조회',
    short_name: '상품캡처',
    description: '사진으로 상품을 인식하고 네이버·아이템스카우트 기반 가격·시장 정보를 조회합니다.',
    start_url: '/',
    scope: '/',
    id: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#f1f5f9',
    theme_color: '#0f172a',
    lang: 'ko',
    dir: 'ltr',
    categories: ['shopping', 'utilities'],
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}

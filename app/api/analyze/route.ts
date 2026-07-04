import { NextRequest, NextResponse } from 'next/server';
import { fetchKeywordAnalysis } from '@/lib/itemscout/client';
import { analyzeProductImage } from '@/lib/product-vision';

export const dynamic = 'force-dynamic';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function parseDataUrl(dataUrl: string): { mime: string; bytes: number } | null {
  const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!m) return null;
  const bytes = Math.ceil((m[2].length * 3) / 4);
  return { mime: m[1], bytes };
}

export async function POST(req: NextRequest) {
  let body: {
    imageDataUrl?: string;
    keyword?: string;
    productName?: string;
    hint?: string;
    skipVision?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: 'invalid_json' }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const imageDataUrl = body.imageDataUrl?.trim();
  const directKeyword = body.keyword?.trim();
  const directProductName = body.productName?.trim();

  let keyword = directKeyword ?? '';
  let productName = directProductName ?? '';
  let category: string | undefined;
  let visionConfidence: number | undefined;

  if (!keyword || !productName) {
    if (!imageDataUrl) {
      return NextResponse.json(
        { ok: false, code: 'no_input', message: '상품 사진 또는 키워드를 입력해 주세요.' },
        { status: 400 },
      );
    }

    const parsed = parseDataUrl(imageDataUrl);
    if (!parsed) {
      return NextResponse.json(
        { ok: false, code: 'invalid_image', message: '이미지 형식이 올바르지 않습니다.' },
        { status: 400 },
      );
    }
    if (parsed.bytes > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { ok: false, code: 'image_too_large', message: '이미지 크기는 8MB 이하여야 합니다.' },
        { status: 400 },
      );
    }

    if (!body.skipVision) {
      if (!apiKey) {
        return NextResponse.json(
          {
            ok: false,
            code: 'no_openai_key',
            message: '상품 인식을 위해 OPENAI_API_KEY가 필요합니다. 또는 키워드를 직접 입력해 주세요.',
          },
          { status: 503 },
        );
      }
      try {
        const vision = await analyzeProductImage(apiKey, { imageDataUrl, hint: body.hint });
        keyword = vision.keyword;
        productName = vision.productName;
        category = vision.category;
        visionConfidence = vision.confidence;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'vision_failed';
        console.error('[api/analyze] vision', msg);
        return NextResponse.json(
          { ok: false, code: 'vision_failed', message: '상품 이미지 인식에 실패했습니다.' },
          { status: 502 },
        );
      }
    } else {
      keyword = body.hint?.trim() || '상품';
      productName = body.hint?.trim() || '미식별 상품';
    }
  }

  try {
    const scout = await fetchKeywordAnalysis({ keyword, productName, category });
    return NextResponse.json({
      ok: true,
      vision:
        visionConfidence != null
          ? { confidence: visionConfidence, keyword, productName, category }
          : undefined,
      scout,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'scout_failed';
    console.error('[api/analyze] itemscout', msg);
    const isApi = msg.startsWith('itemscout_api:') || msg.startsWith('naver_api:');
    return NextResponse.json(
      {
        ok: false,
        code: isApi ? 'market_api_error' : 'scout_failed',
        message: isApi
          ? '시장 데이터 조회에 실패했습니다. API 키를 확인해 주세요.'
          : '상품 분석에 실패했습니다.',
      },
      { status: 502 },
    );
  }
}

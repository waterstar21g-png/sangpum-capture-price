import type { ProductVisionResult } from '@/lib/itemscout/types';

export interface ProductVisionInput {
  imageDataUrl: string;
  hint?: string;
}

function buildProductVisionPrompt(): string {
  return `당신은 한국 이커머스 상품 분석 전문가입니다.
사진에서 판매 상품을 식별하고 네이버 쇼핑·스마트스토어 키워드 검색에 적합한 키워드를 추출하세요.
JSON만 반환 (마크다운 금지). 키: productName, keyword, category, description, confidence

productName: 사진 속 상품의 한국어 상품명 (브랜드·모델·용량 등 포함, 80자 이내)
keyword: 아이템스카우트 키워드 분석에 사용할 핵심 검색 키워드 1개 (2~6단어, 띄어쓰기 포함)
category: 네이버 쇼핑 카테고리 추정 (예: 식품, 생활용품, 패션의류)
description: 상품 특징 1문장
confidence: 식별 신뢰도 0~1 (불확실하면 0.5 이하)`;
}

export async function analyzeProductImage(
  apiKey: string,
  input: ProductVisionInput,
): Promise<ProductVisionResult> {
  if (!input.imageDataUrl.startsWith('data:image/')) {
    throw new Error('invalid_image_format');
  }

  const model =
    process.env.OPENAI_VISION_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    'gpt-4o-mini';

  const userParts: Array<
    { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }
  > = [];
  if (input.hint?.trim()) {
    userParts.push({ type: 'text', text: `사용자 힌트: ${input.hint.trim()}` });
  }
  userParts.push({ type: 'image_url', image_url: { url: input.imageDataUrl } });

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 600,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildProductVisionPrompt() },
        { role: 'user', content: userParts },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`vision_upstream:${res.status}:${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = data.choices?.[0]?.message?.content?.trim() ?? '';
  if (!raw) throw new Error('empty_vision_response');

  let parsed: ProductVisionResult;
  try {
    parsed = JSON.parse(raw) as ProductVisionResult;
  } catch {
    throw new Error('invalid_vision_json');
  }

  parsed.productName = (parsed.productName ?? '미식별 상품').slice(0, 120);
  parsed.keyword = (parsed.keyword ?? parsed.productName).slice(0, 80).trim();
  parsed.category = (parsed.category ?? '기타').slice(0, 40);
  parsed.description = (parsed.description ?? '').slice(0, 200);
  parsed.confidence = Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5));

  return parsed;
}

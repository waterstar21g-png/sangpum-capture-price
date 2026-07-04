'use client';

import type { ViewTrendPoint } from '@/lib/itemscout/types';

interface Props {
  data: ViewTrendPoint[];
  height?: number;
}

export function ViewTrendChart({ data, height = 160 }: Props) {
  if (!data.length) {
    return <p className="chart-empty">조회 추세 데이터가 없습니다.</p>;
  }

  const pad = { top: 16, right: 12, bottom: 32, left: 44 };
  const width = 360;
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const maxViews = Math.max(...data.map(d => d.views), 1);
  const minViews = Math.min(...data.map(d => d.views));
  const range = Math.max(maxViews - minViews, maxViews * 0.2, 1);

  const points = data.map((d, i) => {
    const x = pad.left + (i / Math.max(data.length - 1, 1)) * innerW;
    const y = pad.top + innerH - ((d.views - minViews) / range) * innerH;
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(pad.top + innerH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(pad.top + innerH).toFixed(1)} Z`;

  const yTicks = [0, 0.5, 1].map(t => ({
    value: Math.round(minViews + range * (1 - t)),
    y: pad.top + innerH * t,
  }));

  return (
    <svg className="trend-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="최근 1주간 조회 추세">
      <defs>
        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {yTicks.map(t => (
        <g key={t.value}>
          <line x1={pad.left} y1={t.y} x2={width - pad.right} y2={t.y} className="trend-chart__grid" />
          <text x={pad.left - 8} y={t.y + 4} textAnchor="end" className="trend-chart__axis">
            {formatCompact(t.value)}
          </text>
        </g>
      ))}
      <path d={areaPath} fill="url(#trendFill)" />
      <path d={linePath} className="trend-chart__line" fill="none" />
      {points.map(p => (
        <g key={p.date}>
          <circle cx={p.x} cy={p.y} r={4} className="trend-chart__dot" />
          <text x={p.x} y={height - 8} textAnchor="middle" className="trend-chart__label">{p.date}</text>
        </g>
      ))}
    </svg>
  );
}

function formatCompact(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`;
  return String(n);
}

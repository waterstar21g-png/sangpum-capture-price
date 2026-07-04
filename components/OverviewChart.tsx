'use client';

import type { OverviewChartPoint } from '@/lib/itemscout/types';

interface Props {
  data: OverviewChartPoint[];
  height?: number;
}

export function OverviewChart({ data, height = 180 }: Props) {
  if (!data.length) {
    return <p className="chart-empty">종합 차트 데이터가 없습니다.</p>;
  }

  const pad = { top: 20, right: 12, bottom: 36, left: 36 };
  const width = 360;
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const groupW = innerW / data.length;
  const barW = Math.max(6, groupW * 0.28);
  const maxPct = Math.max(...data.flatMap(d => [d.searchPct, d.clickPct]), 1);

  return (
    <div>
      <svg
        className="trend-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="검색량·클릭량 종합 차트"
      >
        {[0, 0.5, 1].map(t => {
          const y = pad.top + innerH * (1 - t);
          const val = Math.round(maxPct * t);
          return (
            <g key={t}>
              <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} className="trend-chart__grid" />
              <text x={pad.left - 6} y={y + 4} textAnchor="end" className="trend-chart__axis">
                {val}%
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const cx = pad.left + groupW * i + groupW / 2;
          const searchH = (d.searchPct / maxPct) * innerH;
          const clickH = (d.clickPct / maxPct) * innerH;
          const baseY = pad.top + innerH;
          return (
            <g key={d.label}>
              <rect
                x={cx - barW - 2}
                y={baseY - searchH}
                width={barW}
                height={searchH}
                rx={3}
                className="overview-bar overview-bar--search"
              />
              <rect
                x={cx + 2}
                y={baseY - clickH}
                width={barW}
                height={clickH}
                rx={3}
                className="overview-bar overview-bar--click"
              />
              <text x={cx} y={height - 10} textAnchor="middle" className="trend-chart__label">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="chart-legend">
        <span className="chart-legend__item">
          <i className="chart-legend__swatch chart-legend__swatch--search" /> 검색량(%)
        </span>
        <span className="chart-legend__item">
          <i className="chart-legend__swatch chart-legend__swatch--click" /> 클릭량(%)
        </span>
      </div>
    </div>
  );
}

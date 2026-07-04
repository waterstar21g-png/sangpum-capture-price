'use client';

import type { RatioSlice } from '@/lib/itemscout/types';

interface Props {
  data: RatioSlice[];
  colors?: string[];
}

const DEFAULT_COLORS = ['#2563eb', '#ea580c', '#16a34a', '#9333ea', '#0891b2', '#db2777'];

export function RatioBars({ data, colors = DEFAULT_COLORS }: Props) {
  if (!data.length) {
    return <p className="chart-empty">비율 데이터가 없습니다.</p>;
  }

  return (
    <ul className="ratio-list">
      {data.map((slice, i) => (
        <li key={slice.label} className="ratio-row">
          <div className="ratio-row__head">
            <span className="ratio-row__label">{slice.label}</span>
            <span className="ratio-row__pct">{slice.pct.toFixed(1)}%</span>
          </div>
          <div className="ratio-row__track">
            <div
              className="ratio-row__fill"
              style={{
                width: `${Math.min(100, Math.max(0, slice.pct))}%`,
                background: colors[i % colors.length],
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

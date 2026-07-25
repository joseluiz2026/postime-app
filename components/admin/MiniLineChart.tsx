"use client";

import { useState } from "react";

const WIDTH = 520;
const HEIGHT = 140;
const PAD_X = 8;
const PAD_TOP = 12;
const PAD_BOTTOM = 22;

export function MiniLineChart({
  title,
  days,
  values,
  color,
}: {
  title: string;
  days: string[];
  values: number[];
  color: string;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const max = Math.max(1, ...values);
  const plotW = WIDTH - PAD_X * 2;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const stepX = values.length > 1 ? plotW / (values.length - 1) : 0;

  const points = values.map((v, i) => ({
    x: PAD_X + i * stepX,
    y: PAD_TOP + plotH - (v / max) * plotH,
    v,
    day: days[i],
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1]?.x.toFixed(1) ?? 0},${(PAD_TOP + plotH).toFixed(1)} L${PAD_X},${(PAD_TOP + plotH).toFixed(1)} Z`;

  const gradientId = `mini-chart-gradient-${title.replace(/\s+/g, "-")}`;
  const hovered = hoverIdx !== null ? points[hoverIdx] : null;

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const idx = Math.round((x - PAD_X) / (stepX || 1));
    setHoverIdx(Math.max(0, Math.min(points.length - 1, idx)));
  }

  return (
    <div className="bg-[var(--bg-1)] border-[0.5px] border-[var(--line)] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-[var(--text-1)] m-0">{title}</h3>
        {hovered && (
          <span className="text-xs text-[var(--text-3)] font-mono">
            {hovered.day.slice(5)} · <span className="text-[var(--text-1)] font-semibold">{hovered.v}</span>
          </span>
        )}
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-[120px]"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line
          x1={PAD_X}
          y1={PAD_TOP + plotH}
          x2={WIDTH - PAD_X}
          y2={PAD_TOP + plotH}
          stroke="var(--line)"
          strokeWidth={1}
        />
        <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {hovered && (
          <>
            <line
              x1={hovered.x}
              y1={PAD_TOP}
              x2={hovered.x}
              y2={PAD_TOP + plotH}
              stroke="var(--line-strong)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <circle cx={hovered.x} cy={hovered.y} r={4} fill={color} stroke="var(--bg-1)" strokeWidth={2} />
          </>
        )}
        <text x={PAD_X} y={HEIGHT - 6} fontSize="10" fill="var(--text-3)">
          {days[0]?.slice(5)}
        </text>
        <text x={WIDTH - PAD_X} y={HEIGHT - 6} fontSize="10" fill="var(--text-3)" textAnchor="end">
          {days[days.length - 1]?.slice(5)}
        </text>
      </svg>
    </div>
  );
}

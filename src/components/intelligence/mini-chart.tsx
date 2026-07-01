"use client";

interface MiniChartProps {
  data: number[];
  height?: number;
  className?: string;
  positive?: boolean;
}

export function MiniChart({ data, height = 48, className = "", positive }: MiniChartProps) {
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 100 / (data.length - 1 || 1);

  const points = data.map((v, i) => {
    const x = i * w;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");

  const trend = data[data.length - 1] >= data[0];
  const stroke = positive ?? trend ? "#34d399" : "#f87171";

  return (
    <svg viewBox={`0 0 100 ${height}`} className={`w-full ${className}`} preserveAspectRatio="none">
      <polyline fill="none" stroke={stroke} strokeWidth="1.5" points={points} vectorEffect="non-scaling-stroke" />
      <polyline fill={`${stroke}22`} stroke="none" points={`0,${height} ${points} 100,${height}`} />
    </svg>
  );
}

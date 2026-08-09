const PALETTE = [
  "#0d9488",
  "#2563eb",
  "#f59e0b",
  "#e11d48",
  "#7c3aed",
  "#059669",
  "#0891b2",
  "#db2777",
];

export function BarChart({
  data,
  labelKey = "label",
  valueKey = "value",
  color = "#0d9488",
  height = 28,
}) {
  const max = Math.max(1, ...data.map((d) => d[valueKey]));

  if (data.length === 0) {
    return <p className="text-sm text-ink-500">No data yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2.5">
      {data.map((d, i) => {
        const pct = Math.max(4, Math.round((d[valueKey] / max) * 100));
        return (
          <div key={i} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between text-xs">
              <span className="truncate pr-2 font-medium text-ink-800">
                {d[labelKey]}
              </span>
              <span className="shrink-0 font-semibold text-ink-600">
                {d[valueKey]}
              </span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-ink-100"
              style={{ height }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  backgroundColor: color,
                  minHeight: height,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DonutChart({
  data,
  labelKey = "label",
  valueKey = "value",
  size = 160,
}) {
  const total = data.reduce((sum, d) => sum + d[valueKey], 0);
  const radius = size / 2;
  const stroke = size * 0.22;
  const r = radius - stroke / 2;
  const circumference = 2 * Math.PI * r;

  if (total === 0) {
    return <p className="text-sm text-ink-500">No data yet.</p>;
  }

  let offset = 0;
  const segments = data.map((d, i) => {
    const fraction = d[valueKey] / total;
    const dash = fraction * circumference;
    const segment = {
      ...d,
      color: PALETTE[i % PALETTE.length],
      dasharray: `${dash} ${circumference - dash}`,
      dashoffset: -offset,
    };
    offset += dash;
    return segment;
  });

  return (
    <div className="flex items-center gap-5">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="shrink-0 -rotate-90"
      >
        <circle
          cx={radius}
          cy={radius}
          r={r}
          fill="none"
          stroke="var(--color-ink-100)"
          strokeWidth={stroke}
        />
        {segments.map((s, i) => (
          <circle
            key={i}
            cx={radius}
            cy={radius}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeDasharray={s.dasharray}
            strokeDashoffset={s.dashoffset}
            strokeLinecap="butt"
          />
        ))}
      </svg>
      <div className="flex flex-col gap-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
            />
            <span className="text-ink-700">{d[labelKey]}</span>
            <span className="font-semibold text-ink-900">{d[valueKey]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LineChart({
  data,
  labelKey = "label",
  valueKey = "value",
  color = "#0d9488",
  width = 480,
  height = 140,
}) {
  if (data.length === 0) {
    return <p className="text-sm text-ink-500">No data yet.</p>;
  }

  const max = Math.max(1, ...data.map((d) => d[valueKey]));
  const padding = 24;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;

  const points = data.map((d, i) => {
    const x = padding + i * stepX;
    const y = padding + innerH - (d[valueKey] / max) * innerH;
    return { x, y, ...d };
  });

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");
  const areaPath = `${path} L${points[points.length - 1].x},${padding + innerH} L${points[0].x},${padding + innerH} Z`;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      <path d={areaPath} fill={color} opacity="0.08" />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.5" fill={color} />
          <text
            x={p.x}
            y={height - 4}
            textAnchor="middle"
            fontSize="10"
            fill="var(--color-ink-500)"
          >
            {p[labelKey]}
          </text>
        </g>
      ))}
    </svg>
  );
}

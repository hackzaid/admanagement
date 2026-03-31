type BarDatum = {
  label: string;
  value: number;
  sublabel?: string;
};

export function HorizontalBars({
  data,
  tone = "blue",
}: {
  data: BarDatum[];
  tone?: "blue" | "amber";
}) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="bars">
      {data.map((item, index) => (
        <div className="bar-row" key={`${item.label}-${item.sublabel ?? "row"}-${index}`}>
          <div className="bar-copy">
            <div className="bar-label">{item.label}</div>
            {item.sublabel ? <div className="bar-sublabel">{item.sublabel}</div> : null}
          </div>
          <div className="bar-track">
            <div
              className={`bar-fill bar-fill-${tone}`}
              style={{ width: `${Math.max((item.value / maxValue) * 100, 8)}%` }}
            />
          </div>
          <div className="bar-value">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function VerticalBars({ data }: { data: BarDatum[] }) {
  const safeData = data.length ? data : [{ label: "No data", value: 0 }];
  const maxValue = Math.max(...safeData.map((item) => item.value), 1);

  return (
    <div className="vbars">
      {safeData.map((item, index) => (
        <div className="vbar-row" key={`${item.label}-${item.sublabel ?? "bar"}-${index}`}>
          <div className="vbar-copy">
            <div className="vbar-label">{item.label}</div>
            {item.sublabel ? <div className="vbar-sublabel">{item.sublabel}</div> : null}
          </div>
          <div className="vbar-track">
            <div className="vbar-fill" style={{ width: `${Math.max((item.value / maxValue) * 100, 6)}%` }} />
          </div>
          <div className="vbar-value">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function DonutSummary({
  segments,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
}) {
  const safeSegments = segments.length
    ? segments
    : [{ label: "No data", value: 1, color: "#d8d4ca" }];
  const total = Math.max(safeSegments.reduce((sum, segment) => sum + segment.value, 0), 1);
  let cursor = 0;
  const stops = safeSegments.map((segment) => {
    const start = cursor;
    const angle = (segment.value / total) * 360;
    cursor += angle;
    return `${segment.color} ${start}deg ${cursor}deg`;
  });

  return (
    <div className="donut-wrap">
      <div className="donut-chart" style={{ background: `conic-gradient(${stops.join(", ")})` }}>
        <div className="donut-hole">
          <strong>{total}</strong>
          <span>events</span>
        </div>
      </div>
      <div className="donut-legend">
        {safeSegments.map((segment) => (
          <div className="donut-legend-row" key={segment.label}>
            <span className="legend-swatch" style={{ backgroundColor: segment.color }} />
            <span>{segment.label}</span>
            <strong>{segment.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LinePulseChart({ values }: { values: number[] }) {
  const safeValues = values.length ? values : [0, 0, 0, 0];
  const maxValue = Math.max(...safeValues, 1);
  const points = safeValues
    .map((value, index) => {
      const x = (index / Math.max(safeValues.length - 1, 1)) * 100;
      const y = 100 - (value / maxValue) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="line-chart-wrap">
      <svg className="line-chart" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline className="line-chart-grid" points="0,100 100,100" />
        <polyline className="line-chart-path" points={points} />
        {safeValues.map((value, index) => {
          const x = (index / Math.max(safeValues.length - 1, 1)) * 100;
          const y = 100 - (value / maxValue) * 100;
          return <circle className="line-chart-dot" cx={x} cy={y} key={`${index}-${value}`} r="1.8" />;
        })}
      </svg>
      <div className="line-chart-axis">
        {safeValues.map((_, index) => (
          <span key={index}>{String(index).padStart(2, "0")}</span>
        ))}
      </div>
    </div>
  );
}

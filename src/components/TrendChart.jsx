import React, { useState } from 'react';

function buildPath(points, xFor, yFor, key) {
  const valid = points.filter((point) => Number.isFinite(point[key]));
  if (valid.length === 0) return '';
  return valid
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xFor(point)} ${yFor(point[key])}`)
    .join(' ');
}

function TrendChart({ title, points, valueFormatter, rawLabel = 'Raw', averageLabel = 'Moving avg' }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const width = 720;
  const height = 260;
  const values = points.flatMap((point) => [point.raw, point.average]).filter(Number.isFinite);
  const minValue = values.length ? Math.min(...values) : 0;
  const maxValue = values.length ? Math.max(...values) : 1;
  const axisLabelWidth = Math.max(valueFormatter(minValue).length, valueFormatter(maxValue).length) * 7;
  const padding = { top: 22, right: 24, bottom: 42, left: Math.min(104, Math.max(72, axisLabelWidth + 18)) };
  const range = Math.max(1, maxValue - minValue);
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const xFor = (point) => {
    const index = points.indexOf(point);
    return padding.left + (points.length <= 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
  };
  const yFor = (value) => padding.top + plotHeight - ((value - minValue) / range) * plotHeight;
  const tooltipPoint = hoveredPoint && {
    ...hoveredPoint,
    x: xFor(hoveredPoint),
    y: yFor(hoveredPoint.raw),
  };

  if (points.length === 0) {
    return (
      <div className="chart-empty">
        <strong>{title}</strong>
        <span>Log data to populate this chart.</span>
      </div>
    );
  }

  return (
    <div className="chart-wrap">
      <div className="chart-head">
        <h2>{title}</h2>
        <div className="chart-legend">
          <span className="raw">{rawLabel}</span>
          <span className="avg">{averageLabel}</span>
        </div>
      </div>
      <svg className="trend-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} />
        <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} />
        <text x={padding.left - 8} y={padding.top + 5} textAnchor="end">
          {valueFormatter(maxValue)}
        </text>
        <text x={padding.left - 8} y={height - padding.bottom} textAnchor="end">
          {valueFormatter(minValue)}
        </text>
        <path className="raw-line" d={buildPath(points, xFor, yFor, 'raw')} />
        <path className="avg-line" d={buildPath(points, xFor, yFor, 'average')} />
        {points.map((point) => (
          <g key={point.id || point.date}>
            <circle
              className="raw-dot"
              cx={xFor(point)}
              cy={yFor(point.raw)}
              r="5"
              tabIndex="0"
              role="button"
              aria-label={`${point.date}: ${rawLabel} ${valueFormatter(point.raw)}, ${averageLabel} ${valueFormatter(point.average)}`}
              onFocus={() => setHoveredPoint(point)}
              onBlur={() => setHoveredPoint(null)}
              onMouseEnter={() => setHoveredPoint(point)}
              onMouseLeave={() => setHoveredPoint(null)}
            />
            <text x={xFor(point)} y={height - 12} textAnchor="middle">
              {point.date.slice(5)}
            </text>
          </g>
        ))}
        {tooltipPoint && (
          <g className="chart-tooltip" pointerEvents="none">
            <line x1={tooltipPoint.x} y1={padding.top} x2={tooltipPoint.x} y2={height - padding.bottom} />
            <rect x={Math.min(width - 220, Math.max(padding.left, tooltipPoint.x - 98))} y={Math.max(8, tooltipPoint.y - 72)} width="196" height="58" rx="10" />
            <text x={Math.min(width - 205, Math.max(padding.left + 15, tooltipPoint.x - 83))} y={Math.max(29, tooltipPoint.y - 50)}>
              {tooltipPoint.date}
            </text>
            <text x={Math.min(width - 205, Math.max(padding.left + 15, tooltipPoint.x - 83))} y={Math.max(47, tooltipPoint.y - 32)}>
              {rawLabel}: {valueFormatter(tooltipPoint.raw)}
            </text>
            <text x={Math.min(width - 205, Math.max(padding.left + 15, tooltipPoint.x - 83))} y={Math.max(65, tooltipPoint.y - 14)}>
              {averageLabel}: {valueFormatter(tooltipPoint.average)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

export default TrendChart;

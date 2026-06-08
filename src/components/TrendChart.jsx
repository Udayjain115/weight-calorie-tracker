import React from 'react';

function buildPath(points, xFor, yFor, key) {
  const valid = points.filter((point) => Number.isFinite(point[key]));
  if (valid.length === 0) return '';
  return valid
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xFor(point)} ${yFor(point[key])}`)
    .join(' ');
}

function TrendChart({ title, points, valueFormatter, rawLabel = 'Raw', averageLabel = 'Moving avg' }) {
  const width = 720;
  const height = 260;
  const padding = { top: 20, right: 24, bottom: 38, left: 52 };
  const values = points.flatMap((point) => [point.raw, point.average]).filter(Number.isFinite);
  const minValue = values.length ? Math.min(...values) : 0;
  const maxValue = values.length ? Math.max(...values) : 1;
  const range = Math.max(1, maxValue - minValue);
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const xFor = (point) => {
    const index = points.indexOf(point);
    return padding.left + (points.length <= 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
  };
  const yFor = (value) => padding.top + plotHeight - ((value - minValue) / range) * plotHeight;

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
            <circle className="raw-dot" cx={xFor(point)} cy={yFor(point.raw)} r="4" />
            <text x={xFor(point)} y={height - 12} textAnchor="middle">
              {point.date.slice(5)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default TrendChart;

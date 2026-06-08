import React from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { formatWeight } from '../utils/units';

function ComparisonCard({ title, set, comparison, unit, missingLabel = 'Need data', compact = false }) {
  if (set) {
    return (
      <div className={compact ? 'comparison-cell current' : 'comparison-card current'}>
        <div className="comparison-heading">
          <span>{title}</span>
          <StatusPill tone="current" label="Current" />
        </div>
        <strong>{formatSet(set, unit)}</strong>
        {!compact && <small>{set.date || 'Active cycle'}</small>}
      </div>
    );
  }

  if (!comparison) {
    return (
      <div className={compact ? 'comparison-cell muted' : 'comparison-card muted'}>
        <div className="comparison-heading">
          <span>{title}</span>
          <StatusPill tone="muted" label="No data" />
        </div>
        <strong>{missingLabel}</strong>
      </div>
    );
  }

  const summary = comparisonSummary(comparison);
  return (
    <div className={compact ? `comparison-cell ${summary.tone}` : `comparison-card ${summary.tone}`}>
      <div className="comparison-heading">
        <span>{title}</span>
        <StatusPill tone={summary.tone} label={summary.label} />
      </div>
      <strong>{summary.headline}</strong>
      <div className="comparison-deltas">
        <DeltaChip label="Load" value={comparison.loadDelta} formatter={(value) => formatWeight(value, unit)} />
        <DeltaChip label="Reps" value={comparison.repsDelta} formatter={(value) => `${value} reps`} />
        <DeltaChip label="RIR" value={comparison.rirDelta} formatter={(value) => `${value} RIR`} />
      </div>
      {!compact && (
        <small>
          From {formatSet(comparison.baseline, unit)} to {formatSet(comparison.current, unit)}
        </small>
      )}
    </div>
  );
}

function StatusPill({ tone, label }) {
  const Icon = tone === 'gain' ? ArrowUpRight : tone === 'loss' ? ArrowDownRight : Minus;
  return (
    <span className={`comparison-status ${tone}`}>
      <Icon size={14} />
      {label}
    </span>
  );
}

function DeltaChip({ label, value, formatter }) {
  const tone = deltaTone(value);
  return (
    <span className={`delta-chip ${tone}`}>
      <small>{label}</small>
      <b>{formatDelta(value, formatter)}</b>
    </span>
  );
}

function comparisonSummary(comparison) {
  const { loadDelta, repsDelta, rirDelta } = comparison;
  const loadChanged = Math.abs(loadDelta) >= 0.01;
  const repsChanged = repsDelta !== 0;

  const match = [
    { when: loadDelta > 0, tone: 'gain', label: 'Gain', metric: 'Load', value: loadDelta },
    { when: !loadChanged && repsDelta > 0, tone: 'gain', label: 'Gain', metric: 'Reps', value: repsDelta },
    { when: !loadChanged && !repsChanged && rirDelta > 0, tone: 'gain', label: 'Easier', metric: 'RIR', value: rirDelta },
    { when: loadDelta < 0, tone: 'loss', label: 'Loss', metric: 'Load', value: loadDelta },
    { when: !loadChanged && repsDelta < 0, tone: 'loss', label: 'Loss', metric: 'Reps', value: repsDelta },
    { when: !loadChanged && !repsChanged && rirDelta < 0, tone: 'loss', label: 'Harder', metric: 'RIR', value: rirDelta },
    { when: rirDelta !== 0, tone: rirDelta > 0 ? 'gain' : 'loss', label: rirDelta > 0 ? 'Easier' : 'Harder', metric: 'RIR', value: rirDelta },
  ].find((rule) => rule.when);

  if (match) {
    return { tone: match.tone, label: match.label, headline: `${match.metric} ${formatSigned(match.value)}` };
  }

  return { tone: 'neutral', label: 'Match', headline: 'No change' };
}

function deltaTone(value) {
  if (value === null || value === undefined || Math.abs(value) < 0.01) return 'neutral';
  return value > 0 ? 'gain' : 'loss';
}

function formatSet(set, unit) {
  return `${formatWeight(set.weight, unit)} x ${set.reps}, RIR ${set.rir}`;
}

function formatDelta(value, formatter) {
  if (value === null || value === undefined) return 'Start';
  if (Math.abs(value) < 0.01) return 'No change';
  return `${value > 0 ? '+' : ''}${formatter(value)}`;
}

function formatSigned(value) {
  if (Math.abs(value) < 0.01) return '0';
  return `${value > 0 ? '+' : ''}${value}`;
}

export default ComparisonCard;

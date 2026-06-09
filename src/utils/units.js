const KG_TO_LB = 2.2046226218;

export function poundsFromDisplay(value, unit) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return unit === 'metric' ? parsed * KG_TO_LB : parsed;
}

export function displayFromPounds(value, unit) {
  if (!Number.isFinite(value)) return '';
  return unit === 'metric' ? (value / KG_TO_LB).toFixed(1) : value.toFixed(1);
}

export function formatWeight(value, unit) {
  const suffix = unit === 'metric' ? 'kg' : 'lb';
  return `${displayFromPounds(value, unit)} ${suffix}`;
}

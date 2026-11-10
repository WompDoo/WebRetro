interface CompactUnit {
  readonly threshold: number;
  readonly suffix: string;
}

const COMPACT_UNITS: readonly CompactUnit[] = [
  { threshold: 1e15, suffix: 'Q' },
  { threshold: 1e12, suffix: 'T' },
  { threshold: 1e9, suffix: 'B' },
  { threshold: 1e6, suffix: 'M' },
  { threshold: 1e3, suffix: 'K' },
];

const ONE_THOUSAND = 1e3;
const THREE_DIGITS = 100;
const TWO_DIGITS = 10;
const PERCENT = 100;

function formatWithSignificantDigits(value: number): string {
  const decimals = value >= THREE_DIGITS ? 0 : value >= TWO_DIGITS ? 1 : 2;
  return value.toFixed(decimals);
}

function formatBelowThousand(value: number): string {
  const isWhole = Number.isInteger(value) || value >= THREE_DIGITS;
  return isWhole ? Math.floor(value).toString() : formatWithSignificantDigits(value);
}

export function formatCompactNumber(value: number): string {
  const unit = COMPACT_UNITS.find((candidate) => Math.abs(value) >= candidate.threshold);
  return unit === undefined
    ? formatBelowThousand(value)
    : `${formatWithSignificantDigits(value / unit.threshold)}${unit.suffix}`;
}

function formatSmallMoney(value: number): string {
  const isWhole = Number.isInteger(value) || value >= THREE_DIGITS;
  return isWhole ? Math.floor(value).toString() : value.toFixed(2);
}

export function formatMoney(value: number): string {
  const amount = Math.abs(value) >= ONE_THOUSAND ? formatCompactNumber(value) : formatSmallMoney(value);
  return `$${amount}`;
}

export function formatPercent(share: number): string {
  return `${Math.round(share * PERCENT)}%`;
}

export function formatWholeNumber(value: number): string {
  return Math.floor(value).toLocaleString('en-US');
}

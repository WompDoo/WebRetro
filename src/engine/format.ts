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
/** Significant digits for a share under one percent. */
const SMALL_PERCENT_DIGITS = 2;

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

/** Money below zero (a fine bigger than the bank) reads "-$1.2B", not "$-1.2B". */
export function formatMoney(value: number): string {
  const size = Math.abs(value);
  const amount = size >= ONE_THOUSAND ? formatCompactNumber(size) : formatSmallMoney(size);
  return `${value < 0 ? '-' : ''}$${amount}`;
}

/** Whole percents, except under one: a 0.15% share still does something, so it says 0.15%, never 0%. */
export function formatPercent(share: number): string {
  const percent = share * PERCENT;
  const isWhole = Math.abs(percent) >= 1 || percent === 0;
  return isWhole ? `${Math.round(percent)}%` : `${Number(percent.toPrecision(SMALL_PERCENT_DIGITS))}%`;
}

export function formatWholeNumber(value: number): string {
  return Math.floor(value).toLocaleString('en-US');
}

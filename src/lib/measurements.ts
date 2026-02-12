export const WINDOW_TYPES = [
  'Single Hung',
  'Double Hung',
  'Slider',
  'Picture',
  'Casement',
  'Round',
  'Half-Round',
  'Other',
] as const;

export const SIMPLE_TYPES = ['Round', 'Half-Round'];
export const DETAILED_TYPES = ['Single Hung', 'Double Hung', 'Slider', 'Picture', 'Casement', 'Other'];
export const TRANSOM_ELIGIBLE_TYPES = ['Single Hung', 'Double Hung', 'Slider', 'Picture', 'Casement'];
export const TRANSOM_SHAPES = ['Rectangular', 'Half-Round', 'Other'] as const;

export const FRACTION_OPTIONS = [
  { value: 0, label: '0' },
  { value: 0.125, label: '1/8' },
  { value: 0.25, label: '1/4' },
  { value: 0.375, label: '3/8' },
  { value: 0.5, label: '1/2' },
  { value: 0.625, label: '5/8' },
  { value: 0.75, label: '3/4' },
  { value: 0.875, label: '7/8' },
];

export const GRID_STYLES = ['None', 'Colonial', 'Prairie', 'Perimeter'] as const;
export const TEMPER_OPTIONS = ['None', 'Lower', 'Full'] as const;
export const SCREEN_OPTIONS = ['None', 'Half', 'Full'] as const;

export function roundToEighth(num: number): number {
  return Math.floor(num * 8) / 8;
}

export function formatFraction(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return '';
  const whole = Math.floor(num);
  let fraction = Math.round((num - whole) * 8);
  if (fraction === 0) return `${whole}`;
  if (fraction === 8) return `${whole + 1}`;
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const divisor = gcd(fraction, 8);
  const numerator = fraction / divisor;
  const denominator = 8 / divisor;
  return whole > 0 ? `${whole} ${numerator}/${denominator}` : `${numerator}/${denominator}`;
}

export function splitValue(value: number): { whole: number; frac: number } {
  const whole = Math.floor(value);
  const frac = value - whole;
  const fractions = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875];
  const closest = fractions.reduce((prev, curr) =>
    Math.abs(curr - frac) < Math.abs(prev - frac) ? curr : prev
  );
  return { whole, frac: closest };
}

export function getCombinedValue(whole: string, frac: number): number {
  const w = parseFloat(whole) || 0;
  return w === 0 && frac === 0 ? NaN : w + frac;
}

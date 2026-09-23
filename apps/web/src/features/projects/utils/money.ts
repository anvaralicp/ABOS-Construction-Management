export type MoneyParseResult = 
  | { kind: 'valid'; minorUnits: number }
  | { kind: 'empty' }
  | { kind: 'invalid'; reason: string };

/**
 * The backend stores monetary values in minor units (e.g., cents/paise).
 * Formatting minor units to display uses standard Intl.NumberFormat safely.
 */
export function formatMoney(minorUnits: number | null | undefined, currency: string = 'USD'): string {
  if (minorUnits == null) return 'N/A';
  
  const majorUnits = minorUnits / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(majorUnits);
}

/**
 * Parses user input into deterministic integer minor units avoiding unsafe floating-point math.
 * Distinguishes intentional emptiness from invalid inputs or overflows.
 */
export function parseMoneyToMinorUnits(majorUnitsString: string | null | undefined): MoneyParseResult {
  if (majorUnitsString == null || typeof majorUnitsString !== 'string') return { kind: 'empty' };

  const trimmed = majorUnitsString.trim();
  if (trimmed === '') return { kind: 'empty' };

  // Reject strings containing invalid monetary characters structurally before stripping
  if (/[^0-9.,\-]/.test(trimmed)) {
    return { kind: 'invalid', reason: 'Contains non-numeric characters.' };
  }

  // Extract valid numerical parts, supporting optional minus sign and one decimal point
  const cleanString = trimmed.replace(/[^0-9.-]+/g, '');
  if (!cleanString || cleanString === '-' || cleanString === '.') {
    return { kind: 'invalid', reason: 'Invalid format.' };
  }

  // Enforce structural validity
  const match = cleanString.match(/^(-?)([0-9]*)(?:\.([0-9]*))?$/);
  if (!match) return { kind: 'invalid', reason: 'Multiple decimal points or invalid structure.' };

  const sign = match[1] === '-' ? -1 : 1;
  const integerPart = match[2] || '0';
  const fractionalPart = match[3] || '0';

  const majorBaseCents = parseInt(integerPart || '0', 10) * 100;
  
  // Pad the fractional part to at least 3 digits to compute half-up rounding for the cent securely
  const paddedFractional = fractionalPart.padEnd(3, '0');
  const centsString = paddedFractional.substring(0, 2);
  const remainderString = paddedFractional.substring(2);

  let cents = parseInt(centsString || '0', 10);
  
  // Deterministic Half-Up rounding for the remaining fraction
  const thirdDigit = parseInt(remainderString[0] || '0', 10);
  if (thirdDigit >= 5) {
    cents += 1;
  }
  
  const totalMinor = (majorBaseCents + cents) * sign;
  
  // Ensure we do not overflow JS max safe int
  if (totalMinor > Number.MAX_SAFE_INTEGER || totalMinor < Number.MIN_SAFE_INTEGER) {
    return { kind: 'invalid', reason: 'Value exceeds maximum safe integer limits.' };
  }

  return { kind: 'valid', minorUnits: totalMinor };
}\n
/**
 * Backend calculations are authoritative.
 * These utilities exist ONLY to construct a request payload compatible with the
 * backend's DTO validation (which enforces client values match backend values 
 * within 1 minor unit tolerance) and for immediate UI preview.
 */

export function calculateExpensePreview(quantity: number, unitPriceMinor: number, taxRate: number) {
  // quantity * unit_price (minor units)
  const subtotal = Math.round(quantity * unitPriceMinor);
  
  // Entire subtotal is taxable currently
  const taxableAmount = subtotal; 
  
  const taxAmount = Math.round(taxableAmount * (taxRate / 100));
  const totalAmount = subtotal + taxAmount;

  return {
    subtotal,
    taxable_amount: taxableAmount,
    tax_amount: taxAmount,
    total_amount: totalAmount,
  };
}

export function parseDecimalStrict(value: string | number | undefined | null): number | null {
  if (value === null || value === undefined || value === '') return null;
  const strValue = String(value).trim();
  if (strValue === '') return null;
  
  const parsed = Number(strValue);
  if (Number.isNaN(parsed) || !Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

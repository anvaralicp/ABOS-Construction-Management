import { parseMoneyToMinorUnits, formatMoney } from '../features/projects/utils/money';

describe('Money Utilities', () => {
  describe('parseMoneyToMinorUnits (deterministic conversion)', () => {
    it('handles standard valid inputs', () => {
      expect(parseMoneyToMinorUnits('1')).toEqual({ kind: 'valid', minorUnits: 100 });
      expect(parseMoneyToMinorUnits('1.00')).toEqual({ kind: 'valid', minorUnits: 100 });
      expect(parseMoneyToMinorUnits('1.01')).toEqual({ kind: 'valid', minorUnits: 101 });
      expect(parseMoneyToMinorUnits('10.10')).toEqual({ kind: 'valid', minorUnits: 1010 });
      expect(parseMoneyToMinorUnits('15000.50')).toEqual({ kind: 'valid', minorUnits: 1500050 });
    });

    it('handles deterministic half-up rounding', () => {
      expect(parseMoneyToMinorUnits('1.005')).toEqual({ kind: 'valid', minorUnits: 101 });
      expect(parseMoneyToMinorUnits('1.004')).toEqual({ kind: 'valid', minorUnits: 100 });
      expect(parseMoneyToMinorUnits('0.005')).toEqual({ kind: 'valid', minorUnits: 1 });
    });

    it('handles negative inputs', () => {
      expect(parseMoneyToMinorUnits('-10.10')).toEqual({ kind: 'valid', minorUnits: -1010 });
    });

    it('handles missing or zero padding', () => {
      expect(parseMoneyToMinorUnits('.50')).toEqual({ kind: 'valid', minorUnits: 50 });
      expect(parseMoneyToMinorUnits('50.')).toEqual({ kind: 'valid', minorUnits: 5000 });
      expect(parseMoneyToMinorUnits('001.50')).toEqual({ kind: 'valid', minorUnits: 150 });
      expect(parseMoneyToMinorUnits('0')).toEqual({ kind: 'valid', minorUnits: 0 });
    });

    it('handles intentional emptiness (clearing)', () => {
      expect(parseMoneyToMinorUnits('')).toEqual({ kind: 'empty' });
      expect(parseMoneyToMinorUnits('   ')).toEqual({ kind: 'empty' });
      expect(parseMoneyToMinorUnits(null)).toEqual({ kind: 'empty' });
      expect(parseMoneyToMinorUnits(undefined)).toEqual({ kind: 'empty' });
    });

    it('handles explicit invalid formats preventing corrupted parsing', () => {
      expect(parseMoneyToMinorUnits('abc').kind).toBe('invalid');
      expect(parseMoneyToMinorUnits('1abc').kind).toBe('invalid');
      expect(parseMoneyToMinorUnits('1.2.3').kind).toBe('invalid');
      expect(parseMoneyToMinorUnits('--1').kind).toBe('invalid');
    });

    it('handles unsafe overflowing magnitudes rejecting safely', () => {
      // 99999999999999999 dollars would overflow MAX_SAFE_INTEGER cents
      expect(parseMoneyToMinorUnits('99999999999999999').kind).toBe('invalid');
    });
  });

  describe('formatMoney', () => {
    it('formats minor units successfully', () => {
      expect(formatMoney(101)).toBe('$1.01');
      expect(formatMoney(1500050)).toBe('$15,000.50');
    });
  });
});

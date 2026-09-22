import { renderHook } from '@testing-library/react';
import { useEntitlements } from '../lib/entitlements';

jest.mock('../lib/auth-context', () => ({
  useAuth: () => ({ entitlements: ['feature:advanced_reports'] })
}));

describe('useEntitlements', () => {
  it('should return true if feature is enabled', () => {
    const { result } = renderHook(() => useEntitlements());
    expect(result.current.hasFeature('feature:advanced_reports')).toBe(true);
  });

  it('should return false if feature is missing', () => {
    const { result } = renderHook(() => useEntitlements());
    expect(result.current.hasFeature('feature:custom_domain')).toBe(false);
  });
});

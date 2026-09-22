import { renderHook } from '@testing-library/react';
import { usePermissions } from '../lib/permissions';

jest.mock('../lib/auth-context', () => ({
  useAuth: () => ({ permissions: ['projects:read', 'expenses:write'] })
}));

describe('usePermissions', () => {
  it('should return true for granted permissions', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasPermission('projects:read')).toBe(true);
  });

  it('should return false for missing permissions', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasPermission('reports:read')).toBe(false);
  });
});

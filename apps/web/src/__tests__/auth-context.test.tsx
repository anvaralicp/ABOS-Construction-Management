import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { AuthProvider } from '../lib/auth-context';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/dashboard'
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('AuthContext', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should execute logout/redirect only once for concurrent 401 events', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    
    render(<AuthProvider><div>Test</div></AuthProvider>);
    
    act(() => {
      window.dispatchEvent(new CustomEvent('auth:401'));
      window.dispatchEvent(new CustomEvent('auth:401'));
      window.dispatchEvent(new CustomEvent('auth:401'));
    });
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' });
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });
});

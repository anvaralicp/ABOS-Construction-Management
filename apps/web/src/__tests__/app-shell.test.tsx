import React from 'react';
import { render, screen } from '@testing-library/react';
import { AppShell } from '../components/layout/app-shell';

// Mock the dependencies
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/dashboard'
}));

jest.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    user: { name: 'Test User' },
    organization: { name: 'Test Org' },
    logout: jest.fn()
  })
}));

jest.mock('../lib/permissions', () => ({
  usePermissions: () => ({ hasPermission: () => true })
}));

describe('AppShell', () => {
  it('renders Sidebar and Header correctly', () => {
    render(
      <AppShell>
        <div data-testid="main-content">Content</div>
      </AppShell>
    );
    
    expect(screen.getByText('ABOS')).toBeInTheDocument(); // Sidebar
    expect(screen.getByText('Test Org')).toBeInTheDocument(); // Header
    expect(screen.getByTestId('main-content')).toBeInTheDocument(); // Content
  });
});

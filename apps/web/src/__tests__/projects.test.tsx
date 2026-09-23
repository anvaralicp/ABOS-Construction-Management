import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectsPage from '../app/(dashboard)/projects/page';
import ProjectDetailPage from '../app/(dashboard)/projects/[id]/page';
import EditProjectPage from '../app/(dashboard)/projects/[id]/edit/page';
import { projectsApi } from '../features/projects/api/projects.api';
import { usePermissions } from '../lib/permissions';

jest.mock('../features/projects/api/projects.api', () => ({
  projectsApi: {
    getProjects: jest.fn(),
    getProject: jest.fn(),
    createProject: jest.fn(),
    updateProject: jest.fn(),
    updateProjectStatus: jest.fn(),
    deleteProject: jest.fn(),
    getProjectMembers: jest.fn(),
  }
}));

jest.mock('../lib/permissions', () => ({
  usePermissions: jest.fn()
}));

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush })
}));

describe('Projects Web Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usePermissions as jest.Mock).mockReturnValue({
      hasPermission: () => true
    });
  });

  describe('Edit Project Page', () => {
    it('sends explicit null when intentionally clearing optional fields (Budget & Description)', async () => {
      (projectsApi.getProject as jest.Mock).mockResolvedValue({
        id: '1', name: 'Alpha', code: 'A01', description: 'Old Description', budget_amount: 500000
      });
      (projectsApi.updateProject as jest.Mock).mockResolvedValue({});
      
      render(<EditProjectPage params={{ id: '1' }} />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Description/i)).toHaveValue('Old Description');
        expect(screen.getByLabelText(/Budget Amount/i)).toHaveValue('5000');
      });
      
      const descInput = screen.getByLabelText(/Description/i);
      const budgetInput = screen.getByLabelText(/Budget Amount/i);
      
      await userEvent.clear(descInput);
      await userEvent.clear(budgetInput); // Intentionally empty budget string
      
      const submitBtn = screen.getByRole('button', { name: 'Save Changes' });
      await userEvent.click(submitBtn);
      
      await waitFor(() => {
        expect(projectsApi.updateProject).toHaveBeenCalledWith('1', expect.objectContaining({
          description: null,
          budget_amount: null
        }));
      });
    });

    it('rejects overflowing budget without mutating payload to null', async () => {
      (projectsApi.getProject as jest.Mock).mockResolvedValue({
        id: '1', name: 'Alpha', code: 'A01', budget_amount: 500000
      });
      
      render(<EditProjectPage params={{ id: '1' }} />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Budget Amount/i)).toHaveValue('5000');
      });
      
      const budgetInput = screen.getByLabelText(/Budget Amount/i);
      await userEvent.clear(budgetInput);
      await userEvent.type(budgetInput, '99999999999999999'); // Unsafe float
      
      const submitBtn = screen.getByRole('button', { name: 'Save Changes' });
      await userEvent.click(submitBtn);
      
      await waitFor(() => {
        // Assert updateProject is NOT invoked!
        expect(projectsApi.updateProject).not.toHaveBeenCalled();
        // Assert Validation error mounted cleanly
        expect(screen.getByText(/Budget Error:/i)).toBeInTheDocument();
      });
    });
  });

  describe('Lifecycle Status Updates', () => {
    it('renders Cancel action for ACTIVE project and triggers lifecycle update', async () => {
      (projectsApi.getProject as jest.Mock).mockResolvedValue({
        id: '1', name: 'Alpha', code: 'A01', status: 'ACTIVE'
      });
      (projectsApi.getProjectMembers as jest.Mock).mockResolvedValue([]);
      
      render(<ProjectDetailPage params={{ id: '1' }} />);
      
      await waitFor(() => {
        expect(screen.getByText('Alpha')).toBeInTheDocument();
      });
      
      const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
      await userEvent.click(cancelBtn);
      
      const confirmBtn = screen.getByRole('button', { name: 'Confirm Cancellation' });
      await userEvent.click(confirmBtn);
      
      await waitFor(() => {
        expect(projectsApi.updateProjectStatus).toHaveBeenCalledWith('1', 'CANCELLED');
      });
    });
  });
});

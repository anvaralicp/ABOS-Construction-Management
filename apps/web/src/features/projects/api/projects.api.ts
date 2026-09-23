import { fetchApi } from '@/lib/api';
import { Project, CreateProjectDto, UpdateProjectDto, ProjectStatus, ProjectMember } from '../types';

export const projectsApi = {
  getProjects: async (): Promise<Project[]> => {
    return fetchApi('/projects');
  },
  
  getProject: async (id: string): Promise<Project> => {
    return fetchApi(`/projects/${id}`);
  },
  
  createProject: async (data: CreateProjectDto): Promise<Project> => {
    return fetchApi('/projects', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  updateProject: async (id: string, data: UpdateProjectDto): Promise<Project> => {
    return fetchApi(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },
  
  updateProjectStatus: async (id: string, status: ProjectStatus): Promise<Project> => {
    return fetchApi(`/projects/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },
  
  deleteProject: async (id: string): Promise<void> => {
    return fetchApi(`/projects/${id}`, {
      method: 'DELETE'
    });
  },
  
  getProjectMembers: async (id: string): Promise<ProjectMember[]> => {
    return fetchApi(`/projects/${id}/members`);
  },
  
  addProjectMember: async (id: string, membershipId: string): Promise<void> => {
    return fetchApi(`/projects/${id}/members`, {
      method: 'POST',
      body: JSON.stringify({ organization_membership_id: membershipId })
    });
  },
  
  removeProjectMember: async (id: string, memberId: string): Promise<void> => {
    return fetchApi(`/projects/${id}/members/${memberId}`, {
      method: 'DELETE'
    });
  }
};

export type ProjectStatus = 'DRAFT' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';

export interface Project {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  description: string | null;
  address: string | null;
  status: ProjectStatus;
  start_date: string | null;
  expected_end_date: string | null;
  actual_end_date: string | null;
  budget_amount: number | null; // minor units
  currency: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  organization_membership_id: string;
  created_at: string;
  // Based on standard relations, this could include user info, but we'll assume basic structure for now
  user?: { name: string; email: string };
  role?: string;
}

export interface CreateProjectDto {
  name: string;
  code: string;
  description?: string;
  address?: string;
  start_date?: string;
  expected_end_date?: string;
  budget_amount?: number;
  currency?: string;
}

export interface UpdateProjectDto extends Partial<CreateProjectDto> {
  actual_end_date?: string;
}

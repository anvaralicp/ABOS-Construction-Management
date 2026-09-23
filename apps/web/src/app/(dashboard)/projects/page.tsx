'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { projectsApi } from '@/features/projects/api/projects.api';
import { Project, ProjectStatus } from '@/features/projects/types';
import { formatMoney } from '@/features/projects/utils/money';
import { usePermissions } from '@/lib/permissions';

const StatusBadge = ({ status }: { status: ProjectStatus }) => {
  const statusConfig: Record<ProjectStatus, { label: string, variant: 'default' | 'success' | 'warning' | 'danger' | 'secondary' }> = {
    DRAFT: { label: 'Draft', variant: 'secondary' },
    ACTIVE: { label: 'Active', variant: 'success' },
    ON_HOLD: { label: 'On Hold', variant: 'warning' },
    COMPLETED: { label: 'Completed', variant: 'default' },
    CANCELLED: { label: 'Cancelled', variant: 'danger' },
  };
  const config = statusConfig[status] || { label: status, variant: 'default' };
  
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('projects:write');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await projectsApi.getProjects();
      setProjects(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load projects.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={loadProjects} />;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-surface-900">Projects</h1>
        {canCreate && (
          <Link href="/projects/new">
            <Button>Create Project</Button>
          </Link>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {projects.length === 0 ? (
            <div className="p-6">
              <EmptyState 
                title="No projects found" 
                description="There are currently no projects in this organization." 
                action={canCreate ? <Link href="/projects/new"><Button variant="outline">Create Project</Button></Link> : undefined}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Expected End</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">{project.code}</TableCell>
                      <TableCell>{project.name}</TableCell>
                      <TableCell>
                        <StatusBadge status={project.status} />
                      </TableCell>
                      <TableCell>{formatMoney(project.budget_amount, project.currency || 'USD')}</TableCell>
                      <TableCell>{project.expected_end_date ? new Date(project.expected_end_date).toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/projects/${project.id}`}>
                          <Button variant="ghost" size="sm">View</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

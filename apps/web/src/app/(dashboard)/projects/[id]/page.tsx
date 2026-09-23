'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form';
import { Dialog, DialogHeader, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { projectsApi } from '@/features/projects/api/projects.api';
import { Project, ProjectStatus, ProjectMember } from '@/features/projects/types';
import { formatMoney } from '@/features/projects/utils/money';
import { usePermissions } from '@/lib/permissions';

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberId, setNewMemberId] = useState('');
  const [memberError, setMemberError] = useState<string | null>(null);
  const [memberActionLoading, setMemberActionLoading] = useState(false);

  const { hasPermission } = usePermissions();
  const canWrite = hasPermission('projects:write');
  const canDelete = hasPermission('projects:delete');
  const canReadMembers = hasPermission('project_members:read');
  const canWriteMembers = hasPermission('project_members:write');

  useEffect(() => {
    loadProject();
  }, [id]);

  useEffect(() => {
    if (project && canReadMembers) {
      loadMembers();
    }
  }, [project, canReadMembers]);

  const loadProject = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await projectsApi.getProject(id);
      setProject(data);
    } catch (err: any) {
      if (err.message.includes('404')) {
        setError('Project not found.');
      } else {
        setError(err.message || 'Failed to load project details.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      setMembersLoading(true);
      const data = await projectsApi.getProjectMembers(id);
      setMembers(data);
    } catch (err) {
      // Ignore members error for now
    } finally {
      setMembersLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleteError(null);
      await projectsApi.deleteProject(id);
      router.push('/projects');
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete project.');
    }
  };

  const updateStatus = async (newStatus: ProjectStatus) => {
    try {
      setStatusUpdating(true);
      setStatusError(null);
      const updated = await projectsApi.updateProjectStatus(id, newStatus);
      setProject(updated);
      setShowCancelDialog(false);
    } catch (err: any) {
      setStatusError(err.message || 'Failed to update status.');
    } finally {
      setStatusUpdating(false);
    }
  };
  
  const handleAddMember = async () => {
    if (!newMemberId.trim()) return;
    try {
      setMemberActionLoading(true);
      setMemberError(null);
      await projectsApi.addProjectMember(id, newMemberId.trim());
      setShowAddMember(false);
      setNewMemberId('');
      loadMembers();
    } catch (err: any) {
      setMemberError(err.message || 'Failed to add member.');
    } finally {
      setMemberActionLoading(false);
    }
  };
  
  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      setMemberActionLoading(true);
      await projectsApi.removeProjectMember(id, memberId);
      loadMembers();
    } catch (err: any) {
      alert(err.message || 'Failed to remove member.');
    } finally {
      setMemberActionLoading(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error || !project) return (
    <div className="space-y-4">
      <ErrorState message={error || 'Project not found.'} onRetry={loadProject} />
      <div className="flex justify-center">
        <Link href="/projects"><Button variant="outline">Back to Projects</Button></Link>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">{project.name}</h1>
          <p className="text-surface-500">Code: {project.code}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canWrite && (
            <Link href={`/projects/${project.id}/edit`}>
              <Button variant="outline">Edit</Button>
            </Link>
          )}
          {canDelete && (
            <Button variant="danger" onClick={() => setShowDeleteDialog(true)}>Delete</Button>
          )}
        </div>
      </div>
      
      {statusError && <div className="p-3 bg-danger-50 text-danger-700 text-sm rounded-md">{statusError}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <CardTitle>Project Information</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                {canWrite && project.status === 'DRAFT' && <Button size="sm" variant="outline" onClick={() => updateStatus('ACTIVE')} disabled={statusUpdating}>Activate</Button>}
                {canWrite && project.status === 'ACTIVE' && <Button size="sm" variant="outline" onClick={() => updateStatus('ON_HOLD')} disabled={statusUpdating}>Put On Hold</Button>}
                {canWrite && project.status === 'ACTIVE' && <Button size="sm" variant="outline" onClick={() => updateStatus('COMPLETED')} disabled={statusUpdating}>Complete</Button>}
                
                {/* Fixed: Backend explicitly allows ACTIVE -> CANCELLED */}
                {canWrite && (project.status === 'DRAFT' || project.status === 'ACTIVE' || project.status === 'ON_HOLD') && (
                  <Button size="sm" variant="danger" onClick={() => setShowCancelDialog(true)} disabled={statusUpdating}>Cancel</Button>
                )}
                
                {canWrite && project.status === 'ON_HOLD' && <Button size="sm" variant="outline" onClick={() => updateStatus('ACTIVE')} disabled={statusUpdating}>Resume</Button>}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-surface-500">Description</p>
                <p className="text-surface-900 mt-1">{project.description || 'No description provided.'}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-surface-500">Status</p>
                  <Badge className="mt-1" variant={project.status === 'ACTIVE' ? 'success' : project.status === 'CANCELLED' ? 'danger' : project.status === 'ON_HOLD' ? 'warning' : 'default'}>
                    {project.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-surface-500">Address</p>
                  <p className="text-surface-900 mt-1">{project.address || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-surface-500">Start Date</p>
                  <p className="text-surface-900 mt-1">{project.start_date ? new Date(project.start_date).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-surface-500">Expected End Date</p>
                  <p className="text-surface-900 mt-1">{project.expected_end_date ? new Date(project.expected_end_date).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-surface-500">Actual End Date</p>
                  <p className="text-surface-900 mt-1">{project.actual_end_date ? new Date(project.actual_end_date).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-surface-500">Budget</p>
                  <p className="text-surface-900 mt-1">{formatMoney(project.budget_amount, project.currency || 'USD')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {canReadMembers && (
            <Card>
              <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle>Project Members</CardTitle>
                {canWriteMembers && (
                  <Button size="sm" variant="outline" onClick={() => setShowAddMember(true)}>Add Member</Button>
                )}
              </CardHeader>
              <CardContent>
                {membersLoading ? <p className="text-sm text-surface-500">Loading members...</p> : 
                 members.length === 0 ? <p className="text-sm text-surface-500">No members assigned to this project.</p> : (
                  <ul className="space-y-2">
                    {members.map(member => (
                      <li key={member.id} className="flex justify-between items-center p-3 bg-surface-50 rounded border border-surface-200">
                        <div className="flex flex-col">
                          <span className="font-medium">{member.user?.name || member.id}</span>
                          <span className="text-xs text-surface-500">{member.role || 'Member'}</span>
                        </div>
                        {canWriteMembers && (
                          <Button size="sm" variant="ghost" onClick={() => handleRemoveMember(member.id)} disabled={memberActionLoading}>Remove</Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Related Modules</CardTitle>
            </CardHeader>
            <CardContent>
              <nav className="flex flex-col space-y-2">
                <Link href={`/projects/${project.id}/expenses`} className="text-brand-600 hover:underline">Expenses (Not Connected)</Link>
                <Link href={`/projects/${project.id}/budget`} className="text-brand-600 hover:underline">Budget (Not Connected)</Link>
                <Link href={`/projects/${project.id}/workforce`} className="text-brand-600 hover:underline">Workforce (Not Connected)</Link>
                <Link href={`/projects/${project.id}/equipment`} className="text-brand-600 hover:underline">Equipment (Not Connected)</Link>
                <Link href={`/projects/${project.id}/documents`} className="text-brand-600 hover:underline">Documents (Not Connected)</Link>
              </nav>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogHeader>
          <h2 className="text-lg font-bold">Delete Project</h2>
        </DialogHeader>
        <DialogContent>
          <p>Are you sure you want to delete <strong>{project.name}</strong>? This action cannot be undone.</p>
          {deleteError && <p className="text-sm text-danger mt-2">{deleteError}</p>}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete Project</Button>
        </DialogFooter>
      </Dialog>
      
      <Dialog open={showCancelDialog} onClose={() => setShowCancelDialog(false)}>
        <DialogHeader>
          <h2 className="text-lg font-bold">Cancel Project</h2>
        </DialogHeader>
        <DialogContent>
          <p>Are you sure you want to transition this project to <strong>CANCELLED</strong> status? This action is permanent and cannot be reversed natively via the UI.</p>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowCancelDialog(false)}>Go Back</Button>
          <Button variant="danger" onClick={() => updateStatus('CANCELLED')} disabled={statusUpdating}>Confirm Cancellation</Button>
        </DialogFooter>
      </Dialog>
      
      <Dialog open={showAddMember} onClose={() => { setShowAddMember(false); setMemberError(null); setNewMemberId(''); }}>
        <DialogHeader>
          <h2 className="text-lg font-bold">Add Project Member</h2>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
          <p className="text-sm text-surface-500">Provide the Organization Membership ID to add to this project.</p>
          {memberError && <p className="text-sm text-danger">{memberError}</p>}
          <FormField label="Membership ID (UUID)" htmlFor="member_id">
            <Input id="member_id" value={newMemberId} onChange={(e) => setNewMemberId(e.target.value)} placeholder="00000000-0000-0000-0000-000000000000" />
          </FormField>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowAddMember(false)}>Cancel</Button>
          <Button onClick={handleAddMember} disabled={memberActionLoading || !newMemberId.trim()}>Add Member</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

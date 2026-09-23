'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { projectsApi } from '@/features/projects/api/projects.api';
import { Project } from '@/features/projects/types';
import { parseMoneyToMinorUnits } from '@/features/projects/utils/money';

export default function EditProjectPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  
  const [project, setProject] = useState<Project | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    address: '',
    start_date: '',
    expected_end_date: '',
    actual_end_date: '',
    budget_amount_major: '',
    currency: 'USD',
  });

  useEffect(() => {
    loadProject();
  }, [id]);

  const loadProject = async () => {
    try {
      setLoadingInitial(true);
      setError(null);
      const data = await projectsApi.getProject(id);
      setProject(data);
      setFormData({
        name: data.name,
        code: data.code,
        description: data.description || '',
        address: data.address || '',
        start_date: data.start_date ? data.start_date.split('T')[0] : '',
        expected_end_date: data.expected_end_date ? data.expected_end_date.split('T')[0] : '',
        actual_end_date: data.actual_end_date ? data.actual_end_date.split('T')[0] : '',
        budget_amount_major: data.budget_amount != null ? (data.budget_amount / 100).toString() : '',
        currency: data.currency || 'USD',
      });
    } catch (err: any) {
      if (err.message.includes('404')) {
        setError('Project not found.');
      } else {
        setError(err.message || 'Failed to load project details.');
      }
    } finally {
      setLoadingInitial(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const budgetResult = parseMoneyToMinorUnits(formData.budget_amount_major);
      if (budgetResult.kind === 'invalid') {
        setError(`Budget Error: ${budgetResult.reason}`);
        setLoading(false);
        return;
      }
      
      const payload: any = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        currency: formData.currency.trim() || 'USD',
        
        description: formData.description.trim() === '' ? null : formData.description.trim(),
        address: formData.address.trim() === '' ? null : formData.address.trim(),
        start_date: formData.start_date.trim() === '' ? null : new Date(formData.start_date).toISOString(),
        expected_end_date: formData.expected_end_date.trim() === '' ? null : new Date(formData.expected_end_date).toISOString(),
        actual_end_date: formData.actual_end_date.trim() === '' ? null : new Date(formData.actual_end_date).toISOString(),
      };
      
      payload.budget_amount = budgetResult.kind === 'empty' ? null : budgetResult.minorUnits;

      await projectsApi.updateProject(id, payload);
      router.push(`/projects/${id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to update project.');
      setLoading(false);
    }
  };

  if (loadingInitial) return <LoadingState />;
  if (error && !project) return (
    <div className="space-y-4">
      <ErrorState message={error} onRetry={loadProject} />
      <div className="flex justify-center">
        <Link href={`/projects/${id}`}><Button variant="outline">Back to Project</Button></Link>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/projects/${id}`}>
          <Button variant="outline" size="sm">Back</Button>
        </Link>
        <h1 className="text-2xl font-bold text-surface-900">Edit Project</h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <div className="p-3 bg-danger-50 text-danger-700 text-sm rounded-md">{error}</div>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Project Name" htmlFor="name">
                <Input id="name" name="name" required value={formData.name} onChange={handleChange} />
              </FormField>
              <FormField label="Project Code" htmlFor="code">
                <Input id="code" name="code" required value={formData.code} onChange={handleChange} />
              </FormField>
            </div>

            <FormField label="Description" htmlFor="description">
              <Input id="description" name="description" value={formData.description} onChange={handleChange} />
            </FormField>

            <FormField label="Address" htmlFor="address">
              <Input id="address" name="address" value={formData.address} onChange={handleChange} />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Start Date" htmlFor="start_date">
                <Input id="start_date" name="start_date" type="date" value={formData.start_date} onChange={handleChange} />
              </FormField>
              <FormField label="Expected End Date" htmlFor="expected_end_date">
                <Input id="expected_end_date" name="expected_end_date" type="date" value={formData.expected_end_date} onChange={handleChange} />
              </FormField>
            </div>
            
            <FormField label="Actual End Date" htmlFor="actual_end_date">
              <Input id="actual_end_date" name="actual_end_date" type="date" value={formData.actual_end_date} onChange={handleChange} />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Budget Amount" htmlFor="budget_amount_major">
                {/* Removed type="number" step constraints allowing backend parser to intercept explicitly invalid strings */}
                <Input id="budget_amount_major" name="budget_amount_major" value={formData.budget_amount_major} onChange={handleChange} />
              </FormField>
              <FormField label="Currency" htmlFor="currency">
                <Input id="currency" name="currency" value={formData.currency} onChange={handleChange} />
              </FormField>
            </div>

          </CardContent>
          <CardFooter className="flex justify-end gap-2 bg-surface-50">
            <Link href={`/projects/${id}`}><Button variant="outline" type="button">Cancel</Button></Link>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

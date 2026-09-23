'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form';
import { projectsApi } from '@/features/projects/api/projects.api';
import { parseMoneyToMinorUnits } from '@/features/projects/utils/money';

export default function CreateProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    address: '',
    start_date: '',
    expected_end_date: '',
    budget_amount_major: '',
    currency: 'USD',
  });

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
      
      const payload = {
        name: formData.name,
        code: formData.code,
        description: formData.description || undefined,
        address: formData.address || undefined,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : undefined,
        expected_end_date: formData.expected_end_date ? new Date(formData.expected_end_date).toISOString() : undefined,
        budget_amount: budgetResult.kind === 'valid' ? budgetResult.minorUnits : undefined,
        currency: formData.currency || 'USD',
      };

      const newProject = await projectsApi.createProject(payload);
      router.push(`/projects/${newProject.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create project.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/projects">
          <Button variant="outline" size="sm">Back</Button>
        </Link>
        <h1 className="text-2xl font-bold text-surface-900">Create Project</h1>
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
                <Input id="name" name="name" required value={formData.name} onChange={handleChange} placeholder="e.g. Downtown Plaza" />
              </FormField>
              <FormField label="Project Code" htmlFor="code">
                <Input id="code" name="code" required value={formData.code} onChange={handleChange} placeholder="e.g. DP-2026" />
              </FormField>
            </div>

            <FormField label="Description" htmlFor="description">
              <Input id="description" name="description" value={formData.description} onChange={handleChange} placeholder="Brief description of the project" />
            </FormField>

            <FormField label="Address" htmlFor="address">
              <Input id="address" name="address" value={formData.address} onChange={handleChange} placeholder="Physical location" />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Start Date" htmlFor="start_date">
                <Input id="start_date" name="start_date" type="date" value={formData.start_date} onChange={handleChange} />
              </FormField>
              <FormField label="Expected End Date" htmlFor="expected_end_date">
                <Input id="expected_end_date" name="expected_end_date" type="date" value={formData.expected_end_date} onChange={handleChange} />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Budget Amount" htmlFor="budget_amount_major">
                <Input id="budget_amount_major" name="budget_amount_major" value={formData.budget_amount_major} onChange={handleChange} placeholder="e.g. 100000.00" />
              </FormField>
              <FormField label="Currency" htmlFor="currency">
                <Input id="currency" name="currency" value={formData.currency} onChange={handleChange} placeholder="USD" />
              </FormField>
            </div>

          </CardContent>
          <CardFooter className="flex justify-end gap-2 bg-surface-50">
            <Link href="/projects"><Button variant="outline" type="button">Cancel</Button></Link>
            <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Project'}</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

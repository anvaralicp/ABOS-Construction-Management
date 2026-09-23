'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form';
import { Select } from '@/components/ui/select';
import { categoriesApi } from '@/features/categories/api/categories.api';
import { CategoryTreeNode } from '@/features/categories/types';
import { flattenTreeForSelect } from '@/features/categories/utils/hierarchy';

export default function CreateCategoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [treeLoading, setTreeLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tree, setTree] = useState<CategoryTreeNode[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parent_id: '',
    is_active: true
  });

  useEffect(() => {
    loadTree();
  }, []);

  const loadTree = async () => {
    try {
      setTreeLoading(true);
      const data = await categoriesApi.getCategoryTree();
      setTree(data);
    } catch (err) {
      // Non-fatal if tree fails, just can't select parent easily
    } finally {
      setTreeLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        parent_id: formData.parent_id || undefined,
        is_active: formData.is_active
      };

      const newCat = await categoriesApi.createCategory(payload);
      router.push(`/categories/${newCat.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create category.');
      setLoading(false);
    }
  };

  const flatOptions = flattenTreeForSelect(tree);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/categories">
          <Button variant="outline" size="sm">Back</Button>
        </Link>
        <h1 className="text-2xl font-bold text-surface-900">Create Category</h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Category Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <div className="p-3 bg-danger-50 text-danger-700 text-sm rounded-md">{error}</div>}

            <FormField label="Category Name" htmlFor="name">
              <Input id="name" name="name" required maxLength={100} value={formData.name} onChange={handleChange} placeholder="e.g. Electrical Materials" />
            </FormField>

            <FormField label="Description" htmlFor="description">
              <Input id="description" name="description" maxLength={500} value={formData.description} onChange={handleChange} placeholder="Optional details..." />
            </FormField>

            <FormField label="Parent Category" htmlFor="parent_id">
              <Select id="parent_id" name="parent_id" value={formData.parent_id} onChange={handleChange} disabled={treeLoading}>
                <option value="">None (Top Level)</option>
                {flatOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>
                    {'\u00A0'.repeat(opt.depth * 4)} {opt.depth > 0 ? '└─ ' : ''}{opt.name}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-surface-500 mt-1">Leave empty to create a root-level category.</p>
            </FormField>

            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" id="is_active" name="is_active" checked={formData.is_active} onChange={handleChange} className="w-4 h-4 text-brand-600 border-surface-300 rounded focus:ring-brand-500" />
              <label htmlFor="is_active" className="text-sm font-medium text-surface-700">Active</label>
            </div>

          </CardContent>
          <CardFooter className="flex justify-end gap-2 bg-surface-50">
            <Link href="/categories"><Button variant="outline" type="button">Cancel</Button></Link>
            <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Category'}</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

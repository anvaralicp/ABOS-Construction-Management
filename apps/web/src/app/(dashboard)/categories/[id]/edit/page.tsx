'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form';
import { Select } from '@/components/ui/select';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { categoriesApi } from '@/features/categories/api/categories.api';
import { Category, CategoryTreeNode } from '@/features/categories/types';
import { flattenTreeForSelect, getDescendantIds } from '@/features/categories/utils/hierarchy';

export default function EditCategoryPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  
  const [category, setCategory] = useState<Category | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [tree, setTree] = useState<CategoryTreeNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parent_id: '',
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoadingInitial(true);
      setError(null);
      const data = await categoriesApi.getCategory(id);
      setCategory(data);
      setFormData({
        name: data.name,
        description: data.description || '',
        parent_id: data.parent_id || '',
        is_active: data.is_active
      });
      
      const treeData = await categoriesApi.getCategoryTree();
      setTree(treeData);
      setTreeLoading(false);
    } catch (err: any) {
      if (err.message.includes('404')) {
        setError('Category not found.');
      } else {
        setError(err.message || 'Failed to load category details.');
      }
    } finally {
      setLoadingInitial(false);
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
      const payload: any = {
        name: formData.name.trim(),
        is_active: formData.is_active,
      };

      // Following Projects Web Module nullable PATCH semantics natively:
      payload.description = formData.description.trim() === '' ? null : formData.description.trim();
      payload.parent_id = formData.parent_id === '' ? null : formData.parent_id;

      await categoriesApi.updateCategory(id, payload);
      router.push(`/categories/${id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to update category.');
      setLoading(false);
    }
  };

  // Prevent selecting self or any descendant as a parent
  const invalidParentIds = new Set([id, ...getDescendantIds(tree, id)]);
  const flatOptions = flattenTreeForSelect(tree);

  if (loadingInitial) return <LoadingState />;
  if (error && !category) return (
    <div className="space-y-4">
      <ErrorState message={error} onRetry={loadData} />
      <div className="flex justify-center">
        <Link href={`/categories/${id}`}><Button variant="outline">Back to Category</Button></Link>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/categories/${id}`}>
          <Button variant="outline" size="sm">Back</Button>
        </Link>
        <h1 className="text-2xl font-bold text-surface-900">Edit Category</h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Category Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <div className="p-3 bg-danger-50 text-danger-700 text-sm rounded-md">{error}</div>}

            <FormField label="Category Name" htmlFor="name">
              <Input id="name" name="name" required maxLength={100} value={formData.name} onChange={handleChange} />
            </FormField>

            <FormField label="Description" htmlFor="description">
              <Input id="description" name="description" maxLength={500} value={formData.description} onChange={handleChange} />
            </FormField>

            <FormField label="Parent Category" htmlFor="parent_id">
              <Select id="parent_id" name="parent_id" value={formData.parent_id} onChange={handleChange} disabled={treeLoading}>
                <option value="">None (Top Level)</option>
                {flatOptions.map(opt => {
                  const isInvalid = invalidParentIds.has(opt.id);
                  return (
                    <option key={opt.id} value={opt.id} disabled={isInvalid}>
                      {'\u00A0'.repeat(opt.depth * 4)} {opt.depth > 0 ? '└─ ' : ''}{opt.name} {isInvalid ? '(Invalid/Descendant)' : ''}
                    </option>
                  );
                })}
              </Select>
              <p className="text-xs text-surface-500 mt-1">Leave empty to convert into a root-level category.</p>
            </FormField>

            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" id="is_active" name="is_active" checked={formData.is_active} onChange={handleChange} className="w-4 h-4 text-brand-600 border-surface-300 rounded focus:ring-brand-500" />
              <label htmlFor="is_active" className="text-sm font-medium text-surface-700">Active</label>
            </div>

          </CardContent>
          <CardFooter className="flex justify-end gap-2 bg-surface-50">
            <Link href={`/categories/${id}`}><Button variant="outline" type="button">Cancel</Button></Link>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

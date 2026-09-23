'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { categoriesApi } from '@/features/categories/api/categories.api';
import { Category, CategoryTreeNode } from '@/features/categories/types';
import { usePermissions } from '@/lib/permissions';

export default function CategoryDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  
  const [category, setCategory] = useState<Category | null>(null);
  const [parent, setParent] = useState<Category | null>(null);
  const [children, setChildren] = useState<CategoryTreeNode[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { hasPermission } = usePermissions();
  const canWrite = hasPermission('categories:write');
  const canDelete = hasPermission('categories:delete');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await categoriesApi.getCategory(id);
      setCategory(data);
      
      if (data.parent_id) {
        try {
          const parentData = await categoriesApi.getCategory(data.parent_id);
          setParent(parentData);
        } catch (e) {
          // Parent might be deleted, safe to ignore
        }
      }
      
      const tree = await categoriesApi.getCategoryTree();
      
      // Find children by locating this node in the tree and pulling its immediate children
      const findNode = (nodes: CategoryTreeNode[]): CategoryTreeNode | null => {
        for (const n of nodes) {
          if (n.id === id) return n;
          const found = findNode(n.children || []);
          if (found) return found;
        }
        return null;
      };
      
      const selfNode = findNode(tree);
      setChildren(selfNode?.children || []);

    } catch (err: any) {
      if (err.message.includes('404')) {
        setError('Category not found.');
      } else {
        setError(err.message || 'Failed to load category details.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleteLoading(true);
      setDeleteError(null);
      await categoriesApi.deleteCategory(id);
      router.push('/categories');
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete category. It may have active subcategories.');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error || !category) return (
    <div className="space-y-4">
      <ErrorState message={error || 'Category not found.'} onRetry={loadData} />
      <div className="flex justify-center">
        <Link href="/categories"><Button variant="outline">Back to Categories</Button></Link>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">{category.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/categories">
            <Button variant="outline">List</Button>
          </Link>
          {canWrite && (
            <Link href={`/categories/${category.id}/edit`}>
              <Button variant="outline">Edit</Button>
            </Link>
          )}
          {canDelete && (
            <Button variant="danger" onClick={() => setShowDeleteDialog(true)}>Delete</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Category Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-surface-500">Description</p>
                <p className="text-surface-900 mt-1">{category.description || 'No description provided.'}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-surface-500">Status</p>
                  <Badge className="mt-1" variant={category.is_active ? 'success' : 'secondary'}>
                    {category.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-surface-500">Created At</p>
                  <p className="text-surface-900 mt-1">{new Date(category.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Subcategories ({children.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {children.length === 0 ? (
                <p className="text-sm text-surface-500">No subcategories.</p>
              ) : (
                <ul className="space-y-2">
                  {children.map(child => (
                    <li key={child.id} className="p-3 border border-surface-200 rounded-md flex justify-between items-center hover:bg-surface-50">
                      <div className="flex items-center gap-2">
                        <Link href={`/categories/${child.id}`} className="font-medium text-surface-900 hover:text-brand-600 hover:underline">
                          {child.name}
                        </Link>
                        {!child.is_active && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Inactive</Badge>}
                      </div>
                      <Link href={`/categories/${child.id}`}>
                        <Button size="sm" variant="ghost">View</Button>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Hierarchy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-surface-500 mb-1">Parent Category</p>
                  {parent ? (
                    <Link href={`/categories/${parent.id}`} className="text-brand-600 hover:underline font-medium">
                      ↑ {parent.name}
                    </Link>
                  ) : (
                    <p className="text-surface-500 text-sm italic">Top level (Root)</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogHeader>
          <h2 className="text-lg font-bold">Delete Category</h2>
        </DialogHeader>
        <DialogContent>
          <p>Are you sure you want to delete <strong>{category.name}</strong>?</p>
          <p className="text-sm text-surface-500 mt-2">The category must not have active subcategories.</p>
          {deleteError && <p className="text-sm text-danger mt-2">{deleteError}</p>}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleteLoading}>
            {deleteLoading ? 'Deleting...' : 'Delete Category'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

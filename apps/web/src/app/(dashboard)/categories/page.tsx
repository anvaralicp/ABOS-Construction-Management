'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { categoriesApi } from '@/features/categories/api/categories.api';
import { CategoryTreeNode } from '@/features/categories/types';
import { usePermissions } from '@/lib/permissions';

export default function CategoriesPage() {
  const [tree, setTree] = useState<CategoryTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission('categories:write');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await categoriesApi.getCategoryTree();
      setTree(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  };

  const filterTree = (nodes: CategoryTreeNode[], query: string): CategoryTreeNode[] => {
    if (!query) return nodes;
    
    return nodes.map(node => {
      const match = node.name.toLowerCase().includes(query.toLowerCase());
      const filteredChildren = filterTree(node.children || [], query);
      
      if (match || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      return null;
    }).filter(Boolean) as CategoryTreeNode[];
  };

  const filteredTree = filterTree(tree, searchQuery);

  const renderNode = (node: CategoryTreeNode, depth: number = 0) => {
    return (
      <div key={node.id} className="w-full">
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 border-b border-surface-200 hover:bg-surface-50 transition-colors ${depth === 0 ? 'bg-surface-100/50 font-medium' : ''}`}>
          <div className="flex items-center gap-3" style={{ paddingLeft: `${depth * 1.5}rem` }}>
            {depth > 0 && <span className="text-surface-300">└─</span>}
            <Link href={`/categories/${node.id}`} className="text-surface-900 hover:text-brand-600 hover:underline">
              {node.name}
            </Link>
            {!node.is_active && <Badge variant="secondary">Inactive</Badge>}
          </div>
          <div className="flex items-center gap-2 mt-2 sm:mt-0" style={{ paddingLeft: `${depth > 0 ? depth * 1.5 + 1.5 : 0}rem` }}>
            <Link href={`/categories/${node.id}`}>
              <Button variant="ghost" size="sm">View</Button>
            </Link>
            {canWrite && (
              <Link href={`/categories/${node.id}/edit`}>
                <Button variant="ghost" size="sm">Edit</Button>
              </Link>
            )}
          </div>
        </div>
        {node.children && node.children.length > 0 && (
          <div className="w-full">
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={loadCategories} />;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Categories</h1>
          <p className="text-surface-500">Manage hierarchical expense categories</p>
        </div>
        {canWrite && (
          <Link href="/categories/new">
            <Button>Create Category</Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3 border-b border-surface-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>Category Tree</CardTitle>
            <Input 
              placeholder="Search categories..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredTree.length === 0 ? (
            <div className="p-6">
              <EmptyState 
                title="No categories found" 
                message={searchQuery ? 'Adjust your search terms.' : 'Create your first category to get started.'} 
              />
            </div>
          ) : (
            <div className="flex flex-col w-full">
              {filteredTree.map(node => renderNode(node, 0))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export interface Category {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

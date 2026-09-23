import { CategoryTreeNode } from '../types';

/**
 * Recursively flattens a category tree to determine all descendants of a specific ID.
 * This is used to prevent cyclic selections when editing categories.
 */
export function getDescendantIds(nodes: CategoryTreeNode[], targetId: string, found = false): string[] {
  let descendants: string[] = [];
  
  for (const node of nodes) {
    if (node.id === targetId) {
      descendants = [...descendants, ...extractAllIds(node.children)];
    } else if (found) {
      descendants.push(node.id);
      descendants = [...descendants, ...extractAllIds(node.children)];
    } else {
      descendants = [...descendants, ...getDescendantIds(node.children, targetId, false)];
    }
  }
  
  return descendants;
}

function extractAllIds(nodes: CategoryTreeNode[]): string[] {
  let ids: string[] = [];
  for (const node of nodes) {
    ids.push(node.id);
    ids = [...ids, ...extractAllIds(node.children)];
  }
  return ids;
}

/**
 * Formats a hierarchical category display name for dropdowns
 */
export function flattenTreeForSelect(nodes: CategoryTreeNode[], depth = 0): { id: string, name: string, depth: number }[] {
  let result: { id: string, name: string, depth: number }[] = [];
  for (const node of nodes) {
    result.push({ id: node.id, name: node.name, depth });
    if (node.children && node.children.length > 0) {
      result = [...result, ...flattenTreeForSelect(node.children, depth + 1)];
    }
  }
  return result;
}

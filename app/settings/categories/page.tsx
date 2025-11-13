'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { useCategories } from '@/hooks/useCategories';
import { SYSTEM_CATEGORY_NAME } from '@/types';

const ManageCategoriesPage = () => {
  const {
    categoryTree,
    categoryOptions,
    createCategory,
    updateCategory,
    deleteCategory,
    loading,
    error,
    refreshCategories,
    systemCategory,
  } = useCategories();

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParentId, setNewCategoryParentId] = useState<string>('');
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingParentId, setEditingParentId] = useState<string>('');
  const [updating, setUpdating] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const savedCategoryOptions = useMemo(
    () =>
      categoryOptions.filter(
        (option) => !option.id.startsWith('legacy-') && option.id !== 'system-uncategorized',
      ),
    [categoryOptions],
  );

  type CategoryTreeNode = ReturnType<typeof useCategories>['categoryTree'][number];

  const findNodeById = (nodes: CategoryTreeNode[], id: string): CategoryTreeNode | null => {
    for (const node of nodes) {
      if (node.id === id) {
        return node;
      }
      const found = findNodeById(node.children, id);
      if (found) {
        return found;
      }
    }
    return null;
  };

  const collectDescendantIds = (node: CategoryTreeNode | null): Set<string> => {
    if (!node) return new Set();
    const ids = new Set<string>();
    const traverse = (current: CategoryTreeNode) => {
      current.children.forEach((child) => {
        ids.add(child.id);
        traverse(child);
      });
    };
    traverse(node);
    return ids;
  };

  const availableParentOptions = (categoryId: string | null) => {
    if (!categoryId) {
      return savedCategoryOptions;
    }
    const node = findNodeById(categoryTree, categoryId);
    const forbiddenIds = collectDescendantIds(node);
    forbiddenIds.add(categoryId);

    return savedCategoryOptions.filter((option) => !forbiddenIds.has(option.id));
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      setCreating(true);
      await createCategory(newCategoryName, newCategoryParentId || null);
      setNewCategoryName('');
      setNewCategoryParentId('');
    } catch (err) {
      console.error('Failed to create category:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleStartEdit = (categoryId: string) => {
    const node = findNodeById(categoryTree, categoryId);
    if (!node) return;
    setEditingId(categoryId);
    setEditingName(node.name);
    setEditingParentId(node.parent_id ?? '');
  };

  const handleUpdate = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingId) return;

    try {
      setUpdating(true);
      await updateCategory(editingId, {
        name: editingName,
        parent_id: editingParentId || null,
      });
      setEditingId(null);
      setEditingName('');
      setEditingParentId('');
    } catch (err) {
      console.error('Failed to update category:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (categoryId: string, categoryName: string) => {
    const confirmed = window.confirm(
      `Delete category "${categoryName}" and move all nested transactions back to ${SYSTEM_CATEGORY_NAME}?`,
    );
    if (!confirmed) return;

    try {
      setDeletingId(categoryId);
      await deleteCategory(categoryId);
    } catch (err) {
      console.error('Failed to delete category:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const renderTree = (nodes: CategoryTreeNode[], depth = 0) => {
    if (nodes.length === 0) {
      return null;
    }

    return (
      <ul className="space-y-3">
        {nodes.map((node) => {
          const isEditing = editingId === node.id;
          const isDeleting = deletingId === node.id;
          const isSystem = node.is_system;
          const parentOptions = availableParentOptions(node.id);

          return (
            <li key={node.id}>
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{node.name}</span>
                      {isSystem && (
                        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-600">
                          System
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{node.fullPath}</p>
                    {node.children.length > 0 && (
                      <p className="mt-1 text-xs text-gray-500">
                        {node.children.length} subcategor{node.children.length === 1 ? 'y' : 'ies'}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!isEditing && (
                      <button
                        onClick={() => handleStartEdit(node.id)}
                        disabled={isSystem}
                        className="inline-flex items-center rounded-md border border-blue-200 px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
                      >
                        Edit
                      </button>
                    )}
                    {!isSystem && (
                      <button
                        onClick={() => handleDelete(node.id, node.name)}
                        disabled={isDeleting}
                        className="inline-flex items-center rounded-md border border-red-200 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
                      >
                        {isDeleting ? 'Deleting…' : 'Delete'}
                      </button>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <form onSubmit={handleUpdate} className="mt-3 space-y-3 rounded-md bg-gray-50 p-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Name</label>
                      <input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        placeholder="Category name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Parent category</label>
                      <select
                        value={editingParentId}
                        onChange={(e) => setEditingParentId(e.target.value)}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      >
                        <option value="">Top level</option>
                        {parentOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={updating}
                        className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                      >
                        {updating ? 'Saving…' : 'Save changes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setEditingName('');
                          setEditingParentId('');
                        }}
                        className="text-sm font-medium text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {node.children.length > 0 && (
                <div className="ml-4 mt-3 border-l border-gray-200 pl-4">
                  {renderTree(node.children, depth + 1)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Category Settings</h1>
            <p className="text-sm text-gray-600">
              Organise your transaction categories, add subcategories, and curate the structure that works for you.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M9.707 3.293a1 1 0 010 1.414L6.414 8H17a1 1 0 110 2H6.414l3.293 3.293a1 1 0 01-1.414 1.414l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Back to dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-700">{error}</p>
              <button
                onClick={refreshCategories}
                className="mt-3 inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
              >
                Retry loading
              </button>
            </div>
          )}

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Add a new category</h2>
            <p className="mt-1 text-sm text-gray-600">
              Create custom categories and nest them under existing ones to mirror how you track spending.
            </p>

            <form onSubmit={handleCreate} className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700">Category name</label>
                <input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Fuel, Uber, Maintenance"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  required
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700">Parent category</label>
                <select
                  value={newCategoryParentId}
                  onChange={(e) => setNewCategoryParentId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Top level</option>
                  {savedCategoryOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {creating ? 'Adding…' : 'Add category'}
                </button>
                {systemCategory && (
                  <p className="text-xs text-gray-500">
                    Transactions without a category will default to <strong>{systemCategory.name}</strong>.
                  </p>
                )}
              </div>
            </form>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Existing categories</h2>
                <p className="text-sm text-gray-600">
                  {categoryTree.length === 0
                    ? 'No categories yet. Add your first custom category above.'
                    : 'Below is the current structure. Expand and edit to keep things organised.'}
                </p>
              </div>
              {loading && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Loading…
                </div>
              )}
            </div>

            <div className="mt-4">
              {renderTree(categoryTree)}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default ManageCategoriesPage;

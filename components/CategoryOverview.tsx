'use client';

import Link from 'next/link';
import { CategoryTreeNode } from '@/hooks/useCategories';

interface CategoryOverviewProps {
  categories: CategoryTreeNode[];
  isLoading: boolean;
}

const renderCategoryList = (nodes: CategoryTreeNode[], level = 0) => {
  if (!nodes.length) {
    return null;
  }

  return (
    <ul className={`space-y-2 ${level > 0 ? 'pl-4 border-l border-gray-200' : ''}`}>
      {nodes.map((node) => (
        <li key={node.id}>
          <div className="rounded-md border border-gray-200 bg-white px-3 py-2 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{node.name}</p>
                <p className="truncate text-xs text-gray-500">{node.fullPath}</p>
              </div>
              {node.children.length > 0 && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-blue-700">
                  {node.children.length} subcategor{node.children.length === 1 ? 'y' : 'ies'}
                </span>
              )}
            </div>
          </div>
          {node.children.length > 0 && renderCategoryList(node.children, level + 1)}
        </li>
      ))}
    </ul>
  );
};

export function CategoryOverview({ categories, isLoading }: CategoryOverviewProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Category Overview</h2>
          <p className="text-sm text-gray-600">
            Keep track of the categories and subcategories currently available for transactions.
          </p>
        </div>
        <Link
          href="/settings/categories"
          className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-blue-700 hover:bg-blue-100"
        >
          Manage
        </Link>
      </div>

      <div className="mt-4">
        {isLoading ? (
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
            Loading categories…
          </div>
        ) : categories.length === 0 ? (
          <p className="text-sm text-gray-500">
            No categories available yet. Start by adding your first custom category from the settings page.
          </p>
        ) : (
          <div className="space-y-4">
            {renderCategoryList(categories)}
          </div>
        )}
      </div>
    </div>
  );
}

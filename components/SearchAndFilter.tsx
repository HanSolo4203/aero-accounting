'use client';

import { useState } from 'react';
import { CategoryOption } from '@/hooks/useCategories';
import { SYSTEM_CATEGORY_NAME } from '@/types';

interface SearchAndFilterProps {
  categoryOptions: CategoryOption[];
  onFilterChange: (filters: FilterOptions) => void;
}

export interface FilterOptions {
  searchQuery: string;
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
  category: string;
}

export function SearchAndFilter({ categoryOptions, onFilterChange }: SearchAndFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: '',
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: '',
    category: 'all',
  });

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters = {
      searchQuery: '',
      dateFrom: '',
      dateTo: '',
      amountMin: '',
      amountMax: '',
      category: 'all',
    };
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'category') return value !== 'all';
    return value !== '';
  });

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">Search & Filter</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          {isExpanded ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>

      {/* Search Bar - Always Visible */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search transactions (description)..."
          value={filters.searchQuery}
          onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
          className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <svg
          className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Advanced Filters - Collapsible */}
      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All categories</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.label}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date From
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date To
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Amount Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Amount (R)
              </label>
              <input
                type="number"
                placeholder="0.00"
                step="0.01"
                value={filters.amountMin}
                onChange={(e) => handleFilterChange('amountMin', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Amount (R)
              </label>
              <input
                type="number"
                placeholder="0.00"
                step="0.01"
                value={filters.amountMax}
                onChange={(e) => handleFilterChange('amountMax', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="w-full px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && !isExpanded && (
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z"
              clipRule="evenodd"
            />
          </svg>
          <span>Filters active</span>
          {filters.category !== 'all' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2 py-0.5 text-gray-700">
              <span className="text-[10px] uppercase tracking-wide text-gray-500">Category</span>
              <span className="font-medium">
                {filters.category || SYSTEM_CATEGORY_NAME}
              </span>
            </span>
          )}
          <button
            onClick={clearFilters}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

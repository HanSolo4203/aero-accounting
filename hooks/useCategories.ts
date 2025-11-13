import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Category,
  CategorySeed,
  DEFAULT_CATEGORY_STRUCTURE,
  SYSTEM_CATEGORY_NAME,
} from '@/types';

const TEMP_USER_ID = 'temp-user-1';

type CategoryError = string | null;

export interface CategoryOption {
  id: string;
  label: string;
  isSystem: boolean;
}

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
  fullPath: string;
}

type PathMap = Record<string, string>;

type DescendantsMap = Record<string, string[]>;

const createChildrenMap = (categories: Category[]) => {
  const map = new Map<string | null, Category[]>();
  categories.forEach((category) => {
    const key = category.parent_id ?? null;
    const siblings = map.get(key) ?? [];
    siblings.push(category);
    map.set(key, siblings);
  });
  return map;
};

const buildTreeAndPaths = (categories: Category[]) => {
  const childrenMap = createChildrenMap(categories);
  const pathMap: PathMap = {};

  const buildNode = (category: Category, parentPath: string | null): CategoryTreeNode => {
    const fullPath = parentPath ? `${parentPath} → ${category.name}` : category.name;
    pathMap[category.id] = fullPath;
    const childNodes = (childrenMap.get(category.id) ?? [])
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((child) => buildNode(child, fullPath));

    return {
      ...category,
      children: childNodes,
      fullPath,
    };
  };

  const roots = (childrenMap.get(null) ?? [])
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((root) => buildNode(root, null));

  return { tree: roots, pathMap };
};

const buildDescendantsMap = (categories: Category[]) => {
  const childrenMap = createChildrenMap(categories);

  const collectDescendants = (categoryId: string): string[] => {
    const children = childrenMap.get(categoryId) ?? [];
    return children.reduce<string[]>((acc, child) => {
      acc.push(child.id);
      const nested = collectDescendants(child.id);
      acc.push(...nested);
      return acc;
    }, []);
  };

  const map: DescendantsMap = {};
  categories.forEach((category) => {
    map[category.id] = collectDescendants(category.id);
  });

  return map;
};

const flattenSeeds = (seeds: CategorySeed[], parentPath: string | null = null): string[] => {
  return seeds.flatMap((seed) => {
    const fullPath = parentPath ? `${parentPath} → ${seed.name}` : seed.name;
    const childPaths = seed.children ? flattenSeeds(seed.children, fullPath) : [];
    return [fullPath, ...childPaths];
  });
};

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<CategoryError>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', TEMP_USER_ID)
        .order('created_at', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      if ((data?.length ?? 0) === 0 && !isSeeding) {
        await seedDefaultCategories();
        return;
      }

      setCategories(data ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
      console.error('Error loading categories:', err);
    } finally {
      setLoading(false);
    }
  }, [isSeeding]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const seedDefaultCategories = useCallback(async () => {
    try {
      setIsSeeding(true);
      setError(null);

      const insertCategory = async (
        seed: CategorySeed,
        parentId: string | null,
      ): Promise<Category | null> => {
        const payload = {
          name: seed.name,
          parent_id: parentId,
          user_id: TEMP_USER_ID,
          is_system: seed.isSystem ?? false,
        };

        const { data, error: insertError } = await supabase
          .from('categories')
          .insert(payload)
          .select()
          .single();

        if (insertError) {
          console.error('Error seeding category:', insertError);
          throw new Error(insertError.message ?? 'Failed to seed categories');
        }

        const category = data as Category;

        if (seed.children?.length) {
          for (const child of seed.children) {
            await insertCategory(child, category.id);
          }
        }

        return category;
      };

      for (const seed of DEFAULT_CATEGORY_STRUCTURE) {
        await insertCategory(seed, null);
      }

      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to seed categories');
      console.error('Error seeding default categories:', err);
    } finally {
      setIsSeeding(false);
    }
  }, [loadCategories]);

  const { tree, pathMap } = useMemo(() => buildTreeAndPaths(categories), [categories]);
  const descendantsMap = useMemo(() => buildDescendantsMap(categories), [categories]);
  const seededCategoryPaths = useMemo(
    () => flattenSeeds(DEFAULT_CATEGORY_STRUCTURE),
    [],
  );

  const systemCategory = useMemo(
    () => categories.find((category) => category.is_system) ?? null,
    [categories],
  );

  const categoryOptions: CategoryOption[] = useMemo(() => {
    if (!categories.length) {
      return [
        {
          id: 'system-uncategorized',
          label: SYSTEM_CATEGORY_NAME,
          isSystem: true,
        },
      ];
    }

    return categories
      .map((category) => ({
        id: category.id,
        label: pathMap[category.id] ?? category.name,
        isSystem: category.is_system,
      }))
      .sort((a, b) => {
        if (a.isSystem && !b.isSystem) return -1;
        if (!a.isSystem && b.isSystem) return 1;
        return a.label.localeCompare(b.label);
      });
  }, [categories, pathMap]);

  const getCategoryFullPath = useCallback(
    (categoryId: string | null | undefined): string => {
      if (!categoryId) {
        return systemCategory
          ? pathMap[systemCategory.id] ?? systemCategory.name
          : SYSTEM_CATEGORY_NAME;
      }
      return pathMap[categoryId] ?? SYSTEM_CATEGORY_NAME;
    },
    [pathMap, systemCategory],
  );

  const createCategory = useCallback(
    async (name: string, parentId: string | null) => {
      try {
        const trimmedName = name.trim();
        if (!trimmedName) {
          throw new Error('Category name is required');
        }

        const payload = {
          name: trimmedName,
          parent_id: parentId,
          user_id: TEMP_USER_ID,
          is_system: false,
        };

        const { data, error: insertError } = await supabase
          .from('categories')
          .insert(payload)
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        setCategories((prev) => [...prev, data as Category]);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create category');
        console.error('Error creating category:', err);
        throw err;
      }
    },
    [],
  );

  const updateCategory = useCallback(
    async (categoryId: string, updates: { name?: string; parent_id?: string | null }) => {
      try {
        const category = categories.find((cat) => cat.id === categoryId);
        if (!category) {
          throw new Error('Category not found');
        }
        if (category.is_system) {
          throw new Error('System categories cannot be modified');
        }

        if (updates.parent_id) {
          if (updates.parent_id === categoryId) {
            throw new Error('A category cannot be its own parent');
          }
          const descendants = descendantsMap[categoryId] ?? [];
          if (descendants.includes(updates.parent_id)) {
            throw new Error('A category cannot be moved under one of its subcategories');
          }
        }

        const trimmedName = updates.name?.trim();
        if (updates.name !== undefined && !trimmedName) {
          throw new Error('Category name is required');
        }

        const payload = {
          ...(trimmedName !== undefined ? { name: trimmedName } : {}),
          ...(updates.parent_id !== undefined ? { parent_id: updates.parent_id } : {}),
        };

        const oldPathMap = { ...pathMap };
        const affectedIds = [categoryId, ...(descendantsMap[categoryId] ?? [])];

        const updatedCategories = categories.map((cat) => {
          if (cat.id === categoryId) {
            return {
              ...cat,
              ...(trimmedName !== undefined ? { name: trimmedName } : {}),
              ...(updates.parent_id !== undefined ? { parent_id: updates.parent_id } : {}),
            };
          }
          return cat;
        });

        const { error: updateError } = await supabase
          .from('categories')
          .update(payload)
          .eq('id', categoryId)
          .eq('user_id', TEMP_USER_ID);

        if (updateError) {
          throw updateError;
        }

        const newPathMap = buildTreeAndPaths(updatedCategories).pathMap;

        for (const affectedId of affectedIds) {
          const oldPath = oldPathMap[affectedId];
          const newPath = newPathMap[affectedId];
          if (oldPath && newPath && oldPath !== newPath) {
            const { error: txnUpdateError } = await supabase
              .from('transactions')
              .update({ category: newPath })
              .eq('user_id', TEMP_USER_ID)
              .eq('category', oldPath);

            if (txnUpdateError) {
              throw txnUpdateError;
            }
          }
        }

        setCategories(updatedCategories);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update category');
        console.error('Error updating category:', err);
        throw err;
      }
    },
    [categories, descendantsMap, pathMap],
  );

  const deleteCategory = useCallback(
    async (categoryId: string) => {
      try {
        const category = categories.find((cat) => cat.id === categoryId);
        if (!category) {
          throw new Error('Category not found');
        }
        if (category.is_system) {
          throw new Error('System categories cannot be deleted');
        }

        const affectedIds = [categoryId, ...(descendantsMap[categoryId] ?? [])];
        const pathsToReset = affectedIds
          .map((id) => pathMap[id])
          .filter((path): path is string => Boolean(path));

        const { error: deleteError } = await supabase
          .from('categories')
          .delete()
          .eq('user_id', TEMP_USER_ID)
          .eq('id', categoryId);

        if (deleteError) {
          throw deleteError;
        }

        if (pathsToReset.length) {
          for (const path of pathsToReset) {
            const { error: resetError } = await supabase
              .from('transactions')
              .update({ category: SYSTEM_CATEGORY_NAME })
              .eq('user_id', TEMP_USER_ID)
              .eq('category', path);

            if (resetError) {
              throw resetError;
            }
          }
        }

        setCategories((prev) => prev.filter((cat) => !affectedIds.includes(cat.id)));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete category');
        console.error('Error deleting category:', err);
        throw err;
      }
    },
    [categories, descendantsMap, pathMap],
  );

  return {
    categories,
    categoryTree: tree,
    categoryOptions,
    loading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    refreshCategories: loadCategories,
    getCategoryFullPath,
    systemCategory,
    seededCategoryPaths,
  };
}

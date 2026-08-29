'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, Folder, ChevronRight, ChevronDown } from 'lucide-react';
import { DEMO_CATEGORIES, buildCategoryTree } from '@/lib/demo-data';
import type { Category } from '@/types';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>(DEMO_CATEGORIES);
  const [editingCat, setEditingCat] = useState<Partial<Category> | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const tree = buildCategoryTree(categories);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCat?.name) return;

    if (isCreating) {
      const newCat: Category = {
        id: `cat-custom-${Date.now()}`,
        parent_id: editingCat.parent_id || null,
        name: editingCat.name,
        slug: editingCat.slug || editingCat.name.toLowerCase().replace(/\s+/g, '-'),
        description: editingCat.description || null,
        order_index: editingCat.order_index || categories.length + 1,
        icon: editingCat.icon || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setCategories([...categories, newCat]);
    } else {
      setCategories(
        categories.map((c) => (c.id === editingCat.id ? ({ ...c, ...editingCat, updated_at: new Date().toISOString() } as Category) : c))
      );
    }

    setEditingCat(null);
    setIsCreating(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa danh mục này? Tất cả danh mục con cũng sẽ bị ảnh hưởng.')) {
      setCategories(categories.filter((c) => c.id !== id && c.parent_id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">Quản lý Cây mục lục pháp luật</h2>
          <p className="text-xs text-gray-500">
            Tạo cây danh mục đa cấp, sắp xếp thứ tự hiển thị và phân loại văn bản
          </p>
        </div>

        <button
          onClick={() => {
            setIsCreating(true);
            setEditingCat({
              name: '',
              slug: '',
              parent_id: null,
              order_index: 1,
              icon: 'BookOpen',
            });
          }}
          className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Thêm danh mục mới
        </button>
      </div>

      {/* Category Hierarchical List */}
      <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-2 text-xs">
        {tree.map((root) => (
          <CategoryTreeRow
            key={root.id}
            category={root}
            depth={0}
            onEdit={(cat) => {
              setIsCreating(false);
              setEditingCat(cat);
            }}
            onDelete={handleDelete}
            onAddChild={(parentId) => {
              setIsCreating(true);
              setEditingCat({
                name: '',
                slug: '',
                parent_id: parentId,
                order_index: 1,
              });
            }}
          />
        ))}
      </div>

      {/* Edit / Create Modal */}
      {editingCat && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-900">
              {isCreating ? 'Tạo danh mục mới' : 'Chỉnh sửa danh mục'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-600 font-medium mb-1">Tên danh mục:</label>
                <input
                  type="text"
                  value={editingCat.name || ''}
                  onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
                  placeholder="VD: Thuế Tiêu thụ đặc biệt"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-600 font-medium mb-1">Thuộc danh mục cha:</label>
                <select
                  value={editingCat.parent_id || ''}
                  onChange={(e) => setEditingCat({ ...editingCat, parent_id: e.target.value || null })}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">(Cấp gốc - Không có cha)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Mã Slug:</label>
                  <input
                    type="text"
                    value={editingCat.slug || ''}
                    onChange={(e) => setEditingCat({ ...editingCat, slug: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="thue-ttdb"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Thứ tự hiển thị:</label>
                  <input
                    type="number"
                    value={editingCat.order_index || 1}
                    onChange={(e) => setEditingCat({ ...editingCat, order_index: Number(e.target.value) })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setEditingCat(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-semibold"
                >
                  Lưu danh mục
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryTreeRow({
  category,
  depth,
  onEdit,
  onDelete,
  onAddChild,
}: {
  category: Category;
  depth: number;
  onEdit: (cat: Category) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = (category.children?.length ?? 0) > 0;

  return (
    <div className="space-y-1">
      <div
        className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
        style={{ marginLeft: `${depth * 20}px` }}
      >
        <div className="flex items-center gap-2">
          {hasChildren ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-0.5 hover:bg-gray-100 rounded text-gray-500"
            >
              {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          ) : (
            <span className="w-3.5" />
          )}

          <Folder className="w-4 h-4 text-amber-500" />
          <span className="font-semibold text-gray-800">{category.name}</span>
          <span className="text-[10px] text-gray-400 font-mono">({category.slug})</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onAddChild(category.id)}
            className="p-1 text-green-600 hover:bg-green-50 rounded text-[11px] font-medium flex items-center gap-0.5"
            title="Thêm mục con"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mục con</span>
          </button>
          <button
            onClick={() => onEdit(category)}
            className="p-1 text-gray-500 hover:bg-gray-100 rounded"
            title="Sửa"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(category.id)}
            className="p-1 text-red-500 hover:bg-red-50 rounded"
            title="Xóa"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {hasChildren && expanded && (
        <div className="space-y-1">
          {category.children!.map((child) => (
            <CategoryTreeRow
              key={child.id}
              category={child}
              depth={depth + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}

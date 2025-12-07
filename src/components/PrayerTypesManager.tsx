import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Tag, Trash2, Edit2, GripVertical, Eye, EyeOff } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove as dndArrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Checkbox from './Checkbox';
import { supabase, directQuery, directMutation } from '../lib/supabase';
import type { PrayerTypeRecord } from '../types/prayer';

interface PrayerTypesManagerProps {
  onSuccess: () => void;
}

// Cache prayer types outside component to persist across re-mounts
let cachedPrayerTypes: PrayerTypeRecord[] | null = null;

export const PrayerTypesManager: React.FC<PrayerTypesManagerProps> = ({ onSuccess }) => {
  const [types, setTypes] = useState<PrayerTypeRecord[]>(cachedPrayerTypes || []);
  const [loading, setLoading] = useState(cachedPrayerTypes === null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const hasLoadedRef = useRef(cachedPrayerTypes !== null);
  
  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch types on mount
  useEffect(() => {
    if (!hasLoadedRef.current) {
      fetchTypes();
    }
  }, []);

  const fetchTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use directQuery to avoid Supabase client hang after browser minimize
      const { data, error } = await directQuery<PrayerTypeRecord[]>('prayer_types', {
        select: '*',
        order: { column: 'display_order', ascending: true },
        timeout: 15000
      });

      if (error) throw error;
      const typesData = data || [];
      setTypes(typesData);
      cachedPrayerTypes = typesData; // Cache for next mount
      hasLoadedRef.current = true;
    } catch (err: unknown) {
      console.error('Error fetching prayer types:', err);
      const errorMessage = err && typeof err === 'object' && 'message' in err ? String(err.message) : 'An error occurred'; setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Please enter a type name');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      if (editingId) {
        // Update existing type using directMutation
        const { error } = await directMutation('prayer_types', {
          method: 'PATCH',
          eq: { id: editingId },
          body: {
            name: name.trim(),
            display_order: displayOrder,
            is_active: isActive
          }
        });

        if (error) throw error;
        setSuccess('Prayer type updated successfully!');
      } else {
        // Add new type using directMutation
        const { error } = await directMutation('prayer_types', {
          method: 'POST',
          body: {
            name: name.trim(),
            display_order: displayOrder,
            is_active: isActive
          }
        });

        if (error) throw error;
        setSuccess('Prayer type added successfully!');
      }

      // Reset form
      setName('');
      setDisplayOrder(0);
      setIsActive(true);
      setEditingId(null);
      setShowAddForm(false);
      
      await fetchTypes();
      onSuccess();
    } catch (err: unknown) {
      console.error('Error saving prayer type:', err);
      const message = err && typeof err === 'object' && 'message' in err 
        ? String(err.message) 
        : 'Unknown error';
      setError(`Failed to save prayer type: ${message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (type: PrayerTypeRecord) => {
    setName(type.name);
    setDisplayOrder(type.display_order);
    setIsActive(type.is_active);
    setEditingId(type.id);
    setShowAddForm(true);
    setError(null);
    setSuccess(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the "${name}" type? This may affect existing prayer prompts using this type.`)) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      
      // Use directMutation to avoid Supabase client hang after browser minimize
      const { error } = await directMutation('prayer_types', {
        method: 'DELETE',
        eq: { id }
      });

      if (error) throw error;
      
      setSuccess('Prayer type deleted successfully!');
      await fetchTypes();
    } catch (err: unknown) {
      console.error('Error deleting prayer type:', err);
      const errorMessage = err && typeof err === 'object' && 'message' in err ? String(err.message) : 'An error occurred'; setError(errorMessage);
    }
  };

  const toggleActive = async (type: PrayerTypeRecord) => {
    try {
      setError(null);
      setSuccess(null);
      
      // Use directMutation to avoid Supabase client hang after browser minimize
      const { error } = await directMutation('prayer_types', {
        method: 'PATCH',
        eq: { id: type.id },
        body: { is_active: !type.is_active }
      });

      if (error) throw error;
      
      setSuccess(`Prayer type ${!type.is_active ? 'activated' : 'deactivated'} successfully!`);
      await fetchTypes();
    } catch (err: unknown) {
      console.error('Error toggling prayer type:', err);
      const errorMessage = err && typeof err === 'object' && 'message' in err ? String(err.message) : 'An error occurred'; setError(errorMessage);
    }
  };

  const [reordering, setReordering] = useState(false);

  // Small utility to move array element from one index to another (fallback)
  function arrayMove<T>(arr: T[], from: number, to: number) {
    const copy = arr.slice();
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    return copy;
  }

  const moveType = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = types.findIndex(t => t.id === id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= types.length) return;

    const original = types.slice();
    const newOrder = arrayMove(types, currentIndex, targetIndex);

    // Optimistically update UI
    setTypes(newOrder);
    setReordering(true);
    setError(null);

    try {
      // Update display_order for every type to match the new order (like marksportfolio)
      const updates = newOrder.map((t, idx) =>
        directMutation('prayer_types', {
          method: 'PATCH',
          eq: { id: t.id },
          body: { display_order: idx }
        })
      );

      await Promise.all(updates);

      // Refresh from server to ensure consistency
      await fetchTypes();
    } catch (err: unknown) {
      console.error('Error reordering prayer types:', err);
      const errorMessage = err && typeof err === 'object' && 'message' in err ? String(err.message) : 'An error occurred';
      setError(errorMessage);
      // Revert optimistic update
      setTypes(original);
    } finally {
      setReordering(false);
    }
  };

    // DnD Kit: sensors for pointer + keyboard
    const sensors = useSensors(
      useSensor(PointerSensor),
      useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    async function handleDragEnd(event: DragEndEvent) {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = types.findIndex((t) => t.id === String(active.id));
      const newIndex = types.findIndex((t) => t.id === String(over.id));
      if (oldIndex === -1 || newIndex === -1) return;

      const newOrder = dndArrayMove(types, oldIndex, newIndex);
      setTypes(newOrder);
      setReordering(true);
      setError(null);

      try {
        // Persist new order by updating display_order for each item
        const updates = newOrder.map((t, idx) =>
          directMutation('prayer_types', {
            method: 'PATCH',
            eq: { id: t.id },
            body: { display_order: idx }
          })
        );

        await Promise.all(updates);
        await fetchTypes();
      } catch (err: unknown) {
        console.error('Error saving order:', err);
        const errorMessage = err && typeof err === 'object' && 'message' in err ? String(err.message) : 'An error occurred';
        setError(errorMessage);
        // Revert to server state
        await fetchTypes();
      } finally {
        setReordering(false);
      }
    }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Tag className="text-indigo-600 dark:text-indigo-400" size={24} />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Prayer Types
          </h3>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingId(null);
            setName('');
            setDisplayOrder(types.length);
            setIsActive(true);
            setError(null);
            setSuccess(null);
          }}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm whitespace-nowrap"
        >
          <Plus size={18} />
          Add Type
        </button>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Manage the available types for prayer prompts. You can reorder, activate/deactivate, or delete types.
      </p>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3 mb-4">
          <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100">
              {editingId ? 'Edit Prayer Type' : 'Add New Prayer Type'}
            </h4>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setEditingId(null);
                setName('');
                setDisplayOrder(0);
                setIsActive(true);
                setError(null);
              }}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={20} />
            </button>
          </div>
          <div className="grid gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Healing, Guidance, Thanksgiving"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <Checkbox
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  boxClassName="border-gray-300 bg-white dark:bg-gray-800"
                  checkClassName="text-blue-600"
                  wrapperClassName="cursor-pointer"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
                </Checkbox>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Inactive types won't appear in dropdowns
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors text-sm"
            >
              {submitting ? 'Saving...' : editingId ? 'Update Type' : 'Add Type'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setEditingId(null);
                setName('');
                setDisplayOrder(0);
                setIsActive(true);
                setError(null);
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Types List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Loading types...</p>
        </div>
      ) : types.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Tag size={48} className="mx-auto mb-2 opacity-50" />
          <p>No prayer types found</p>
          <p className="text-sm mt-1">Add your first type to get started</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={types.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {types.map((type, index) => (
                <SortableRow
                  key={type.id}
                  type={type}
                  index={index}
                  total={types.length}
                  onEdit={() => handleEdit(type)}
                  onDelete={() => handleDelete(type.id, type.name)}
                  onToggle={() => toggleActive(type)}
                  reordering={reordering}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            Total: <span className="font-semibold">{types.length}</span> type(s)
            {types.filter(t => t.is_active).length < types.length && (
              <span className="ml-2">
                (<span className="font-semibold">{types.filter(t => t.is_active).length}</span> active)
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

// SortableRow component used by DnD context
function SortableRow({
  type,
  index,
  total,
  onEdit,
  onDelete,
  onToggle,
  reordering,
}: {
  type: PrayerTypeRecord;
  index: number;
  total: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  reordering: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: type.id });

  const style = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    transition,
    opacity: isDragging ? 0.95 : 1,
    zIndex: isDragging ? 50 : 'auto',
  } as React.CSSProperties;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border ${
        type.is_active ? 'border-gray-200 dark:border-gray-700' : 'border-gray-300 dark:border-gray-600 opacity-60'
      }`}
    >
      <div className="flex items-center gap-3 flex-1">
        <div className="flex flex-col gap-1">
          <button
            {...listeners}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            title="Drag to reorder"
          >
            <GripVertical size={16} />
          </button>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">{type.name}</h4>
            {!type.is_active && (
              <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">Inactive</span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Order: {type.display_order} • Created {new Date(type.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onToggle} className={`p-2 ${
          type.is_active ? 'text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
        } rounded-lg transition-colors`} title={type.is_active ? 'Deactivate' : 'Activate'}>
          {type.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
        <button onClick={onEdit} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Edit">
          <Edit2 size={18} />
        </button>
        <button onClick={onDelete} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Delete">
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}

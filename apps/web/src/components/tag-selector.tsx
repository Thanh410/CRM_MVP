'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, X, Check, Tag as TagIcon } from 'lucide-react';
import { useOrgTags, useCreateTag, useAddTagToEntity, useRemoveTagFromEntity, useEntityTags, Tag } from '@/hooks/use-tags';

const DEFAULT_COLOR = '#6366f1';

const PRESET_COLORS = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#64748b',
];

interface TagSelectorProps {
  entityType: string;
  entityId: string;
}

export function TagSelector({ entityType, entityId }: TagSelectorProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: orgTags = [] } = useOrgTags();
  const { data: entityTags = [], isLoading } = useEntityTags(entityType, entityId);
  const createTag = useCreateTag();
  const addTag = useAddTagToEntity();
  const removeTag = useRemoveTagFromEntity();

  // close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);

  const entityTagIds = new Set(entityTags.map(t => t.id));

  const filtered = orgTags.filter(t =>
    !input || t.name.toLowerCase().includes(input.toLowerCase())
  );

  const isNew = input.trim() && !orgTags.some(t => t.name.toLowerCase() === input.trim().toLowerCase());

  const handleToggle = async (tag: Tag) => {
    if (entityTagIds.has(tag.id)) {
      removeTag.mutate({ tagId: tag.id, entityType, entityId });
    } else {
      addTag.mutate({ tagId: tag.id, entityType, entityId });
    }
  };

  const handleCreateAndAdd = async () => {
    if (!input.trim()) return;
    const tag = await createTag.mutateAsync({ name: input.trim(), color });
    addTag.mutate({ tagId: tag.id, entityType, entityId });
    setInput('');
  };

  const tagStyle = (tag: Tag) => {
    const c = tag.color || DEFAULT_COLOR;
    return { backgroundColor: c + '20', color: c, borderColor: c + '40' };
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Applied tags */}
      <div className="flex flex-wrap gap-1.5 items-center">
        {isLoading ? (
          <span className="text-xs text-gray-400">Đang tải...</span>
        ) : (
          entityTags.map(tag => (
            <span
              key={tag.id}
              style={tagStyle(tag)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
            >
              {tag.name}
              <button
                onClick={() => removeTag.mutate({ tagId: tag.id, entityType, entityId })}
                className="hover:opacity-70 transition-opacity"
              >
                <X size={10} />
              </button>
            </span>
          ))
        )}
        <button
          onClick={() => setOpen(o => !o)}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs text-gray-400 border border-dashed border-gray-300 hover:border-indigo-400 hover:text-indigo-500 transition-colors"
        >
          <Plus size={10} />Tag
        </button>
      </div>

      {/* Popover */}
      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-60 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          {/* Search / Create input */}
          <div className="px-3 py-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <TagIcon size={13} className="text-gray-400 shrink-0" />
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && isNew) handleCreateAndAdd(); }}
                placeholder="Tìm hoặc tạo tag..."
                className="flex-1 text-xs outline-none placeholder-gray-400"
              />
            </div>
          </div>

          {/* Color picker (only shown when creating new) */}
          {isNew && (
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs text-gray-400 mb-1.5">Màu sắc</p>
              <div className="flex gap-1.5 flex-wrap">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* List */}
          <div className="max-h-48 overflow-y-auto py-1">
            {isNew && (
              <button
                onClick={handleCreateAndAdd}
                disabled={createTag.isPending || addTag.isPending}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-indigo-50 text-indigo-600 transition-colors disabled:opacity-60"
              >
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                Tạo "{input.trim()}"
                <span className="ml-auto text-gray-400 text-[10px]">↵ Enter</span>
              </button>
            )}
            {filtered.length === 0 && !isNew && (
              <p className="px-3 py-3 text-xs text-gray-400 text-center">Không tìm thấy tag</p>
            )}
            {filtered.map(tag => (
              <button
                key={tag.id}
                onClick={() => handleToggle(tag)}
                disabled={addTag.isPending || removeTag.isPending}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0"
                  style={{ backgroundColor: tag.color || DEFAULT_COLOR }}
                />
                <span className="flex-1 text-left text-gray-700">{tag.name}</span>
                {entityTagIds.has(tag.id) && <Check size={12} className="text-indigo-600 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

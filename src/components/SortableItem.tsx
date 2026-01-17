"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Item } from "@/lib/types";

interface SortableItemProps {
  item: Item;
  index: number;
  disabled?: boolean;
}

export function SortableItem({ item, index, disabled }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        flex items-center gap-3 p-4 bg-white rounded-xl border-2
        ${isDragging ? "border-blue-500 shadow-lg z-10 opacity-90" : "border-gray-200"}
        ${disabled ? "cursor-default" : "cursor-grab active:cursor-grabbing"}
        transition-shadow hover:shadow-md
      `}
    >
      <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-sm font-medium text-gray-600">
        {index + 1}
      </span>
      <span className="text-lg font-medium text-gray-800">{item.text}</span>
    </div>
  );
}

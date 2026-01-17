"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Item, PLAYER_COLORS } from "@/lib/types";

interface SortableItemProps {
  item: Item;
  index: number;
  disabled?: boolean;
  otherDraggerName?: string;
  otherDraggerColor?: string;
}

export function SortableItem({ item, index, disabled, otherDraggerName, otherDraggerColor }: SortableItemProps) {
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
    transition: transition || "transform 200ms cubic-bezier(0.25, 1, 0.5, 1)",
  };

  const isBeingDraggedByOther = !!otherDraggerName;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        flex items-center gap-3 p-4 bg-white rounded-xl border-2 relative
        ${isDragging ? "border-blue-500 shadow-lg z-10 opacity-50 scale-105" : "border-gray-200"}
        ${isBeingDraggedByOther ? "animate-pulse border-dashed" : ""}
        ${disabled ? "cursor-default" : "cursor-grab active:cursor-grabbing"}
        transition-all duration-200 ease-out hover:shadow-md
      `}
    >
      <span className={`
        flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium
        ${isDragging ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"}
        transition-colors duration-200
      `}>
        {index + 1}
      </span>
      <span className="text-lg font-medium text-gray-800 flex-1">{item.text}</span>

      {/* Show who else is dragging this item */}
      {isBeingDraggedByOther && (
        <span
          className="absolute -top-2 -right-2 px-2 py-0.5 text-xs font-medium text-white rounded-full shadow-md animate-bounce"
          style={{ backgroundColor: otherDraggerColor || PLAYER_COLORS[0] }}
        >
          {otherDraggerName}
        </span>
      )}
    </div>
  );
}

// Static item for DragOverlay (no sortable logic)
export function DragOverlayItem({ item, index }: { item: Item; index: number }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-white rounded-xl border-2 border-blue-500 shadow-2xl scale-105 cursor-grabbing">
      <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-500 text-white rounded-full text-sm font-medium">
        {index + 1}
      </span>
      <span className="text-lg font-medium text-gray-800">{item.text}</span>
    </div>
  );
}

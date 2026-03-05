"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import type { ReactNode, RefObject } from "react";

interface VirtualTableBodyProps<T> {
  items: T[];
  scrollRef: RefObject<HTMLDivElement | null>;
  estimateSize?: number;
  renderRow: (item: T, index: number) => ReactNode;
  colSpan: number;
  emptyMessage: string;
}

export function VirtualTableBody<T>({
  items,
  scrollRef,
  estimateSize = 41,
  renderRow,
  colSpan,
  emptyMessage,
}: VirtualTableBodyProps<T>) {
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateSize,
    overscan: 10,
  });

  if (items.length === 0) {
    return (
      <tbody>
        <tr>
          <td colSpan={colSpan} className="px-4 py-8 text-center text-gray-400">
            {emptyMessage}
          </td>
        </tr>
      </tbody>
    );
  }

  const virtualItems = virtualizer.getVirtualItems();
  const firstItem = virtualItems[0];
  const lastItem = virtualItems[virtualItems.length - 1];
  const topPad = firstItem ? firstItem.start : 0;
  const bottomPad = lastItem ? virtualizer.getTotalSize() - lastItem.end : 0;

  return (
    <tbody>
      {topPad > 0 && (
        <tr>
          <td colSpan={colSpan} style={{ height: topPad, padding: 0, border: "none" }} />
        </tr>
      )}
      {virtualItems.map((virtualRow) => {
        const item = items[virtualRow.index];
        return item !== undefined ? renderRow(item, virtualRow.index) : null;
      })}
      {bottomPad > 0 && (
        <tr>
          <td colSpan={colSpan} style={{ height: bottomPad, padding: 0, border: "none" }} />
        </tr>
      )}
    </tbody>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Network,
  Pin,
  PinOff,
  Route,
  Copy,
} from "lucide-react";
import type { SimNode } from "./graph-types";

interface GraphContextMenuProps {
  node: SimNode;
  x: number;
  y: number;
  isPinned: boolean;
  onClose: () => void;
  onViewDetails: () => void;
  onExploreNeighborhood: () => void;
  onTogglePin: () => void;
  onFindPath: () => void;
  onCopyHeadword: () => void;
}

export function GraphContextMenu({
  node,
  x,
  y,
  isPinned,
  onClose,
  onViewDetails,
  onExploreNeighborhood,
  onTogglePin,
  onFindPath,
  onCopyHeadword,
}: GraphContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const items = [
    { icon: Search, label: "View details", action: onViewDetails },
    {
      icon: Network,
      label: "Explore neighborhood",
      action: onExploreNeighborhood,
    },
    {
      icon: isPinned ? PinOff : Pin,
      label: isPinned ? "Unpin node" : "Pin node",
      action: onTogglePin,
    },
    { icon: Route, label: "Find path to...", action: onFindPath },
    { icon: Copy, label: "Copy headword", action: onCopyHeadword },
  ];

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.1 }}
      className="fixed z-30 min-w-[180px] rounded-lg border border-border/50 bg-card/95 py-1 shadow-xl backdrop-blur-sm"
      style={{ left: x, top: y }}
    >
      <div className="border-b border-border/30 px-3 py-1.5">
        <p className="text-xs font-medium">{node.headword}</p>
        {node.romanization && (
          <p className="text-[10px] italic text-muted-foreground">
            {node.romanization}
          </p>
        )}
      </div>
      {items.map((item) => (
        <button
          key={item.label}
          className="flex w-full items-center gap-2.5 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            item.action();
          }}
        >
          <item.icon className="h-3.5 w-3.5" />
          {item.label}
        </button>
      ))}
    </motion.div>
  );
}

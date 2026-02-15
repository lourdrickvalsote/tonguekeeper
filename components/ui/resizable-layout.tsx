"use client";

import { useCallback, useRef, useState } from "react";

interface ResizableLayoutProps {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultLeftPercent?: number;
  minLeftPercent?: number;
  maxLeftPercent?: number;
}

export function ResizableLayout({
  left,
  right,
  defaultLeftPercent = 30,
  minLeftPercent = 20,
  maxLeftPercent = 50,
}: ResizableLayoutProps) {
  const [leftPercent, setLeftPercent] = useState(defaultLeftPercent);
  const containerRef = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const onMouseMove = (ev: MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = ev.clientX - rect.left;
        const percent = (x / rect.width) * 100;
        setLeftPercent(
          Math.min(maxLeftPercent, Math.max(minLeftPercent, percent))
        );
      };

      const onMouseUp = () => {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [minLeftPercent, maxLeftPercent]
  );

  return (
    <div ref={containerRef} className="flex flex-1 min-h-[600px] overflow-hidden">
      <div
        className="min-w-0 h-full overflow-hidden"
        style={{ width: `${leftPercent}%` }}
      >
        {left}
      </div>
      <div
        className="resize-handle"
        onMouseDown={onMouseDown}
      />
      <div
        className="min-w-0 h-full overflow-hidden flex-1"
      >
        {right}
      </div>
    </div>
  );
}

"use client";
// 긴 본문 N줄 클램프 + 더보기/접기. 실제로 넘칠 때만 토글 노출.
import { useEffect, useRef, useState } from "react";

export default function ExpandableText({
  text,
  lines = 4,
  className = "",
}: {
  text: string;
  lines?: number;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setOverflowing(el.scrollHeight - el.clientHeight > 2);
  }, [text, lines]);

  return (
    <div>
      <p
        ref={ref}
        className={className}
        style={
          expanded
            ? undefined
            : {
                display: "-webkit-box",
                WebkitLineClamp: lines,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }
        }
      >
        {text}
      </p>
      {(overflowing || expanded) && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="pressable mt-1 text-xs font-semibold text-ai"
        >
          {expanded ? "접기" : "더보기"}
        </button>
      )}
    </div>
  );
}

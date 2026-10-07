"use client";

import { useEffect, useRef, useState } from "react";

/** Measure an element's width; falls back to `initial` during SSR. */
export function useWidth<T extends HTMLElement>(initial = 720) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && Math.abs(w - width) > 0.5) setWidth(w);
    });
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width || initial);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [ref, width] as const;
}

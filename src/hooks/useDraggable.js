import { useRef, useEffect, useState } from "react";

export function useDraggable(initialPos = { x: 0, y: 0 }) {
  const [pos, setPos]  = useState(initialPos);
  const posRef         = useRef(initialPos);
  const sizeRef        = useRef({ w: 0, h: 0 });
  const dragging       = useRef(false);
  const didDrag        = useRef(false);
  const offset         = useRef({ x: 0, y: 0 });
  const ref            = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const clamp = (x, y) => ({
      x: Math.min(Math.max(0, x), window.innerWidth  - sizeRef.current.w),
      y: Math.min(Math.max(0, y), window.innerHeight - sizeRef.current.h),
    });

    // Use document-level capture so overflow:hidden on any ancestor never blocks it
    const onMouseDown = (e) => {
      // Only start drag if the click target is inside THIS element's drag handle
      const handle = e.target.closest("[data-drag-handle]");
      if (!handle || !el.contains(handle)) return;

      sizeRef.current = { w: el.offsetWidth, h: el.offsetHeight };
      dragging.current = true;
      didDrag.current  = false;
      offset.current   = {
        x: e.clientX - posRef.current.x,
        y: e.clientY - posRef.current.y,
      };
      e.preventDefault();
    };

    const onMouseMove = (e) => {
      if (!dragging.current) return;
      didDrag.current = true;
      const next = clamp(
        e.clientX - offset.current.x,
        e.clientY - offset.current.y,
      );
      posRef.current = next;
      setPos({ ...next });
    };

    const onMouseUp = () => { dragging.current = false; };

    // Suppress click after drag to prevent accidental button triggers
    const onClickCapture = (e) => {
      if (didDrag.current && el.contains(e.target)) {
        e.stopPropagation();
        didDrag.current = false;
      }
    };

    // Touch
    const onTouchStart = (e) => {
      const handle = e.target.closest("[data-drag-handle]");
      if (!handle || !el.contains(handle)) return;
      sizeRef.current = { w: el.offsetWidth, h: el.offsetHeight };
      dragging.current = true;
      didDrag.current  = false;
      const t = e.touches[0];
      offset.current = {
        x: t.clientX - posRef.current.x,
        y: t.clientY - posRef.current.y,
      };
    };

    const onTouchMove = (e) => {
      if (!dragging.current) return;
      didDrag.current = true;
      const t = e.touches[0];
      const next = clamp(
        t.clientX - offset.current.x,
        t.clientY - offset.current.y,
      );
      posRef.current = next;
      setPos({ ...next });
      e.preventDefault();
    };

    const onTouchEnd = () => { dragging.current = false; };

    // Attach mousedown on document capture — bypasses overflow:hidden completely
    document.addEventListener("mousedown",  onMouseDown,  true);
    document.addEventListener("click",      onClickCapture, true);
    document.addEventListener("mousemove",  onMouseMove);
    document.addEventListener("mouseup",    onMouseUp);
    document.addEventListener("touchstart", onTouchStart, { passive: true, capture: true });
    document.addEventListener("touchmove",  onTouchMove,  { passive: false });
    document.addEventListener("touchend",   onTouchEnd);

    return () => {
      document.removeEventListener("mousedown",  onMouseDown,  true);
      document.removeEventListener("click",      onClickCapture, true);
      document.removeEventListener("mousemove",  onMouseMove);
      document.removeEventListener("mouseup",    onMouseUp);
      document.removeEventListener("touchstart", onTouchStart, { capture: true });
      document.removeEventListener("touchmove",  onTouchMove);
      document.removeEventListener("touchend",   onTouchEnd);
    };
  }, []);

  return { ref, pos };
}

import { useRef, useEffect, useState } from "react";

export function useResizable(initial = { w: 360, h: 280 }, min = { w: 260, h: 200 }) {
  const [size, setSize] = useState(initial);
  const sizeRef   = useRef(initial);
  const resizing  = useRef(false);
  const startPos  = useRef({ x: 0, y: 0 });
  const startSize = useRef(initial);
  const ref       = useRef(null);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!resizing.current) return;
      const dw = e.clientX - startPos.current.x;
      const dh = e.clientY - startPos.current.y;
      const next = {
        w: Math.max(min.w, startSize.current.w + dw),
        h: Math.max(min.h, startSize.current.h + dh),
      };
      sizeRef.current = next;
      setSize({ ...next });
    };
    const onMouseUp = () => { resizing.current = false; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",  onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup",  onMouseUp);
    };
  }, []);

  const onResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    resizing.current  = true;
    startPos.current  = { x: e.clientX, y: e.clientY };
    startSize.current = { ...sizeRef.current };
  };

  return { ref, size, onResizeStart };
}

// ─── Softphone Component ─────────────────────────────────────────────────────
export { default as Softphone } from "../Softphone.jsx";

// ─── SIP Hook ────────────────────────────────────────────────────────────────
export { useSIP } from "../hooks/useSIP.js";

// ─── Utility Hooks ───────────────────────────────────────────────────────────
export { useDraggable } from "../hooks/useDraggable.js";
export { useResizable } from "../hooks/useResizable.js";

// ─── Global Call API ─────────────────────────────────────────────────────────
export { ksipcall } from "../ksipcall.js";

// ─── React DOM (for CDN usage) ───────────────────────────────────────────────
export { createRoot } from "react-dom/client";
export { createElement } from "react";

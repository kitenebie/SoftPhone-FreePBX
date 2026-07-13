import { X, SlidersHorizontal, Calculator, Settings, MonitorCogIcon } from "lucide-react";

/**
 * FloatingFab — draggable floating action button (bubble).
 *
 * Props:
 *   dragRef         React ref (for draggable container)
 *   dragPos         { x, y }
 *   navClass        string   (CSS class with direction hints)
 *   navOpen         boolean
 *   setNavOpen      fn
 *   uiPrefs         object
 *   fabOpacity      number
 *   setFabOpacity   fn
 *   showDialer      boolean
 *   setShowDialer   fn
 *   showSettings    boolean
 *   setShowSettings fn
 *   callState       string
 *   statusColor     string
 */
export default function FloatingFab({
  dragRef,
  dragPos,
  navClass,
  navOpen,
  setNavOpen,
  uiPrefs,
  fabOpacity,
  setFabOpacity,
  showDialer,
  setShowDialer,
  showSettings,
  setShowSettings,
  callState,
  statusColor,
}) {
  return (
    <div
      ref={dragRef}
      className={navClass}
      style={{ transform: `translate(${dragPos.x}px, ${dragPos.y}px)` }}
    >
      <div className={`sp-fab-menu ${navOpen ? "open" : ""}`}>
        {uiPrefs.showOpacity && (
          <button
            className="sp-fab-item"
            title="Opacity"
            onClick={() =>
              setFabOpacity((o) =>
                o <= 0.3 ? 1 : Math.max(0.3, +(o - 0.2).toFixed(2)),
              )
            }
          >
            <SlidersHorizontal size={16} />
          </button>
        )}
        {uiPrefs.showDialer && (
          <button
            className={`sp-fab-item ${showDialer ? "fab-active" : ""}`}
            title="Dialer"
            onClick={() => {
              setShowDialer((d) => !d);
              setShowSettings(false);
            }}
          >
            <Calculator size={24} />
          </button>
        )}
        {uiPrefs.showSetting && (
          <button
            className={`sp-fab-item ${showSettings ? "fab-active" : ""}`}
            title="Settings"
            onClick={() => {
              setShowSettings((s) => !s);
              setShowDialer(false);
            }}
          >
            <Settings size={24} />
          </button>
        )}
      </div>
      <button
        className={`sp-fab-main ${navOpen ? "fab-open" : ""} ${
          callState === "incoming" ? "fab-ringing" : ""
        }`}
        style={{ opacity: fabOpacity }}
        onClick={() => setNavOpen((n) => !n)}
        data-drag-handle
        title="SIP Softphone"
      >
        {navOpen ? <X size={20} /> : <MonitorCogIcon size={26} />}
        <span className={`sp-fab-dot ${statusColor}`} />
      </button>
    </div>
  );
}

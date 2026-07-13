import { Wifi, WifiOff, Loader, Settings } from "lucide-react";

/**
 * StatusToast — floating connection status banner.
 *
 * Props:
 *   show            boolean
 *   registered      boolean
 *   reconnecting    boolean
 *   activeConfig    object | null
 *   onOpenSettings  () => void
 */
export default function StatusToast({
  show,
  registered,
  reconnecting,
  activeConfig,
  onOpenSettings,
}) {
  if (!show) return null;

  return (
    <div
      className={`sp-status-toast ${
        registered ? "status-green" : reconnecting ? "status-yellow" : "status-red"
      }`}
    >
      <div className="sp-status-toast-content">
        {registered ? (
          <>
            <Wifi size={16} />
            <span>Connected - Ext. {activeConfig?.extension}</span>
          </>
        ) : reconnecting ? (
          <>
            <Loader size={16} className="spin" />
            <span>Reconnecting...</span>
          </>
        ) : (
          <>
            <WifiOff size={16} />
            <span>Not connected</span>
          </>
        )}
      </div>
      <button
        className="sp-status-toast-btn"
        onClick={onOpenSettings}
        title="Open Settings"
      >
        <Settings size={16} />
      </button>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { ksipcall } from "./ksipcall.js";
import { WifiOff, Loader, Info } from "lucide-react";
import "./Softphone.css";

function InfoTooltip() {
  return (
    <div className="sp-info-wrapper">
      <Info size={14} className="sp-info-icon" aria-label="Connection help" />
      <div className="sp-tooltip" role="tooltip">
        <p className="sp-tooltip-title">Connection troubleshooting</p>
        <ol>
          <li>
            No connection to PBX server — press{" "}
            <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>K</kbd>{" "}
            to open settings, check your credentials, and reconnect.
          </li>
          <li>
            If step 1 doesn't work, contact IT Support for assistance.
          </li>
        </ol>
      </div>
    </div>
  );
}

export function KsipStatus({ variant = "inline" }) {
  const [status, setStatus] = useState({
    registered: false,
    reconnecting: false,
    extension: "",
    error: "",
    ariConnected: true,
  });
  const [hiddenAfterConnect, setHiddenAfterConnect] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const unsub = ksipcall._subscribeStatus((newStatus) => {
      setStatus(newStatus);

      // Reset the hide flag whenever we leave a fully-connected state
      const fullyConnected =
        newStatus.registered && newStatus.ariConnected !== false;
      if (!fullyConnected) {
        clearTimeout(timerRef.current);
        setHiddenAfterConnect(false);
      }
    });
    return unsub;
  }, []);

  // Start the auto-hide timer only when fully connected
  useEffect(() => {
    if (!status.registered || status.ariConnected === false) return;

    timerRef.current = setTimeout(() => setHiddenAfterConnect(true), 5000);
    return () => clearTimeout(timerRef.current);
  }, [status.registered, status.ariConnected]);

  const visible =
    !status.registered ||
    status.reconnecting ||
    status.ariConnected === false ||
    !hiddenAfterConnect;

  if (!visible) return null;

  const statusColor = status.registered
    ? "status-green"
    : status.reconnecting
    ? "status-yellow"
    : "status-red";

  const isBanner = variant === "banner";

  return (
    <div
      className={`sp-status-toast ${statusColor} ${
        isBanner ? "sp-status-banner" : "sp-status-inline"
      }`}
    >
      <div className="sp-status-toast-content">
        {status.registered ? (
          <></>
        ) : status.reconnecting ? (
          <>
            <Loader size={16} className="spin" />
            <span>Reconnecting...</span>
          </>
        ) : (
          <>
            <WifiOff size={16} />
            <span>Not connected</span>
            <InfoTooltip />
          </>
        )}
      </div>
    </div>
  );
}
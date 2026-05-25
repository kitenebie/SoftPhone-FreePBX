import { useState, useEffect } from "react";
import { ksipcall } from "./ksipcall.js";
import { Wifi, WifiOff, Loader } from "lucide-react";
import "./Softphone.css";

export function KsipStatus({ variant = "inline" }) {
  const [status, setStatus] = useState({
    registered: false,
    reconnecting: false,
    extension: "",
    error: "",
    ariConnected: true
  });
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const unsub = ksipcall._subscribeStatus((newStatus) => {
      setStatus(newStatus);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (status.registered) {
      if (status.ariConnected === false) {
        setVisible(true);
        return;
      }
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(timer);
    } else {
      setVisible(true);
    }
  }, [status.registered, status.reconnecting, status.ariConnected]);

  if (!visible) return null;

  const statusColor = status.registered
    ? "status-green"
    : status.reconnecting
      ? "status-yellow"
      : "status-red";

  const isBanner = variant === "banner";

  return (
    <div className={`sp-status-toast ${statusColor} ${isBanner ? "sp-status-banner" : "sp-status-inline"}`}>
      <div className="sp-status-toast-content">
        {status.registered ? (
          <>
            {/* <Wifi size={16} />
            <span>
              Connected - Ext. {status.extension}
              {status.ariConnected === false && (
                <span style={{ marginLeft: '8px', padding: '2px 6px', fontSize: '0.75rem', backgroundColor: '#ef4444', borderRadius: '4px', color: '#fff', fontWeight: 'bold', display: 'inline-block', lineHeight: 1 }}>
                  ARI Offline
                </span>
              )}
            </span> */}
          </>
        ) : status.reconnecting ? (
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
    </div>
  );
}

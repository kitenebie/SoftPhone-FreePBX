import Draggable from "react-draggable";
import { GripHorizontal, X, Delete, Phone, Video } from "lucide-react";
import { DIALPAD } from "../../utils/softphone.utils";

/**
 * DialerPanel — draggable dialer panel.
 *
 * Props:
 *   nodeRef         React ref
 *   defaultPosition { x, y }
 *   dialInput       string
 *   setDialInput    fn
 *   withVideo       boolean
 *   setWithVideo    fn
 *   registered      boolean
 *   callState       string
 *   mediaError      string
 *   onCall          (target, video) => void
 *   onClose         () => void
 */
export default function DialerPanel({
  nodeRef,
  defaultPosition,
  dialInput,
  setDialInput,
  withVideo,
  setWithVideo,
  registered,
  callState,
  mediaError,
  onCall,
  onClose,
}) {
  return (
    <Draggable
      nodeRef={nodeRef}
      handle=".sp-panel-header"
      bounds="parent"
      defaultPosition={defaultPosition}
    >
      <div ref={nodeRef} className="sp-dialer-panel">
        <div className="sp-panel-inner">
          <div className="sp-panel-header">
            <GripHorizontal size={14} />
            <span>Dialer</span>
            <button
              className="sp-icon-btn"
              onClick={onClose}
              style={{ marginLeft: "auto" }}
            >
              <X size={13} />
            </button>
          </div>
          <div className="sp-dial-row">
            <input
              className="sp-dial-input"
              value={dialInput}
              onChange={(e) => setDialInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && dialInput && registered && callState === "idle") {
                  onCall(dialInput, withVideo);
                  onClose();
                }
              }}
              placeholder="Enter number"
            />
            <button
              className="sp-icon-btn"
              onClick={() => setDialInput((p) => p.slice(0, -1))}
            >
              <Delete size={16} />
            </button>
          </div>
          <div className="sp-dialpad">
            {DIALPAD.map(({ key, sub }) => (
              <button
                key={key}
                className="sp-key"
                onClick={() => setDialInput((p) => p + key)}
              >
                <span className="sp-key-main">{key}</span>
                {sub && <span className="sp-key-sub">{sub}</span>}
              </button>
            ))}
          </div>
          <div className="sp-dial-actions">
            <label className="sp-toggle">
              <input
                type="checkbox"
                checked={withVideo}
                onChange={(e) => setWithVideo(e.target.checked)}
              />
              <span className="sp-toggle-track" />
              <Video size={12} />
              <span>Video</span>
            </label>
            <button
              className="sp-call-btn"
              onClick={() => {
                if (dialInput && registered && callState === "idle") {
                  onCall(dialInput, withVideo);
                  onClose();
                }
              }}
              disabled={!dialInput || !registered || callState !== "idle" || !!mediaError}
            >
              <Phone size={16} />
            </button>
          </div>
        </div>
      </div>
    </Draggable>
  );
}

import Draggable from "react-draggable";
import { GripHorizontal, PhoneIncoming, Phone, Video, PhoneMissed } from "lucide-react";

/**
 * IncomingCallPanel — draggable panel shown when there is an incoming call.
 *
 * Props:
 *   nodeRef           React ref
 *   defaultPosition   { x, y }
 *   callerData        object | null
 *   incomingSession   object | null
 *   ariCallType       'VIDEO' | 'AUDIO' | null
 *   checkingAri       boolean
 *   isGoIpCall        boolean
 *   onAnswer          (video: boolean) => void
 *   onHangup          () => void
 */
export default function IncomingCallPanel({
  nodeRef,
  defaultPosition,
  callerData,
  incomingSession,
  ariCallType,
  checkingAri,
  isGoIpCall,
  onAnswer,
  onHangup,
}) {
  const callerName =
    callerData?.name ||
    incomingSession?.remoteIdentity?.displayName ||
    incomingSession?.remoteIdentity?.uri?.user ||
    "Unknown";

  return (
    <Draggable
      nodeRef={nodeRef}
      handle=".sp-panel-header"
      bounds="parent"
      defaultPosition={defaultPosition}
    >
      <div ref={nodeRef} className="sp-incoming-panel">
        <div className="sp-panel-inner">
          <div className="sp-panel-header">
            <GripHorizontal size={14} />
            <span>Incoming Call</span>
          </div>
          <div className="sp-incoming-body">
            <div className="sp-incoming-avatar">
              {callerData?.avatar ? (
                <img
                  src={callerData.avatar}
                  alt="Caller"
                  style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                />
              ) : (
                <PhoneIncoming size={26} />
              )}
            </div>
            <p className="sp-incoming-caller">{callerName}</p>

            {ariCallType && (
              <div style={{ marginTop: 8, display: "flex", justifyContent: "center" }}>
                {ariCallType === "VIDEO" ? (
                  <span className="sp-call-type-badge video-badge">
                    <Video size={12} style={{ marginRight: 4 }} /> Video Call
                  </span>
                ) : ariCallType === "AUDIO" ? (
                  <span className="sp-call-type-badge audio-badge">
                    <Phone size={12} style={{ marginRight: 4 }} /> Audio Call
                  </span>
                ) : null}
              </div>
            )}

            {callerData?.address && (
              <div style={{ fontSize: "0.9rem", opacity: 0.85, marginTop: 8 }}>
                <div>Address: {callerData.address}</div>
              </div>
            )}
            <br />
            <div className="sp-incoming-actions">
              {checkingAri ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    color: "#94a3b8",
                    fontSize: "0.9rem",
                    padding: "10px 0",
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      border: "2px solid #6366f1",
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      animation: "spSpin 0.6s linear infinite",
                    }}
                  />
                  Verifying line...
                </div>
              ) : ariCallType === "AUDIO" || isGoIpCall ? (
                <button
                  className="sp-action-btn sp-action-answer"
                  onClick={() => onAnswer(false)}
                  title="Answer Call"
                >
                  <Phone size={20} />
                </button>
              ) : (
                <button
                  className="sp-action-btn sp-action-video"
                  onClick={() => onAnswer(true)}
                  title="Answer with Video"
                >
                  <Video size={20} />
                </button>
              )}
              <button className="sp-action-btn sp-action-reject" onClick={onHangup}>
                <PhoneMissed size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Draggable>
  );
}

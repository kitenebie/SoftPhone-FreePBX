import { useState } from "react";
import Draggable from "react-draggable";
import {
  GripHorizontal,
  Maximize2,
  Minimize2,
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
  User,
  Phone,
  PhoneCall,
  PhoneForwarded,
  Pause,
  Play,
  Loader,
  X,
} from "lucide-react";

/**
 * VideoPanel — draggable + resizable panel for active / ringing calls.
 * Also shows a "Call Back" overlay after a call ends.
 *
 * Props:
 *   nodeRef              React ref
 *   defaultPosition      { x, y }
 *   callState            string
 *   isAudioOnlyCall      boolean
 *   expanded             boolean
 *   setExpanded          fn
 *   callerData           object | null
 *   dialInput            string
 *   remoteVideoRef       React ref
 *   localVideoRef        React ref
 *   muted                boolean
 *   videoMuted           boolean
 *   onMute               () => void
 *   onVideoMute          () => void
 *   onHangup             () => void
 *   held                 boolean
 *   onHold               () => void
 *   lastCallInfo         { number, name, wasVideo } | null
 *   onCallback           (number, video) => void
 *   onDismissCallback    () => void
 *   remoteVideoLoaded    boolean
 *   setRemoteVideoLoaded fn
 *   videoSize            { size: { w, h }, onResizeStart }
 */
export default function VideoPanel({
  nodeRef,
  defaultPosition,
  callState,
  isAudioOnlyCall,
  expanded,
  setExpanded,
  callerData,
  dialInput,
  remoteVideoRef,
  localVideoRef,
  muted,
  videoMuted,
  onMute,
  onVideoMute,
  onHangup,
  held,
  onHold,
  lastCallInfo,
  onCallback,
  onDismissCallback,
  remoteVideoLoaded,
  setRemoteVideoLoaded,
  videoSize,
}) {
  const callerDisplay = callerData?.name || dialInput || "Citizen";

  // Confirm close state for callback overlay
  const [confirmClose, setConfirmClose] = useState(false);

  // ── Callback Overlay (shown after call ends) ──
  if (callState === "idle" && lastCallInfo) {
    return (
      <Draggable
        nodeRef={nodeRef}
        handle=".sp-panel-header"
        bounds="parent"
        defaultPosition={defaultPosition}
      >
        <div
          ref={nodeRef}
          className="sp-video-panel"
          style={{ width: "320px", height: "auto", minHeight: "280px" }}
        >
          <div className="sp-panel-inner">
            {/* Header */}
            <div className="sp-panel-header">
              <GripHorizontal size={14} />
              <span>Call Ended</span>
              <button
                className="sp-icon-btn"
                onClick={() => {
                  if (confirmClose) {
                    setConfirmClose(false);
                    onDismissCallback();
                  } else {
                    setConfirmClose(true);
                  }
                }}
                style={{ marginLeft: "auto" }}
                title="Dismiss"
              >
                <X size={13} />
              </button>
            </div>

            {/* Body */}
            <div
              className="sp-video-wrap sp-audio-call-wrap"
              style={{
                minHeight: "220px",
                background: "radial-gradient(circle at center, #1e1e38 0%, #0a0a14 100%)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: 1,
                  padding: "24px",
                  textAlign: "center",
                }}
              >
                {/* Avatar */}
                <div style={{ position: "relative", marginBottom: "16px" }}>
                  <div
                    className="sp-incoming-avatar"
                    style={{
                      margin: "0",
                      width: 72,
                      height: 72,
                      border: "2px solid rgba(129, 140, 248, 0.4)",
                      background: "rgba(79, 70, 229, 0.1)",
                    }}
                  >
                    <User size={36} style={{ color: "#818cf8" }} />
                  </div>
                </div>

                <div style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "4px", color: "#f8fafc" }}>
                  {lastCallInfo.name || lastCallInfo.number}
                </div>
                {lastCallInfo.name && (
                  <div style={{ fontSize: "0.85rem", opacity: 0.7, color: "#94a3b8", marginBottom: "12px" }}>
                    {lastCallInfo.number}
                  </div>
                )}

                <div style={{ color: "#ef4444", fontSize: "0.85rem", fontWeight: "500", marginBottom: "20px", background: "rgba(239, 68, 68, 0.1)", padding: "4px 12px", borderRadius: "12px" }}>
                  Call Ended
                </div>

                {/* Callback Buttons */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", alignItems: "center" }}>
                  {/* 🟢 Green Phone: Callback with leading 0 prepended */}
                  <button
                    className="sp-ctrl-btn"
                    onClick={() => {
                      const raw = lastCallInfo.number.replace(/^0+/, "");
                      const num = "0" + raw;
                      onCallback(num, false);
                    }}
                    style={{
                      width: "100%",
                      maxWidth: "260px",
                      height: "auto",
                      padding: "12px 16px",
                      borderRadius: "12px",
                      background: "rgba(74, 222, 128, 0.15)",
                      border: "1px solid rgba(74, 222, 128, 0.4)",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      color: "#4ade80",
                      fontSize: "0.82rem",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    <Phone size={18} style={{ flexShrink: 0 }} />
                    <span>Callback (0{lastCallInfo.number.replace(/^0+/, "")})</span>
                  </button>

                  {/* 🔵 Blue Phone: Callback raw number (no added prefix) */}
                  <button
                    className="sp-ctrl-btn"
                    onClick={() => {
                      const num = lastCallInfo.number.replace(/^0+/, "");
                      onCallback(num, false);
                    }}
                    style={{
                      width: "100%",
                      maxWidth: "260px",
                      height: "auto",
                      padding: "12px 16px",
                      borderRadius: "12px",
                      background: "rgba(129, 140, 248, 0.15)",
                      border: "1px solid rgba(129, 140, 248, 0.4)",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      color: "#818cf8",
                      fontSize: "0.82rem",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    <Phone size={18} style={{ flexShrink: 0 }} />
                    <span>Callback ({lastCallInfo.number.replace(/^0+/, "")})</span>
                  </button>

                  {/* 🔵 Blue Video: Video Call raw number (no added prefix) */}
                  <button
                    className="sp-ctrl-btn"
                    onClick={() => {
                      const num = lastCallInfo.number.replace(/^0+/, "");
                      onCallback(num, true);
                    }}
                    style={{
                      width: "100%",
                      maxWidth: "260px",
                      height: "auto",
                      padding: "12px 16px",
                      borderRadius: "12px",
                      background: "rgba(129, 140, 248, 0.15)",
                      border: "1px solid rgba(129, 140, 248, 0.4)",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      color: "#818cf8",
                      fontSize: "0.82rem",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    <Video size={18} style={{ flexShrink: 0 }} />
                    <span>Video Call ({lastCallInfo.number.replace(/^0+/, "")})</span>
                  </button>
                </div>

                {/* Confirm close prompt */}
                {confirmClose && (
                  <div
                    style={{
                      position: "fixed",
                      inset: 0,
                      zIndex: 99999,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(0, 0, 0, 0.6)",
                      backdropFilter: "blur(4px)",
                    }}
                    onClick={() => setConfirmClose(false)}
                  >
                    <div
                      style={{
                        background: "#1e1e2e",
                        border: "1px solid rgba(129, 140, 248, 0.3)",
                        borderRadius: "16px",
                        padding: "28px 32px",
                        textAlign: "center",
                        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
                        maxWidth: "300px",
                        width: "90%",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ fontSize: "1rem", fontWeight: "600", color: "#f8fafc", marginBottom: "8px" }}>
                        Close Callback?
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: "24px" }}>
                        Do you want to close this panel?
                      </div>
                      <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                        <button
                          className="sp-ctrl-btn"
                          onClick={() => { setConfirmClose(false); onDismissCallback(); }}
                          style={{ width: "auto", height: "auto", padding: "10px 24px", borderRadius: "20px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#ef4444", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer" }}
                        >
                          Yes
                        </button>
                        <button
                          className="sp-ctrl-btn"
                          onClick={() => setConfirmClose(false)}
                          style={{ width: "auto", height: "auto", padding: "10px 24px", borderRadius: "20px", background: "rgba(148, 163, 184, 0.1)", border: "1px solid rgba(148, 163, 184, 0.3)", color: "#94a3b8", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer" }}
                        >
                          No
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Draggable>
    );
  }

  // ── Active / Ringing Call Panel ──
  return (
    <Draggable
      nodeRef={nodeRef}
      handle=".sp-panel-header"
      bounds="parent"
      defaultPosition={defaultPosition}
    >
      <div
        ref={nodeRef}
        className={`sp-video-panel ${expanded ? "sp-video-expanded" : ""}`}
        style={
          expanded
            ? {}
            : isAudioOnlyCall
              ? { width: "320px", height: "460px" }
              : { width: `${videoSize.size.w}px`, height: `${videoSize.size.h}px` }
        }
      >
        <div className="sp-panel-inner">
          {/* Header */}
          <div className="sp-panel-header">
            <GripHorizontal size={14} />
            <span>
              {callState === "ringing" ? "Calling..." : held ? "On Hold" : "On Call"}
            </span>
            <div
              className={`sp-call-dot ${held ? "hold" : callState === "active" ? "active" : "ringing"}`}
            />
            {!isAudioOnlyCall && (
              <button
                className="sp-icon-btn"
                onClick={() => setExpanded((e) => !e)}
                style={{ marginLeft: "auto" }}
              >
                {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
            )}
          </div>

          {/* Body — audio-only */}
          {isAudioOnlyCall ? (
            <div
              className="sp-video-wrap sp-audio-call-wrap"
              style={{
                minHeight: "380px",
                background: "radial-gradient(circle at center, #1e1e38 0%, #0a0a14 100%)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                className="sp-audio-call-container"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: 1,
                  padding: "24px",
                  textAlign: "center",
                }}
              >
                {/* Glowing avatar */}
                <div className="sp-audio-avatar-wrap" style={{ position: "relative", marginBottom: "20px" }}>
                  <div
                    className="sp-audio-avatar-glow"
                    style={{
                      position: "absolute",
                      inset: "-8px",
                      borderRadius: "50%",
                      background: held ? "rgba(250, 204, 21, 0.25)" : "rgba(79, 70, 229, 0.25)",
                      filter: "blur(12px)",
                      animation: held ? "none" : callState === "active" ? "pulseGlow 2s infinite" : "none",
                    }}
                  />
                  <div
                    className="sp-incoming-avatar"
                    style={{
                      margin: "0",
                      width: 100,
                      height: 100,
                      border: held ? "2px solid rgba(250, 204, 21, 0.6)" : "2px solid rgba(129, 140, 248, 0.6)",
                      background: held ? "rgba(250, 204, 21, 0.1)" : "rgba(79, 70, 229, 0.1)",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                      animation: callState === "ringing" ? "ring 1.2s ease infinite" : "none",
                    }}
                  >
                    {callerData?.avatar ? (
                      <img
                        src={callerData.avatar}
                        alt="Citizen"
                        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                      />
                    ) : (
                      <User size={48} style={{ color: held ? "#facc15" : "#818cf8" }} />
                    )}
                  </div>
                </div>

                <div style={{ fontSize: "1.4rem", fontWeight: "700", marginBottom: "6px", color: "#f8fafc", letterSpacing: "0.5px" }}>
                  {callerDisplay}
                </div>
                {callerData?.address && (
                  <div style={{ fontSize: "0.9rem", opacity: 0.8, color: "#94a3b8", marginBottom: "16px", maxWidth: "280px", lineHeight: "1.4" }}>
                    {callerData.address}
                  </div>
                )}
                {callState === "ringing" ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#facc15", fontSize: "0.95rem", fontWeight: "500", background: "rgba(250, 204, 21, 0.1)", padding: "6px 16px", borderRadius: "20px" }}>
                    <Loader size={16} className="spin" />
                    <span>Calling...</span>
                  </div>
                ) : held ? (
                  <div style={{ color: "#facc15", fontSize: "0.95rem", fontWeight: "600", letterSpacing: "0.5px", textTransform: "uppercase", background: "rgba(250, 204, 21, 0.1)", padding: "4px 12px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Pause size={14} />
                    On Hold
                  </div>
                ) : (
                  <div style={{ color: "#4ade80", fontSize: "0.95rem", fontWeight: "600", letterSpacing: "0.5px", textTransform: "uppercase", background: "rgba(74, 222, 128, 0.1)", padding: "4px 12px", borderRadius: "12px" }}>
                    Ongoing Call
                  </div>
                )}
              </div>

              {/* Audio controls */}
              <div className="sp-call-controls sp-audio-call-controls" style={{ background: "transparent", padding: "24px 20px 28px" }}>
                <button
                  className={`sp-ctrl-btn ${muted ? "active" : ""}`}
                  onClick={onMute}
                  style={{ width: "48px", height: "48px" }}
                  title={muted ? "Unmute Mic" : "Mute Mic"}
                >
                  {muted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>

                {/* Hold Button */}
                {callState === "active" && (
                  <button
                    className={`sp-ctrl-btn ${held ? "active" : ""}`}
                    onClick={onHold}
                    style={{
                      width: "48px",
                      height: "48px",
                      background: held ? "rgba(250, 204, 21, 0.2)" : undefined,
                      borderColor: held ? "rgba(250, 204, 21, 0.5)" : undefined,
                    }}
                    title={held ? "Resume Call" : "Hold Call"}
                  >
                    {held ? <Play size={20} /> : <Pause size={20} />}
                  </button>
                )}

                <button
                  className="sp-ctrl-btn sp-ctrl-hangup"
                  onClick={onHangup}
                  style={{ width: "56px", height: "56px", boxShadow: "0 8px 20px rgba(239, 68, 68, 0.4)" }}
                  title="Hang Up"
                >
                  <PhoneOff size={22} />
                </button>
              </div>
            </div>
          ) : (
            /* Body — video */
            <div className="sp-video-wrap">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="sp-video-remote"
                onLoadedData={() => setRemoteVideoLoaded(true)}
              />
              {!videoMuted && (
                <video ref={localVideoRef} autoPlay playsInline muted className="sp-video-local" />
              )}
              {(callState === "ringing" || (callState === "active" && !remoteVideoLoaded)) && (
                <div className="sp-video-placeholder" style={{ flexDirection: "column", padding: "20px", textAlign: "center" }}>
                  <div className="sp-incoming-avatar" style={{ margin: "0 auto 12px", width: 80, height: 80 }}>
                    {callerData?.avatar ? (
                      <img src={callerData.avatar} alt="Citizen" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                    ) : (
                      <User size={36} />
                    )}
                  </div>
                  <div style={{ fontSize: "1.2rem", fontWeight: "bold", marginBottom: 4, color: "#e2e8f0" }}>
                    {callerDisplay}
                  </div>
                  {callerData?.address && (
                    <div style={{ fontSize: "0.85rem", opacity: 0.8, marginBottom: 16 }}>
                      Address: {callerData.address}
                    </div>
                  )}
                  {callState === "ringing" ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: 0.8, color: "#cbd5e1" }}>
                      <Loader size={18} className="spin" />
                      <span>Calling...</span>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: 0.8, color: "#cbd5e1" }}>
                      <Phone size={18} />
                      <span>In Call</span>
                    </div>
                  )}
                </div>
              )}

              {/* Hold overlay for video calls */}
              {held && callState === "active" && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0, 0, 0, 0.75)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 10,
                    borderRadius: "inherit",
                  }}
                >
                  <Pause size={48} style={{ color: "#facc15", marginBottom: "12px" }} />
                  <div style={{ color: "#facc15", fontSize: "1.1rem", fontWeight: "600" }}>
                    Call On Hold
                  </div>
                </div>
              )}

              <div className="sp-call-controls">
                <button className={`sp-ctrl-btn ${muted ? "active" : ""}`} onClick={onMute}>
                  {muted ? <MicOff size={16} /> : <Mic size={16} />}
                </button>

                {/* Hold Button for video calls */}
                {callState === "active" && (
                  <button
                    className={`sp-ctrl-btn ${held ? "active" : ""}`}
                    onClick={onHold}
                    style={{
                      background: held ? "rgba(250, 204, 21, 0.2)" : undefined,
                      borderColor: held ? "rgba(250, 204, 21, 0.5)" : undefined,
                    }}
                    title={held ? "Resume Call" : "Hold Call"}
                  >
                    {held ? <Play size={16} /> : <Pause size={16} />}
                  </button>
                )}

                <button className="sp-ctrl-btn sp-ctrl-hangup" onClick={onHangup}>
                  <PhoneOff size={18} />
                </button>
                <button className={`sp-ctrl-btn ${videoMuted ? "active" : ""}`} onClick={onVideoMute}>
                  {videoMuted ? <VideoOff size={16} /> : <Video size={16} />}
                </button>
              </div>
            </div>
          )}
        </div>
        {!expanded && !isAudioOnlyCall && (
          <div className="sp-resize-handle" onMouseDown={videoSize.onResizeStart} />
        )}
      </div>
    </Draggable>
  );
}

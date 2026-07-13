import { useState, useEffect } from "react";
import Draggable from "react-draggable";
import {
  Wifi,
  WifiOff,
  Loader,
  Settings,
  X,
  LogOut,
  Server,
  User,
  Lock,
  Monitor,
  Hash,
  Phone,
  PhoneOff,
  PhoneIncoming,
  PhoneMissed,
  Video,
  VideoOff,
  Mic,
  MicOff,
  GripHorizontal,
  Pause,
  Play,
  PhoneForwarded,
  PhoneCall,
  SlidersHorizontal,
} from "lucide-react";
import ToggleRow from "./ToggleRow";
import CallerInfoModal from "./CallerInfoModal";
import { DIALPAD, SIP_WS_PROTOCOL, SIP_WS_PORT, PANEL_POSITIONS } from "../../utils/softphone.utils";

/**
 * FullscreenView — the entire fullscreen workspace UI.
 *
 * All state / handlers are passed down as props from Softphone.jsx.
 */
export default function FullscreenView({
  // SIP / call state
  registered,
  reconnecting,
  error,
  mediaError,
  callState,
  activeConfig,
  callerData,
  dialInput,
  setDialInput,
  withVideo,
  setWithVideo,
  muted,
  videoMuted,
  handleMute,
  handleVideoMute,
  hangup,
  safeCall,
  safeAnswer,
  held,
  onHold,
  lastCallInfo,
  onCallback,
  onDismissCallback,
  incomingSession,
  remoteVideoRef,
  localVideoRef,
  remoteAudioRef,
  isAudioOnlyCall,
  ariCallType,
  ariChannelActive,
  sdpHasVideo,
  checkingAri,
  isGoIpCall,
  remoteVideoLoaded,
  setRemoteVideoLoaded,
  statusColor,

  // Settings
  showFsSettings,
  setShowFsSettings,
  setActiveConfig,
  form,
  setForm,
  uiPrefs,
  onToggle,
  handleConnect,
  wsPreview,
  fabOpacity,
  setFabOpacity,
  availableAudioCodecs,
  availableVideoCodecs,
  toggleCodec,
  settingConfigToggles,
  settingConfigCodecs,
  panelPosition,
  setPanelPosition,
  panelOffset,
  setPanelOffset,

  // Caller info modal
  showCallerInfoModal,
  setShowCallerInfoModal,
  callerInfoForm,
  setCallerInfoForm,
  callerInfoMobileNumber,
  callerInfoErrors,
  submittingCallerInfo,
  handleCallerInfoSubmit,
  callerInfoDefaultPos,
  callerInfoNodeRef,
}) {
  return (
    <div className="sp-fs-workspace">
      <audio ref={remoteAudioRef} autoPlay />

      {/* ── Header ─────────────────────────────────────── */}
      <div className="sp-fs-header">
        <div className={`sp-status-indicator ${statusColor}`}>
          {registered ? (
            <Wifi size={13} />
          ) : reconnecting ? (
            <Loader size={13} className="spin" />
          ) : (
            <WifiOff size={13} />
          )}
          <span>
            {registered
              ? `Ext. ${activeConfig?.extension}`
              : reconnecting
                ? "Reconnecting..."
                : "Not connected"}
          </span>
        </div>
        {error && !reconnecting && (
          <span className="sp-statusbar-error">{error}</span>
        )}
        {mediaError && <span className="sp-statusbar-error">{mediaError}</span>}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {activeConfig && (
            <button className="sp-icon-btn" title="Disconnect" onClick={() => setActiveConfig(null)}>
              <LogOut size={15} />
            </button>
          )}
          <button
            className={`sp-icon-btn ${showFsSettings ? "sp-fs-settings-active" : ""}`}
            title="Settings"
            onClick={() => setShowFsSettings((s) => !s)}
          >
            <Settings size={15} />
          </button>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────── */}
      <div className="sp-fs-body">
        {/* Column 1 — Dialer */}
        <div className="sp-fs-col sp-fs-dialer-col">
          <div className="sp-fs-col-title">Dialer</div>

          {/* Incoming call banner */}
          {callState === "incoming" && callerData && ariChannelActive && (
            <div className="sp-fs-incoming">
              <div className="sp-incoming-avatar" style={{ margin: "0 auto 12px" }}>
                {callerData?.avatar ? (
                  <img src={callerData.avatar} alt="Caller" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                ) : (
                  <PhoneIncoming size={22} />
                )}
              </div>
              <p className="sp-incoming-label">Incoming Call</p>
              <p className="sp-incoming-caller">
                {callerData?.name ||
                  incomingSession?.remoteIdentity?.displayName ||
                  incomingSession?.remoteIdentity?.uri?.user ||
                  "Unknown"}
              </p>
              {ariCallType && (
                <div style={{ marginTop: 6, display: "flex", justifyContent: "center" }}>
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
                <div style={{ fontSize: "0.85rem", opacity: 0.8, marginTop: 4 }}>
                  <div>Address: {callerData.address}</div>
                </div>
              )}
              <br />
              <div className="sp-incoming-actions" style={{ justifyContent: "center", marginTop: 12 }}>
                {checkingAri ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "#94a3b8", fontSize: "0.85rem", padding: "10px 0", width: "100%" }}>
                    <div style={{ width: 14, height: 14, border: "2px solid #6366f1", borderTopColor: "transparent", borderRadius: "50%", animation: "spSpin 0.6s linear infinite" }} />
                    Verifying call line...
                  </div>
                ) : ariCallType === "AUDIO" || isGoIpCall || (!ariCallType && !sdpHasVideo) ? (
                  <button className="sp-action-btn sp-action-answer" onClick={() => safeAnswer(false)} title="Answer Call">
                    <Phone size={18} />
                  </button>
                ) : (
                  <button className="sp-action-btn sp-action-video" onClick={() => safeAnswer(true)} title="Answer with Video">
                    <Video size={18} />
                  </button>
                )}
                <button className="sp-action-btn sp-action-reject" onClick={hangup}>
                  <PhoneMissed size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Dialpad */}
          <div className="sp-dial-row">
            <input
              className="sp-dial-input"
              value={dialInput}
              onChange={(e) => setDialInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && dialInput && registered && callState === "idle")
                  safeCall(dialInput, withVideo);
              }}
              placeholder="Enter number"
            />
            <button className="sp-icon-btn" onClick={() => setDialInput((p) => p.slice(0, -1))}>
              &#9003;
            </button>
          </div>
          <div className="sp-dialpad">
            {DIALPAD.map(({ key, sub }) => (
              <button key={key} className="sp-key" onClick={() => setDialInput((p) => p + key)}>
                <span className="sp-key-main">{key}</span>
                {sub && <span className="sp-key-sub">{sub}</span>}
              </button>
            ))}
          </div>
          <div className="sp-dial-actions">
            <label className="sp-toggle">
              <input type="checkbox" checked={withVideo} onChange={(e) => setWithVideo(e.target.checked)} />
              <span className="sp-toggle-track" />
              <Video size={16} />
              <span>Video</span>
            </label>
            <button
              className="sp-call-btn"
              onClick={() => {
                if (dialInput && registered && callState === "idle") safeCall(dialInput, withVideo);
              }}
              disabled={!dialInput || !registered || callState !== "idle" || !!mediaError}
            >
              <Phone size={16} />
            </button>
          </div>
        </div>

        {/* Column 2 — Video / Call */}
        <div className="sp-fs-col sp-fs-video-col">
          <div className="sp-fs-col-title">
            {callState === "ringing" ? "Calling..." : callState === "active" ? "On Call" : "Video"}
            {(callState === "active" || callState === "ringing") && (
              <div
                className={`sp-call-dot ${callState === "active" ? "active" : "ringing"}`}
                style={{ marginLeft: 8 }}
              />
            )}
          </div>

          {isAudioOnlyCall ? (
            /* Audio-only view */
            <div className="sp-fs-video-wrap sp-audio-call-wrap" style={{ flex: 1, background: "radial-gradient(circle at center, #1e1e38 0%, #0a0a14 100%)", display: "flex", flexDirection: "column" }}>
              <div className="sp-audio-call-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, padding: "24px", textAlign: "center" }}>
                <div className="sp-audio-avatar-wrap" style={{ position: "relative", marginBottom: "20px" }}>
                  <div className="sp-audio-avatar-glow" style={{ position: "absolute", inset: "-12px", borderRadius: "50%", background: "rgba(79, 70, 229, 0.25)", filter: "blur(16px)", animation: callState === "active" ? "pulseGlow 2s infinite" : "none" }} />
                  <div className="sp-incoming-avatar" style={{ margin: "0", width: 140, height: 140, border: "3px solid rgba(129, 140, 248, 0.6)", background: "rgba(79, 70, 229, 0.1)", boxShadow: "0 12px 36px rgba(0,0,0,0.5)", animation: callState === "ringing" ? "ring 1.2s ease infinite" : "none" }}>
                    {callerData?.avatar ? (
                      <img src={callerData.avatar} alt="Citizen" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                    ) : (
                      <User size={64} style={{ color: "#818cf8" }} />
                    )}
                  </div>
                </div>
                <div style={{ fontSize: "1.8rem", fontWeight: "700", marginBottom: "8px", color: "#f8fafc", letterSpacing: "0.5px" }}>
                  {callerData?.name || dialInput || "Citizen"}
                </div>
                {callerData?.address && (
                  <div style={{ fontSize: "1rem", opacity: 0.8, color: "#94a3b8", marginBottom: "20px", maxWidth: "400px", lineHeight: "1.4" }}>
                    {callerData.address}
                  </div>
                )}
                {callState === "ringing" ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#facc15", fontSize: "1rem", fontWeight: "500", background: "rgba(250, 204, 21, 0.1)", padding: "8px 24px", borderRadius: "24px" }}>
                    <Loader size={18} className="spin" />
                    <span>Calling...</span>
                  </div>
                ) : (
                  <div style={{ color: "#4ade80", fontSize: "1rem", fontWeight: "600", letterSpacing: "0.5px", textTransform: "uppercase", background: "rgba(74, 222, 128, 0.1)", padding: "6px 16px", borderRadius: "14px" }}>
                    Ongoing Call
                  </div>
                )}
              </div>
              <div className="sp-call-controls sp-audio-call-controls" style={{ background: "transparent", padding: "32px 20px 48px" }}>
                <button className={`sp-ctrl-btn ${muted ? "active" : ""}`} onClick={handleMute} style={{ width: "56px", height: "56px" }} title={muted ? "Unmute Mic" : "Mute Mic"}>
                  {muted ? <MicOff size={22} /> : <Mic size={22} />}
                </button>
                {callState === "active" && (
                  <button className={`sp-ctrl-btn ${held ? "active" : ""}`} onClick={onHold} style={{ width: "56px", height: "56px", background: held ? "rgba(250, 204, 21, 0.2)" : undefined, borderColor: held ? "rgba(250, 204, 21, 0.5)" : undefined }} title={held ? "Resume Call" : "Hold Call"}>
                    {held ? <Play size={22} /> : <Pause size={22} />}
                  </button>
                )}
                <button className="sp-ctrl-btn sp-ctrl-hangup" onClick={hangup} style={{ width: "64px", height: "64px", boxShadow: "0 8px 24px rgba(239, 68, 68, 0.4)" }} title="Hang Up">
                  <PhoneOff size={26} />
                </button>
              </div>
            </div>
          ) : (
            /* Video view */
            <>
              <div className="sp-fs-video-wrap">
                <video ref={remoteVideoRef} autoPlay playsInline className="sp-video-remote" onLoadedData={() => setRemoteVideoLoaded(true)} />
                {!videoMuted && <video ref={localVideoRef} autoPlay playsInline muted className="sp-video-local" />}
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
                      {callerData?.name || dialInput || "Citizen"}
                    </div>
                    {callerData?.address && (
                      <div style={{ fontSize: "0.85rem", opacity: 0.8, marginBottom: 16 }}>
                        Address: {callerData.address}
                      </div>
                    )}
                    {callState === "ringing" ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: 0.8, color: "#cbd5e1" }}>
                        <Loader size={18} className="spin" /> <span>Calling...</span>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: 0.8, color: "#cbd5e1" }}>
                        <Phone size={18} /> <span>In Call</span>
                      </div>
                    )}
                  </div>
                )}
                {callState === "idle" && (
                  <div className="sp-video-placeholder">
                    <Phone size={32} style={{ opacity: 0.2, color: "white" }} />
                    <span style={{ opacity: 0.4, color: "white" }}>No active call</span>
                  </div>
                )}
              </div>
              {(callState === "active" || callState === "ringing") && (
                <div className="sp-call-controls">
                  <button className={`sp-ctrl-btn ${muted ? "active" : ""}`} onClick={handleMute}>
                    {muted ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                  {callState === "active" && (
                    <button className={`sp-ctrl-btn ${held ? "active" : ""}`} onClick={onHold} style={{ background: held ? "rgba(250, 204, 21, 0.2)" : undefined, borderColor: held ? "rgba(250, 204, 21, 0.5)" : undefined }} title={held ? "Resume Call" : "Hold Call"}>
                      {held ? <Play size={16} /> : <Pause size={16} />}
                    </button>
                  )}
                  <button className="sp-ctrl-btn sp-ctrl-hangup" onClick={hangup}>
                    <PhoneOff size={18} />
                  </button>
                  <button className={`sp-ctrl-btn ${videoMuted ? "active" : ""}`} onClick={handleVideoMute}>
                    {videoMuted ? <VideoOff size={16} /> : <Video size={16} />}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Column 3 — Settings (slide in/out) */}
        <div className={`sp-fs-col sp-fs-settings-col ${showFsSettings ? "open" : ""}`}>
          <div className="sp-fs-col-title">
            Settings
            <button className="sp-icon-btn" onClick={() => setShowFsSettings(false)} style={{ marginLeft: "auto" }}>
              <X size={13} />
            </button>
          </div>
          <div className="sp-fs-settings-body">
            <div className="sp-settings-status">
              <div className={`sp-status-indicator ${statusColor}`}>
                {registered ? <Wifi size={12} /> : reconnecting ? <Loader size={12} className="spin" /> : <WifiOff size={12} />}
                <span>
                  {registered ? `Ext. ${activeConfig?.extension}` : reconnecting ? "Reconnecting..." : "Not connected"}
                </span>
              </div>
              {activeConfig && (
                <button className="sp-settings-disconnect" onClick={() => { setActiveConfig(null); setShowFsSettings(false); }}>
                  <LogOut size={13} /> Disconnect
                </button>
              )}
            </div>
            <form className="sp-login-form" onSubmit={handleConnect}>
              {[
                { icon: <Server size={14} />, ph: "Server IP", k: "server", t: "text" },
                { icon: <User size={14} />, ph: "Extension", k: "extension", t: "text" },
                { icon: <Lock size={14} />, ph: "Password", k: "password", t: "password" },
                { icon: <User size={14} />, ph: "Display Name (opt.)", k: "displayName", t: "text" },
              ].map(({ icon, ph, k, t }) => (
                <div className="sp-field" key={k}>
                  {icon}
                  <input
                    placeholder={ph}
                    type={t}
                    value={form[k]}
                    onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                    required={k !== "displayName"}
                  />
                </div>
              ))}
              <div className="sp-proto-row">
                <div className="sp-field sp-proto-select">
                  <Monitor size={14} />
                  <select value={SIP_WS_PROTOCOL} disabled>
                    <option value="wss">wss:// (8089)</option>
                  </select>
                </div>
                <div className="sp-field sp-proto-port">
                  <Hash size={14} />
                  <input placeholder="Port" value={SIP_WS_PORT} readOnly required />
                </div>
              </div>
              <div className="sp-ws-preview">
                <Monitor size={11} /> {wsPreview}
              </div>
              <p className="sp-settings-label" style={{ marginTop: 6 }}>UI Preferences</p>
              <div className="sp-prefs-list">
                {settingConfigToggles.fullscreen && <ToggleRow label="Fullscreen Mode" k="fullscreen" uiPrefs={uiPrefs} onToggle={onToggle} />}
                {settingConfigToggles.autoAnswerVideo && <ToggleRow label="Answer with Video" k="answerwithVideoCall" uiPrefs={uiPrefs} onToggle={onToggle} />}
                {settingConfigToggles.answerButtonVideo && <ToggleRow label="Show Video Answer Btn" k="ShowIncomingCallVideoBtn" uiPrefs={uiPrefs} onToggle={onToggle} />}
                {settingConfigToggles.answerButtonAudio && <ToggleRow label="Show Audio Answer Btn" k="ShowIncomingCallAudio" uiPrefs={uiPrefs} onToggle={onToggle} />}
                {settingConfigToggles.autoRecording && <ToggleRow label="Auto Record Calls" k="autoRecord" uiPrefs={uiPrefs} onToggle={onToggle} />}
              </div>
              {uiPrefs.autoRecord && (
                <>
                  <div className="sp-field" style={{ marginTop: 8 }}>
                    <Server size={14} />
                    <input placeholder="video/recordings/Ksip" type="text" value={form.recordingDir} onChange={(e) => setForm((f) => ({ ...f, recordingDir: e.target.value }))} />
                  </div>
                  <div className="sp-field" style={{ marginTop: 8 }}>
                    <Server size={14} />
                    <input placeholder="Upload API URL (optional)" type="url" value={form.uploadApiUrl} onChange={(e) => setForm((f) => ({ ...f, uploadApiUrl: e.target.value }))} />
                  </div>
                </>
              )}
              <p className="sp-settings-label" style={{ marginTop: 10 }}>Audio Codecs</p>
              {availableAudioCodecs.map((c) => (
                <label key={c} className="sp-codec-item">
                  <input type="checkbox" checked={form.audioCodecs.includes(c)} onChange={() => toggleCodec("audio", c)} />
                  {c}
                </label>
              ))}
              <p className="sp-settings-label" style={{ marginTop: 10 }}>Video Codecs</p>
              {availableVideoCodecs.map((c) => (
                <label key={c} className="sp-codec-item">
                  <input type="checkbox" checked={form.videoCodecs.includes(c)} onChange={() => toggleCodec("video", c)} />
                  {c}
                </label>
              ))}
              <p className="sp-settings-label" style={{ marginTop: 10 }}>
                Panel Position
              </p>
              <div className="sp-position-grid">
                {PANEL_POSITIONS.map((pos) => (
                  <button key={pos} type="button" title={pos} className={`sp-pos-btn ${panelPosition === pos ? "active" : ""}`} onClick={() => setPanelPosition(pos)} />
                ))}
              </div>
              <p className="sp-settings-label" style={{ marginTop: 10 }}>Offset (px)</p>
              <div className="sp-offset-grid">
                {["top", "right", "bottom", "left"].map((side) => (
                  <div key={side} className="sp-offset-field">
                    <span>{side[0].toUpperCase()}</span>
                    <input type="number" min="0" max="999" value={panelOffset[side]} onChange={(e) => setPanelOffset((o) => ({ ...o, [side]: Number(e.target.value) }))} />
                  </div>
                ))}
              </div>
              <p className="sp-settings-label" style={{ marginTop: 10 }}>
                <SlidersHorizontal size={13} /> Opacity — {Math.round(fabOpacity * 100)}%
              </p>
              <input type="range" min="0.3" max="1" step="0.05" value={fabOpacity} onChange={(e) => setFabOpacity(Number(e.target.value))} className="sp-slider" />
              <button type="submit" className="sp-login-btn">
                <Phone size={14} /> {activeConfig ? "Save & Reconnect" : "Save & Connect"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Caller Info Modal (overlaid on fullscreen) */}
      {showCallerInfoModal && (
        <CallerInfoModal
          nodeRef={callerInfoNodeRef}
          defaultPosition={callerInfoDefaultPos}
          callerInfoForm={callerInfoForm}
          setCallerInfoForm={setCallerInfoForm}
          callerInfoMobileNumber={callerInfoMobileNumber}
          callerInfoErrors={callerInfoErrors}
          submittingCallerInfo={submittingCallerInfo}
          onSubmit={handleCallerInfoSubmit}
          onClose={() => setShowCallerInfoModal(false)}
        />
      )}
    </div>
  );
}

import {
  Phone,
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
  SlidersHorizontal,
} from "lucide-react";
import ToggleRow from "./ToggleRow";
import { SIP_WS_PROTOCOL, SIP_WS_PORT, PANEL_POSITIONS } from "../../utils/softphone.utils";

/**
 * SettingsPanel — 3-column settings modal.
 * Used in both bubble mode and standalone (non-fullscreen) mode.
 *
 * Props: see below
 */
export default function SettingsPanel({
  show,
  form,
  setForm,
  uiPrefs,
  onToggle,
  onConnect,
  onClose,
  onDisconnect,
  activeConfig,
  registered,
  reconnecting,
  error,
  mediaError,
  statusColor,
  fabOpacity,
  setFabOpacity,
  availableAudioCodecs,
  availableVideoCodecs,
  toggleCodec,
  wsPreview,
  settingConfigToggles,
  settingConfigCodecs,
  panelPosition,
  setPanelPosition,
  panelOffset,
  setPanelOffset,
}) {
  if (!show) return null;

  return (
    <>
      <div
        className="sp-settings-backdrop"
        onClick={() => {
          console.log("🖱️ Backdrop clicked, closing settings");
          onClose();
        }}
      />
      <div className="sp-settings-panel">
        <div className="sp-settings-header">
          <Settings size={14} />
          <span>Settings</span>
          <button
            className="sp-icon-btn"
            onClick={() => {
              console.log("❌ Close button clicked");
              onClose();
            }}
            style={{ marginLeft: "auto" }}
          >
            <X size={13} />
          </button>
        </div>
        <div className="sp-settings-body">
          {/* Status row — full width */}
          <div className="sp-settings-status">
            <div className={`sp-status-indicator ${statusColor}`}>
              {registered ? (
                <Wifi size={12} />
              ) : reconnecting ? (
                <Loader size={12} className="spin" />
              ) : (
                <WifiOff size={12} />
              )}
              <span>
                {registered
                  ? `Ext. ${activeConfig?.extension}`
                  : reconnecting
                    ? "Reconnecting..."
                    : "Not connected"}
              </span>
            </div>
            {activeConfig && (
              <button
                className="sp-settings-disconnect"
                onClick={() => {
                  onDisconnect();
                  onClose();
                }}
              >
                <LogOut size={13} /> Disconnect
              </button>
            )}
          </div>
          {error && !reconnecting && (
            <p className="sp-settings-error">&#9888; {error}</p>
          )}
          {mediaError && <p className="sp-settings-error">&#9888; {mediaError}</p>}

          {/* 3-column grid */}
          <div className="sp-settings-cols">
            {/* Column 1 — SIP Config */}
            <div className="sp-settings-col">
              <p className="sp-col-title">SIP Configuration</p>
              <form className="sp-login-form" onSubmit={onConnect}>
                {[
                  { icon: <Server size={14} />, ph: "FreePBX Server IP", k: "server", t: "text" },
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
                <button type="submit" className="sp-login-btn">
                  <Phone size={14} />{" "}
                  {activeConfig ? "Save & Reconnect" : "Save & Connect"}
                </button>
              </form>
            </div>

            {/* Column 2 — Codecs + Opacity */}
            <div className="sp-settings-col">
              <p className="sp-col-title">Codecs</p>
              {settingConfigCodecs.audio.visible && (
                <>
                  <p className="sp-settings-label">Audio</p>
                  {availableAudioCodecs.map((c) => (
                    <label key={c} className="sp-codec-item">
                      <input
                        type="checkbox"
                        checked={form.audioCodecs.includes(c)}
                        onChange={() => toggleCodec("audio", c)}
                      />
                      {c}
                    </label>
                  ))}
                </>
              )}
              {settingConfigCodecs.video.visible && (
                <>
                  <p className="sp-settings-label" style={{ marginTop: 10 }}>
                    Video
                  </p>
                  {availableVideoCodecs.map((c) => (
                    <label key={c} className="sp-codec-item">
                      <input
                        type="checkbox"
                        checked={form.videoCodecs.includes(c)}
                        onChange={() => toggleCodec("video", c)}
                      />
                      {c}
                    </label>
                  ))}
                </>
              )}
              {uiPrefs.showOpacity && (
                <>
                  <p className="sp-settings-label" style={{ marginTop: 10 }}>
                    <SlidersHorizontal size={13} /> Opacity —{" "}
                    {Math.round(fabOpacity * 100)}%
                  </p>
                  <input
                    type="range"
                    min="0.3"
                    max="1"
                    step="0.05"
                    value={fabOpacity}
                    onChange={(e) => setFabOpacity(Number(e.target.value))}
                    className="sp-slider"
                  />
                </>
              )}
            </div>

            {/* Column 3 — UI Preferences */}
            <div className="sp-settings-col">
              <p className="sp-col-title">UI Preferences</p>
              <div className="sp-prefs-list">
                {settingConfigToggles.bubble && (
                  <ToggleRow label="Show Bubble" k="enabledBubble" uiPrefs={uiPrefs} onToggle={onToggle} />
                )}
                {settingConfigToggles.dialer && (
                  <ToggleRow label="Show Dialer Button" k="showDialer" uiPrefs={uiPrefs} onToggle={onToggle} />
                )}
                {settingConfigToggles.settings && (
                  <ToggleRow label="Show Settings Button" k="showSetting" uiPrefs={uiPrefs} onToggle={onToggle} />
                )}
                {settingConfigToggles.opacity && (
                  <ToggleRow label="Show Opacity Button" k="showOpacity" uiPrefs={uiPrefs} onToggle={onToggle} />
                )}
                {settingConfigToggles.autoAnswerVideo && (
                  <ToggleRow label="Answer with Video" k="answerwithVideoCall" uiPrefs={uiPrefs} onToggle={onToggle} />
                )}
                {settingConfigToggles.answerButtonVideo && (
                  <ToggleRow label="Show Video Answer Btn" k="ShowIncomingCallVideoBtn" uiPrefs={uiPrefs} onToggle={onToggle} />
                )}
                {settingConfigToggles.answerButtonAudio && (
                  <ToggleRow label="Show Audio Answer Btn" k="ShowIncomingCallAudio" uiPrefs={uiPrefs} onToggle={onToggle} />
                )}
                {settingConfigToggles.fullscreen && (
                  <ToggleRow label="Fullscreen Mode" k="fullscreen" uiPrefs={uiPrefs} onToggle={onToggle} />
                )}
                {settingConfigToggles.autoRecording && (
                  <ToggleRow label="Auto Record Calls" k="autoRecord" uiPrefs={uiPrefs} onToggle={onToggle} />
                )}
              </div>

              {uiPrefs.autoRecord && (
                <>
                  <p className="sp-settings-label" style={{ marginTop: 10 }}>
                    Recording Directory
                  </p>
                  <div className="sp-field">
                    <Server size={14} />
                    <input
                      placeholder="video/recordings/Ksip"
                      type="text"
                      value={form.recordingDir}
                      onChange={(e) => setForm((f) => ({ ...f, recordingDir: e.target.value }))}
                    />
                  </div>
                  <p className="sp-settings-label" style={{ marginTop: 10 }}>
                    Upload API URL (optional)
                  </p>
                  <div className="sp-field">
                    <Server size={14} />
                    <input
                      placeholder="https://api.example.com/upload-recording"
                      type="url"
                      value={form.uploadApiUrl}
                      onChange={(e) => setForm((f) => ({ ...f, uploadApiUrl: e.target.value }))}
                    />
                  </div>
                </>
              )}

              <p className="sp-col-title" style={{ marginTop: 12 }}>
                Panel Position
              </p>
              <div className="sp-position-grid">
                {PANEL_POSITIONS.map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    title={pos}
                    className={`sp-pos-btn ${panelPosition === pos ? "active" : ""}`}
                    onClick={() => setPanelPosition(pos)}
                  />
                ))}
              </div>
              <p className="sp-settings-label" style={{ marginTop: 10 }}>
                Offset (px)
              </p>
              <div className="sp-offset-grid">
                {["top", "right", "bottom", "left"].map((side) => (
                  <div key={side} className="sp-offset-field">
                    <span>{side[0].toUpperCase()}</span>
                    <input
                      type="number"
                      min="0"
                      max="999"
                      value={panelOffset[side]}
                      onChange={(e) =>
                        setPanelOffset((o) => ({ ...o, [side]: Number(e.target.value) }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

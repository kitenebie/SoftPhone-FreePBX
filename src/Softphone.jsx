import { useState, useEffect, useRef } from "react";
import Draggable from "react-draggable";
import {
  Phone, PhoneOff, PhoneIncoming, PhoneMissed,
  Mic, MicOff, Video, VideoOff, Delete,
  GripHorizontal, Wifi, WifiOff, Loader,
  User, Lock, Server, Hash, Monitor,
  Maximize2, Minimize2, Settings, Grid3x3,
  SlidersHorizontal, X, LogOut,
} from "lucide-react";
import { useSIP } from "./hooks/useSIP.js";
import { useDraggable } from "./hooks/useDraggable.js";
import { useResizable } from "./hooks/useResizable.js";
import { ksipcall } from "./ksipcall.js";
import "./Softphone.css";

const DIALPAD = [
  { key: "1", sub: "" },    { key: "2", sub: "ABC" },  { key: "3", sub: "DEF" },
  { key: "4", sub: "GHI" }, { key: "5", sub: "JKL" },  { key: "6", sub: "MNO" },
  { key: "7", sub: "PQRS" },{ key: "8", sub: "TUV" },  { key: "9", sub: "WXYZ" },
  { key: "*", sub: "" },    { key: "0", sub: "+" },    { key: "#", sub: "" },
];

const AUDIO_CODECS = ["PCMU", "PCMA", "G722", "G729", "opus"];
const VIDEO_CODECS = ["VP8", "VP9", "H264", "H265", "AV1"];

const STORAGE_KEY = "sip_softphone_config";
function loadConfig() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; } }
function saveConfig(c) { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); }
function buildWs(protocol, server, port) { return `${protocol}://${server}:${port}/ws`; }

const PANEL_POSITIONS = [
  "top-left", "top-center", "top-right",
  "center-left", "center", "center-right",
  "bottom-left", "bottom-center", "bottom-right",
];

function computePanelPos(position = "center", w = 0, h = 0, offset = {}) {
  const t = offset.top    ?? 12;
  const r = offset.right  ?? 12;
  const b = offset.bottom ?? 12;
  const l = offset.left   ?? 12;
  const W = window.innerWidth;
  const H = window.innerHeight;
  const cx = Math.round(W / 2 - w / 2);
  const cy = Math.round(H / 2 - h / 2);
  const positions = {
    "top-left":      { x: l,          y: t },
    "top-center":    { x: cx,         y: t },
    "top-right":     { x: W - w - r,  y: t },
    "center-left":   { x: l,          y: cy },
    "center":        { x: cx,         y: cy },
    "center-right":  { x: W - w - r,  y: cy },
    "bottom-left":   { x: l,          y: H - h - b },
    "bottom-center": { x: cx,         y: H - h - b },
    "bottom-right":  { x: W - w - r,  y: H - h - b },
  };
  const pos = positions[position] ?? positions["center"];
  return { x: Math.max(0, pos.x), y: Math.max(0, pos.y) };
}

// ToggleRow defined outside component to avoid react-hooks/static-components error
function ToggleRow({ label, k, uiPrefs, onToggle }) {
  return (
    <div className="sp-pref-row">
      <span>{label}</span>
      <button
        className={`sp-pref-toggle ${uiPrefs[k] ? "on" : ""}`}
        onClick={() => onToggle(k, !uiPrefs[k])}
        type="button"
      >
        <span className="sp-pref-thumb"/>
      </button>
    </div>
  );
}

export default function Softphone({
  enabledBubble                = true,
  showDialer: showDialerProp   = true,
  showSetting: showSettingProp = true,
  showOpacity: showOpacityProp = true,
  answerwithVideoCall          = false,
  ShowIncomingCallVideoBtn     = true,
  ShowIncomingCallAudio        = true,
  panelPosition: panelPositionProp = "center",
  panelOffset:   panelOffsetProp   = {},
  // SIP config props
  server:      serverProp      = "",
  wsProtocol:  wsProtocolProp  = "ws",
  wsPort:      wsPortProp      = "8088",
  extension:   extensionProp   = "",
  password:    passwordProp    = "",
  displayName: displayNameProp = "",
}) {
  const saved = loadConfig();

  const [panelPosition, setPanelPosition] = useState(
    saved?.panelPosition ?? panelPositionProp
  );
  const [panelOffset, setPanelOffset] = useState({
    top:    saved?.panelOffset?.top    ?? panelOffsetProp.top    ?? 12,
    right:  saved?.panelOffset?.right  ?? panelOffsetProp.right  ?? 12,
    bottom: saved?.panelOffset?.bottom ?? panelOffsetProp.bottom ?? 12,
    left:   saved?.panelOffset?.left   ?? panelOffsetProp.left   ?? 12,
  });

  const [form, setForm] = useState({
    server:      saved?.server      || serverProp      || "",
    wsProtocol:  saved?.wsProtocol  || wsProtocolProp  || "ws",
    wsPort:      saved?.wsPort      || wsPortProp      || "8088",
    extension:   saved?.extension   || extensionProp   || "",
    password:    saved?.password    || passwordProp    || "",
    displayName: saved?.displayName || displayNameProp || "",
    audioCodecs: saved?.audioCodecs || ["PCMU", "PCMA", "opus"],
    videoCodecs: saved?.videoCodecs || ["VP8", "H264"],
  });

  const [uiPrefs, setUiPrefs] = useState({
    enabledBubble:            enabledBubble,                                        // never from localStorage
    showDialer:               saved?.showDialer               ?? showDialerProp,
    showSetting:              showSettingProp,                                       // never from localStorage
    showOpacity:              saved?.showOpacity              ?? showOpacityProp,
    answerwithVideoCall:      saved?.answerwithVideoCall       ?? answerwithVideoCall,
    ShowIncomingCallVideoBtn: saved?.ShowIncomingCallVideoBtn  ?? ShowIncomingCallVideoBtn,
    ShowIncomingCallAudio:    saved?.ShowIncomingCallAudio     ?? (answerwithVideoCall ? false : ShowIncomingCallAudio),
  });

  const [activeConfig, setActiveConfig] = useState(() => {
    // Auto-connect if saved config OR all required props are provided
    const s = saved?.server      || serverProp;
    const e = saved?.extension   || extensionProp;
    const p = saved?.password    || passwordProp;
    const proto = saved?.wsProtocol || wsProtocolProp || "ws";
    const port  = saved?.wsPort     || wsPortProp     || "8088";
    if (s && e && p)
      return { server: s, extension: e, password: p, wsProtocol: proto, wsPort: port,
               displayName: saved?.displayName || displayNameProp || "",
               wsServer: buildWs(proto, s, port) };
    return null;
  });

  const [dialInput,    setDialInput]    = useState("");
  const [withVideo,    setWithVideo]    = useState(false);
  const [muted,        setMuted]        = useState(false);
  const [videoMuted,   setVideoMuted]   = useState(false);
  const [expanded,     setExpanded]     = useState(false);
  const [navOpen,      setNavOpen]      = useState(false);
  const [showDialer,   setShowDialer]   = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [fabOpacity,   setFabOpacity]   = useState(1);

  const sipConfig = activeConfig ?? { server: "", wsServer: "", extension: "", password: "" };
  const {
    registered, callState, incomingSession, error, reconnecting,
    localVideoRef, remoteVideoRef, remoteAudioRef,
    call, answer, hangup, mute, toggleVideo,
  } = useSIP(sipConfig);

  const fabPanel      = useDraggable({ x: window.innerWidth - 90, y: 24 });
  const videoSize     = useResizable({ w: 360, h: 280 }, { w: 260, h: 200 });
  const videoNodeRef  = useRef(null);
  const dialerNodeRef = useRef(null);

  useEffect(() => {
    const unsub = ksipcall._subscribe(({ target, video }) => {
      if (!registered) return;
      setDialInput(target);
      setWithVideo(video);
      call(target, video);
    });
    return unsub;
  }, [registered, call]);

  const handleConnect = (e) => {
    e.preventDefault();
    const config = {
      server: form.server, wsPort: form.wsPort, wsProtocol: form.wsProtocol,
      wsServer: buildWs(form.wsProtocol, form.server, form.wsPort),
      extension: form.extension, password: form.password,
      displayName: form.displayName,
      audioCodecs: form.audioCodecs,
      videoCodecs: form.videoCodecs,
      panelPosition,
      panelOffset,
      // Save all uiPrefs EXCEPT enabledBubble and showSetting
      ...Object.fromEntries(
        Object.entries(uiPrefs).filter(([k]) => k !== "enabledBubble" && k !== "showSetting")
      ),
    };
    saveConfig(config);
    setActiveConfig(config);
    setShowSettings(false);
  };

  const handleMute = () => { mute(!muted); setMuted((m) => !m); };
  const handleVideoMute = () => {
    const next = !videoMuted;
    setVideoMuted(next);
    toggleVideo(next);
  };

  const handleUiPref = (key, val) => {
    setUiPrefs((p) => {
      const next = { ...p, [key]: val };
      if (key === "answerwithVideoCall" && val) next.ShowIncomingCallAudio = false;
      if (key === "ShowIncomingCallAudio" && val) next.answerwithVideoCall = false;
      return next;
    });
  };

  const toggleCodec = (type, codec) => {
    setForm((f) => {
      const key = type === "audio" ? "audioCodecs" : "videoCodecs";
      const list = f[key];
      return { ...f, [key]: list.includes(codec) ? list.filter((c) => c !== codec) : [...list, codec] };
    });
  };

  const statusColor     = registered ? "status-green" : reconnecting ? "status-yellow" : "status-red";
  const fabInBottomHalf = fabPanel.pos.y > window.innerHeight / 2;
  const fabInRightHalf  = fabPanel.pos.x > window.innerWidth  / 2;
  const navClass = `sp-fab-wrap ${fabInBottomHalf ? "nav-up" : "nav-down"} ${fabInRightHalf ? "nav-left" : "nav-right"}`;

  const effectiveAnswerVideo = uiPrefs.answerwithVideoCall;
  const showAudioBtn = !effectiveAnswerVideo && uiPrefs.ShowIncomingCallAudio;
  const showVideoBtn = uiPrefs.ShowIncomingCallVideoBtn;

  if (!uiPrefs.enabledBubble) return null;

  return (
    <div className="sp-workspace">
      <audio ref={remoteAudioRef} autoPlay />

      {/* Incoming Call Overlay */}
      {callState === "incoming" && (
        <div className="sp-incoming-overlay">
          <div className="sp-incoming-card">
            <div className="sp-incoming-avatar"><PhoneIncoming size={26}/></div>
            <p className="sp-incoming-label">Incoming Call</p>
            <p className="sp-incoming-caller">
              {incomingSession?.remoteIdentity?.displayName ||
               incomingSession?.remoteIdentity?.uri?.user || "Unknown"}
            </p>
            <div className="sp-incoming-actions">
              {effectiveAnswerVideo
                ? <button className="sp-action-btn sp-action-video" onClick={() => answer(true)}><Video size={20}/></button>
                : <>
                    {showAudioBtn && <button className="sp-action-btn sp-action-answer" onClick={() => answer(false)}><Phone size={20}/></button>}
                    {showVideoBtn && <button className="sp-action-btn sp-action-video"  onClick={() => answer(true)}><Video size={20}/></button>}
                  </>
              }
              <button className="sp-action-btn sp-action-reject" onClick={hangup}><PhoneMissed size={20}/></button>
            </div>
          </div>
        </div>
      )}

      {/* Draggable + Resizable Video Panel */}
      {(callState === "active" || callState === "ringing" || callState === "incoming") && (
        <Draggable nodeRef={videoNodeRef} handle=".sp-panel-header" bounds="parent" defaultPosition={computePanelPos(panelPosition, 360, 320, panelOffset)}>
          <div ref={videoNodeRef}
            className={`sp-video-panel ${expanded ? "sp-video-expanded" : ""}`}
            style={expanded ? {} : { width: `${videoSize.size.w}px`, height: `${videoSize.size.h}px` }}>
            <div className="sp-panel-inner">
              <div className="sp-panel-header">
                <GripHorizontal size={14}/>
                <span>{callState === "ringing" ? "Calling..." : "On Call"}</span>
                <div className={`sp-call-dot ${callState === "active" ? "active" : "ringing"}`}/>
                <button className="sp-icon-btn" onClick={() => setExpanded((e) => !e)} style={{ marginLeft: "auto" }}>
                  {expanded ? <Minimize2 size={13}/> : <Maximize2 size={13}/>}
                </button>
              </div>
              <div className="sp-video-wrap">
                <video ref={remoteVideoRef} autoPlay playsInline className="sp-video-remote"/>
                {!videoMuted && <video ref={localVideoRef} autoPlay playsInline muted className="sp-video-local"/>}
                {callState === "ringing" && (
                  <div className="sp-video-placeholder">
                    <Loader size={28} className="spin"/>
                    <span>Waiting for answer...</span>
                  </div>
                )}
              </div>
              <div className="sp-call-controls">
                <button className={`sp-ctrl-btn ${muted ? "active" : ""}`} onClick={handleMute}>
                  {muted ? <MicOff size={16}/> : <Mic size={16}/>}
                </button>
                <button className="sp-ctrl-btn sp-ctrl-hangup" onClick={hangup}><PhoneOff size={18}/></button>
                <button className={`sp-ctrl-btn ${videoMuted ? "active" : ""}`} onClick={handleVideoMute}>
                  {videoMuted ? <VideoOff size={16}/> : <Video size={16}/>}
                </button>
              </div>
            </div>
            {!expanded && <div className="sp-resize-handle" onMouseDown={videoSize.onResizeStart}/>}
          </div>
        </Draggable>
      )}

      {/* Draggable Dialer Panel */}
      {showDialer && (
        <Draggable nodeRef={dialerNodeRef} handle=".sp-panel-header" bounds="parent" defaultPosition={computePanelPos(panelPosition, 300, 460, panelOffset)}>
          <div ref={dialerNodeRef} className="sp-dialer-panel">
            <div className="sp-panel-inner">
              <div className="sp-panel-header">
                <GripHorizontal size={14}/>
                <span>Dialer</span>
                <button className="sp-icon-btn" onClick={() => setShowDialer(false)} style={{ marginLeft: "auto" }}>
                  <X size={13}/>
                </button>
              </div>
              <div className="sp-dial-row">
                <input className="sp-dial-input" value={dialInput}
                  onChange={(e) => setDialInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && dialInput && registered && callState === "idle") { call(dialInput, withVideo); setShowDialer(false); } }}
                  placeholder="Enter number"/>
                <button className="sp-icon-btn" onClick={() => setDialInput((p) => p.slice(0, -1))}>
                  <Delete size={16}/>
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
                  <input type="checkbox" checked={withVideo} onChange={(e) => setWithVideo(e.target.checked)}/>
                  <span className="sp-toggle-track"/>
                  <Video size={12}/><span>Video</span>
                </label>
                <button className="sp-call-btn"
                  onClick={() => { if (dialInput && registered && callState === "idle") { call(dialInput, withVideo); setShowDialer(false); } }}
                  disabled={!dialInput || !registered || callState !== "idle"}>
                  <Phone size={16}/>
                </button>
              </div>
            </div>
          </div>
        </Draggable>
      )}

      {/* Settings Panel — 3-column layout */}
      {showSettings && (
        <>
          <div className="sp-settings-backdrop" onClick={() => setShowSettings(false)}/>
          <div className="sp-settings-panel">
            <div className="sp-settings-header">
              <Settings size={14}/><span>Settings</span>
              <button className="sp-icon-btn" onClick={() => setShowSettings(false)} style={{ marginLeft: "auto" }}>
                <X size={13}/>
              </button>
            </div>
            <div className="sp-settings-body">

              {/* Status row — full width */}
              <div className="sp-settings-status">
                <div className={`sp-status-indicator ${statusColor}`}>
                  {registered ? <Wifi size={12}/> : reconnecting ? <Loader size={12} className="spin"/> : <WifiOff size={12}/>}
                  <span>{registered ? `Ext. ${activeConfig?.extension}` : reconnecting ? "Reconnecting..." : "Not connected"}</span>
                </div>
                {activeConfig && (
                  <button className="sp-settings-disconnect"
                    onClick={() => { setActiveConfig(null); setShowSettings(false); }}>
                    <LogOut size={13}/> Disconnect
                  </button>
                )}
              </div>
              {error && !reconnecting && <p className="sp-settings-error">&#9888; {error}</p>}

              {/* 3-column grid */}
              <div className="sp-settings-cols">

                {/* Column 1 — SIP Config */}
                <div className="sp-settings-col">
                  <p className="sp-col-title">SIP Configuration</p>
                  <form className="sp-login-form" onSubmit={handleConnect}>
                    {[
                      { icon: <Server size={14}/>, ph: "FreePBX Server IP",   k: "server",      t: "text"     },
                      { icon: <User   size={14}/>, ph: "Extension",           k: "extension",   t: "text"     },
                      { icon: <Lock   size={14}/>, ph: "Password",            k: "password",    t: "password" },
                      { icon: <User   size={14}/>, ph: "Display Name (opt.)", k: "displayName", t: "text"     },
                    ].map(({ icon, ph, k, t }) => (
                      <div className="sp-field" key={k}>
                        {icon}
                        <input placeholder={ph} type={t} value={form[k]}
                          onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                          required={k !== "displayName"} />
                      </div>
                    ))}
                    <div className="sp-proto-row">
                      <div className="sp-field sp-proto-select">
                        <Monitor size={14}/>
                        <select value={form.wsProtocol} onChange={(e) => setForm((f) => ({ ...f, wsProtocol: e.target.value }))}>
                          <option value="ws">ws:// (8088)</option>
                          <option value="wss">wss:// (8089)</option>
                        </select>
                      </div>
                      <div className="sp-field sp-proto-port">
                        <Hash size={14}/>
                        <input placeholder="Port" value={form.wsPort}
                          onChange={(e) => setForm((f) => ({ ...f, wsPort: e.target.value }))} required />
                      </div>
                    </div>
                    <div className="sp-ws-preview">
                      <Monitor size={11}/> {form.wsProtocol}://{form.server || "..."}:{form.wsPort}/ws
                    </div>
                    <button type="submit" className="sp-login-btn">
                      <Phone size={14}/> {activeConfig ? "Save & Reconnect" : "Save & Connect"}
                    </button>
                  </form>
                </div>

                {/* Column 2 — Codecs + Opacity */}
                <div className="sp-settings-col">
                  <p className="sp-col-title">Codecs</p>
                  <p className="sp-settings-label">Audio</p>
                  {AUDIO_CODECS.map((c) => (
                    <label key={c} className="sp-codec-item">
                      <input type="checkbox" checked={form.audioCodecs.includes(c)} onChange={() => toggleCodec("audio", c)}/>
                      {c}
                    </label>
                  ))}
                  <p className="sp-settings-label" style={{ marginTop: 10 }}>Video</p>
                  {VIDEO_CODECS.map((c) => (
                    <label key={c} className="sp-codec-item">
                      <input type="checkbox" checked={form.videoCodecs.includes(c)} onChange={() => toggleCodec("video", c)}/>
                      {c}
                    </label>
                  ))}
                  {uiPrefs.showOpacity && (
                    <>
                      <p className="sp-settings-label" style={{ marginTop: 10 }}>
                        <SlidersHorizontal size={13}/> Opacity — {Math.round(fabOpacity * 100)}%
                      </p>
                      <input type="range" min="0.3" max="1" step="0.05"
                        value={fabOpacity} onChange={(e) => setFabOpacity(Number(e.target.value))}
                        className="sp-slider"/>
                    </>
                  )}
                </div>

                {/* Column 3 — UI Preferences */}
                <div className="sp-settings-col">
                  <p className="sp-col-title">UI Preferences</p>
                  <div className="sp-prefs-list">
                    <ToggleRow label="Show Bubble"           k="enabledBubble"            uiPrefs={uiPrefs} onToggle={handleUiPref}/>
                    <ToggleRow label="Show Dialer Button"    k="showDialer"               uiPrefs={uiPrefs} onToggle={handleUiPref}/>
                    <ToggleRow label="Show Settings Button"  k="showSetting"              uiPrefs={uiPrefs} onToggle={handleUiPref}/>
                    <ToggleRow label="Show Opacity Button"   k="showOpacity"              uiPrefs={uiPrefs} onToggle={handleUiPref}/>
                    <ToggleRow label="Answer with Video"     k="answerwithVideoCall"       uiPrefs={uiPrefs} onToggle={handleUiPref}/>
                    <ToggleRow label="Show Video Answer Btn" k="ShowIncomingCallVideoBtn" uiPrefs={uiPrefs} onToggle={handleUiPref}/>
                    <ToggleRow label="Show Audio Answer Btn" k="ShowIncomingCallAudio"    uiPrefs={uiPrefs} onToggle={handleUiPref}/>
                  </div>

                  <p className="sp-col-title" style={{ marginTop: 12 }}>Panel Position</p>
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
                  <p className="sp-settings-label" style={{ marginTop: 10 }}>Offset (px)</p>
                  <div className="sp-offset-grid">
                    {["top", "right", "bottom", "left"].map((side) => (
                      <div key={side} className="sp-offset-field">
                        <span>{side[0].toUpperCase()}</span>
                        <input
                          type="number" min="0" max="999"
                          value={panelOffset[side]}
                          onChange={(e) => setPanelOffset((o) => ({ ...o, [side]: Number(e.target.value) }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </>
      )}

      {/* Floating FAB */}
      {/* eslint-disable-next-line react-hooks/refs */}
      <div ref={fabPanel.ref} className={navClass}
        style={{ transform: `translate(${fabPanel.pos.x}px, ${fabPanel.pos.y}px)` }}>
        <div className={`sp-fab-menu ${navOpen ? "open" : ""}`}>
          {uiPrefs.showOpacity && (
            <button className="sp-fab-item" title="Opacity"
              onClick={() => setFabOpacity((o) => o <= 0.3 ? 1 : Math.max(0.3, +(o - 0.2).toFixed(2)))}>
              <SlidersHorizontal size={16}/>
            </button>
          )}
          {uiPrefs.showDialer && (
            <button className={`sp-fab-item ${showDialer ? "fab-active" : ""}`} title="Dialer"
              onClick={() => { setShowDialer((d) => !d); setShowSettings(false); }}>
              <Grid3x3 size={16}/>
            </button>
          )}
          {uiPrefs.showSetting && (
            <button className={`sp-fab-item ${showSettings ? "fab-active" : ""}`} title="Settings"
              onClick={() => { setShowSettings((s) => !s); setShowDialer(false); }}>
              <Settings size={16}/>
            </button>
          )}
        </div>
        <button
          className={`sp-fab-main ${navOpen ? "fab-open" : ""} ${callState === "incoming" ? "fab-ringing" : ""}`}
          style={{ opacity: fabOpacity }}
          onClick={() => setNavOpen((n) => !n)}
          data-drag-handle
          title="SIP Softphone"
        >
          {navOpen ? <X size={20}/> : <Phone size={20}/>}
          <span className={`sp-fab-dot ${statusColor}`}/>
        </button>
      </div>
    </div>
  );
}

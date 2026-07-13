import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSIP } from "./hooks/useSIP.js";
import { useDraggable } from "./hooks/useDraggable.js";
import { useResizable } from "./hooks/useResizable.js";
import { ksipcall } from "./ksipcall.js";
import "./Softphone.css";

// Utils
import {
  AUDIO_CODECS,
  VIDEO_CODECS,
  SIP_WS_PROTOCOL,
  SIP_WS_PORT,
  loadConfig,
  saveConfig,
  normalizeWsProtocol,
  normalizeWsPort,
  buildWs,
  withForcedWssTransport,
  getMediaSecurityError,
  computePanelPos,
} from "./utils/softphone.utils";

// Components
import StatusToast from "./components/softphone/StatusToast";
import SettingsPanel from "./components/softphone/SettingsPanel";
import DialerPanel from "./components/softphone/DialerPanel";
import IncomingCallPanel from "./components/softphone/IncomingCallPanel";
import VideoPanel from "./components/softphone/VideoPanel";
import CallerInfoModal from "./components/softphone/CallerInfoModal";
import DirectoryModal from "./components/softphone/DirectoryModal";
import FloatingFab from "./components/softphone/FloatingFab";
import FullscreenView from "./components/softphone/FullscreenView";

// ─────────────────────────────────────────────────────────────────────────────

export default function Softphone({
  enableFloatingStatus = true,
  enabledBubble = true,
  showDialer: showDialerProp = true,
  showSetting: showSettingProp = true,
  showOpacity: showOpacityProp = true,
  answerwithVideoCall = false,
  ShowIncomingCallVideoBtn = true,
  ShowIncomingCallAudio = true,
  fullscreen = false,
  autoRecord = false,
  recordingDir = "video/recordings/Ksip",
  panelPosition: panelPositionProp = "center",
  panelOffset: panelOffsetProp = {},
  // SIP config props
  server: serverProp = "",
  wsProtocol: wsProtocolProp = SIP_WS_PROTOCOL,
  wsPort: wsPortProp = SIP_WS_PORT,
  extension: extensionProp = "",
  password: passwordProp = "",
  displayName: displayNameProp = "",
  // API config props
  configApiUrl = "/api/softphone-config",
  configApiToken = "",
  // Settings configuration props
  settingConfigToggles = {
    bubble: true,
    dialer: true,
    settings: true,
    opacity: true,
    autoAnswerVideo: true,
    answerButtonVideo: true,
    answerButtonAudio: true,
    fullscreen: true,
    autoRecording: true,
  },
  settingConfigTogglesActiveState = {
    bubble: true,
    dialer: true,
    settings: true,
    opacity: true,
    autoAnswerVideo: false,
    answerButtonVideo: true,
    answerButtonAudio: true,
    fullscreen: false,
    autoRecording: false,
  },
  settingConfigCodecs = {
    audio: { visible: true, codecs: ["PCMU", "PCMA", "G722", "G729", "opus"] },
    video: { visible: true, codecs: ["VP8", "VP9", "H264", "H265", "AV1"] },
  },
  // Caller registration modal prop
  ShowUnknwonRegisterModalForm = true,
}) {
  const saved = loadConfig();

  // ── Panel position ──────────────────────────────────────────────────────────
  const [panelPosition, setPanelPosition] = useState(
    saved?.panelPosition ?? panelPositionProp,
  );
  const [panelOffset, setPanelOffset] = useState({
    top: saved?.panelOffset?.top ?? panelOffsetProp.top ?? 12,
    right: saved?.panelOffset?.right ?? panelOffsetProp.right ?? 12,
    bottom: saved?.panelOffset?.bottom ?? panelOffsetProp.bottom ?? 12,
    left: saved?.panelOffset?.left ?? panelOffsetProp.left ?? 12,
  });

  // ── SIP form ────────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    server: saved?.server || serverProp || "",
    wsProtocol: normalizeWsProtocol(saved?.wsProtocol || wsProtocolProp),
    wsPort: normalizeWsPort(saved?.wsPort || wsPortProp),
    extension: saved?.extension || extensionProp || "",
    password: saved?.password || passwordProp || "",
    displayName: saved?.displayName || displayNameProp || "",
    audioCodecs: saved?.audioCodecs || ["PCMU", "PCMA"],
    videoCodecs: saved?.videoCodecs || ["VP8", "H264"],
    autoRecord: saved?.autoRecord ?? autoRecord,
    recordingDir: saved?.recordingDir || recordingDir || "video/recordings/Ksip",
    uploadApiUrl: saved?.uploadApiUrl || "",
  });

  // ── UI prefs ────────────────────────────────────────────────────────────────
  const [uiPrefs, setUiPrefs] = useState({
    enabledBubble:
      saved?.enabledBubble ?? settingConfigTogglesActiveState.bubble ?? enabledBubble,
    showDialer:
      saved?.showDialer ?? settingConfigTogglesActiveState.dialer ?? showDialerProp,
    showSetting: settingConfigTogglesActiveState.settings ?? showSettingProp,
    showOpacity:
      saved?.showOpacity ?? settingConfigTogglesActiveState.opacity ?? showOpacityProp,
    answerwithVideoCall:
      saved?.answerwithVideoCall ??
      settingConfigTogglesActiveState.autoAnswerVideo ??
      answerwithVideoCall,
    ShowIncomingCallVideoBtn:
      saved?.ShowIncomingCallVideoBtn ??
      settingConfigTogglesActiveState.answerButtonVideo ??
      ShowIncomingCallVideoBtn,
    ShowIncomingCallAudio:
      saved?.ShowIncomingCallAudio ??
      (settingConfigTogglesActiveState.autoAnswerVideo
        ? false
        : (settingConfigTogglesActiveState.answerButtonAudio ?? ShowIncomingCallAudio)),
    fullscreen:
      (typeof window !== "undefined" && window.location.search.includes("fullscreen=true"))
        ? true
        : (typeof window !== "undefined" && window.location.search.includes("fullscreen=false"))
          ? false
          : (saved?.fullscreen ?? settingConfigTogglesActiveState.fullscreen ?? fullscreen),
    autoRecord:
      saved?.autoRecord ?? settingConfigTogglesActiveState.autoRecording ?? autoRecord,
  });

  // ── Active SIP config (triggers connect) ───────────────────────────────────
  const [activeConfig, setActiveConfig] = useState(() => {
    const s = saved?.server || serverProp;
    const e = saved?.extension || extensionProp;
    const p = saved?.password || passwordProp;
    const proto = normalizeWsProtocol(saved?.wsProtocol || wsProtocolProp);
    const port = normalizeWsPort(saved?.wsPort || wsPortProp);
    if (s && e && p)
      return withForcedWssTransport({
        server: s,
        extension: e,
        password: p,
        wsProtocol: proto,
        wsPort: port,
        displayName: saved?.displayName || displayNameProp || "",
        audioCodecs: saved?.audioCodecs || ["PCMU", "PCMA"],
        videoCodecs: saved?.videoCodecs || ["VP8", "H264"],
      });
    return null;
  });

  // ── Call UI state ───────────────────────────────────────────────────────────
  const [dialInput, setDialInput] = useState("");
  const [withVideo, setWithVideo] = useState(true);
  const [muted, setMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [showDialer, setShowDialer] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [fabOpacity, setFabOpacity] = useState(1);
  const [showFsSettings, setShowFsSettings] = useState(false);
  const [showDirModal, setShowDirModal] = useState(false);
  const [dirHandle, setDirHandle] = useState(null);
  const [showStatusToast, setShowStatusToast] = useState(true);
  const [mediaError, setMediaError] = useState(() => getMediaSecurityError());
  const [remoteVideoLoaded, setRemoteVideoLoaded] = useState(false);
  const [callerData, setCallerData] = useState(null);
  const [fetchingCaller, setFetchingCaller] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [callHasVideo, setCallHasVideo] = useState(true);

  // ── ARI state ───────────────────────────────────────────────────────────────
  const [lastCallInfo, setLastCallInfo] = useState(null); // { number, name, wasVideo }
  const lastCallNumberRef = useRef(""); // tracks the remote number during the call

  const [ariGoIpDetected, setAriGoIpDetected] = useState(false);
  const [checkingAri, setCheckingAri] = useState(false);
  const [ariChannelActive, setAriChannelActive] = useState(false);
  const [ariConnected, setAriConnected] = useState(true);
  const [ariCallType, setAriCallType] = useState(null); // 'VIDEO', 'AUDIO', or null

  // ── Caller information modal state ──────────────────────────────────────────
  const [showCallerInfoModal, setShowCallerInfoModal] = useState(false);
  const [pendingCallerInfoModal, setPendingCallerInfoModal] = useState(false);
  const [callerInfoMobileNumber, setCallerInfoMobileNumber] = useState("");
  const [callerInfoForm, setCallerInfoForm] = useState({
    completeName: "",
    completeAddress: "",
    age: "",
    gender: "",
  });
  const [callerInfoErrors, setCallerInfoErrors] = useState({});
  const [submittingCallerInfo, setSubmittingCallerInfo] = useState(false);
  const callerInfoNodeRef = useRef(null);

  // ── Refs ────────────────────────────────────────────────────────────────────
  const videoNodeRef = useRef(null);
  const dialerNodeRef = useRef(null);
  const incomingNodeRef = useRef(null);

  // ── SIP hook ────────────────────────────────────────────────────────────────
  const sipConfig = activeConfig
    ? {
      ...activeConfig,
      audioCodecs: activeConfig.audioCodecs || form.audioCodecs,
      videoCodecs: activeConfig.videoCodecs || form.videoCodecs,
    }
    : {
      server: "",
      wsServer: "",
      extension: "",
      password: "",
      audioCodecs: form.audioCodecs,
      videoCodecs: form.videoCodecs,
    };

  const {
    registered,
    callState,
    incomingSession,
    error,
    reconnecting,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    call,
    answer,
    hangup,
    mute,
    toggleVideo,
    hold,
    held,
    setRecordingConfig,
    setDirectoryHandle,
  } = useSIP(sipConfig);

  const { ref: dragRef, pos: dragPos } = useDraggable({ x: window.innerWidth - 90, y: 24 });
  const videoSize = useResizable({ w: 360, h: 700 }, { w: 260, h: 700 });

  const wsPreview =
    buildWs(SIP_WS_PROTOCOL, form.server, SIP_WS_PORT) ||
    `${SIP_WS_PROTOCOL}://...:${SIP_WS_PORT}/ws`;

  // ── Derived values ──────────────────────────────────────────────────────────
  const availableAudioCodecs = settingConfigCodecs.audio.visible
    ? AUDIO_CODECS.filter((c) => settingConfigCodecs.audio.codecs.includes(c))
    : [];
  const availableVideoCodecs = settingConfigCodecs.video.visible
    ? VIDEO_CODECS.filter((c) => settingConfigCodecs.video.codecs.includes(c))
    : [];

  const statusColor = registered
    ? "status-green"
    : reconnecting
      ? "status-yellow"
      : "status-red";

  const fabInBottomHalf = dragPos.y > window.innerHeight / 2;
  const fabInRightHalf = dragPos.x > window.innerWidth / 2;
  const navClass = `sp-fab-wrap ${fabInBottomHalf ? "nav-up" : "nav-down"} ${fabInRightHalf ? "nav-left" : "nav-right"}`;

  const isGoIpCall = useMemo(() => {
    const callerName = callerData?.name || "";
    const displayName = incomingSession?.remoteIdentity?.displayName || "";
    const remoteUser = incomingSession?.remoteIdentity?.uri?.user || "";
    const currentDial = dialInput || "";
    return (
      ariGoIpDetected ||
      callerName.toLowerCase().includes("goips") ||
      displayName.toLowerCase().includes("goips") ||
      remoteUser.toLowerCase().includes("goips") ||
      currentDial.toLowerCase().includes("goips")
    );
  }, [ariGoIpDetected, callerData, incomingSession, dialInput]);

  // SDP-based fallback: check if incomingSession has video in SDP
  const sdpHasVideo = incomingSession?._sdpHasVideo ?? true; // default true if unknown

  const isAudioOnlyCall =
    ariCallType === "AUDIO" ||
    (ariCallType !== "VIDEO" && (!callHasVideo || isGoIpCall)) ||
    (ariCallType === null && !sdpHasVideo);

  const incomingDefaultPos = useMemo(() => {
    const center = computePanelPos("center", 320, 320, panelOffset);
    if (showCallerInfoModal) {
      return { x: Math.max(0, center.x - 278), y: center.y };
    }
    return center;
  }, [showCallerInfoModal, panelOffset]);

  const videoDefaultPos = useMemo(() => {
    const w = isAudioOnlyCall ? 320 : 360;
    const center = computePanelPos("center", w, 460, panelOffset);
    if (showCallerInfoModal) {
      return { x: Math.max(0, center.x - 278), y: center.y };
    }
    return computePanelPos(panelPosition, w, 460, panelOffset);
  }, [showCallerInfoModal, panelPosition, panelOffset, isAudioOnlyCall]);

  const callerInfoDefaultPos = useMemo(() => {
    const center = computePanelPos("center", 540, 480, panelOffset);
    if (
      (callState === "incoming" || callState === "active" || callState === "ringing") &&
      showCallerInfoModal
    ) {
      const otherWidth = callState === "incoming" ? 320 : isAudioOnlyCall ? 320 : 360;
      const shiftRight = (otherWidth + 16) / 2;
      return {
        x: Math.min(window.innerWidth - 550, center.x + shiftRight),
        y: center.y - 40,
      };
    }
    return center;
  }, [callState, showCallerInfoModal, panelOffset, isAudioOnlyCall]);

  // ── Safe call / answer ──────────────────────────────────────────────────────
  const safeCall = useCallback(
    (target, video = true) => {
      const message = getMediaSecurityError();
      if (message) {
        setMediaError(message);
        console.error(message);
        return false;
      }
      setMediaError("");
      setCallHasVideo(video);
      return call(target, video);
    },
    [call],
  );

  const safeAnswer = useCallback(
    (video = false) => {
      const message = getMediaSecurityError();
      if (message) {
        setMediaError(message);
        console.error(message);
        return false;
      }
      setMediaError("");
      setCallHasVideo(video);
      if (pendingCallerInfoModal) {
        setShowCallerInfoModal(true);
      }
      return answer(video);
    },
    [answer, pendingCallerInfoModal],
  );

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleMute = () => {
    mute(!muted);
    setMuted((m) => !m);
  };

  const handleVideoMute = () => {
    const next = !videoMuted;
    setVideoMuted(next);
    toggleVideo(next);
  };

  const handleUiPref = (key, val) => {
    if (key === "fullscreen") {
      const isAlreadyFullscreenTab = typeof window !== "undefined" && window.location.search.includes("fullscreen=true");
      if (val === true && !isAlreadyFullscreenTab) {
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          url.searchParams.set("fullscreen", "true");
          window.open(url.toString(), "_blank");
        }
        return;
      }
      if (val === false && isAlreadyFullscreenTab && typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("fullscreen");
        window.history.replaceState({}, "", url.pathname + url.search + url.hash);
      }
    }

    setUiPrefs((p) => {
      const next = { ...p, [key]: val };
      if (key === "answerwithVideoCall" && val) next.ShowIncomingCallAudio = false;
      if (key === "ShowIncomingCallAudio" && val) next.answerwithVideoCall = false;
      if (key !== "showSetting") {
        const s = loadConfig() || {};
        saveConfig({ ...s, [key]: val });
      }
      return next;
    });
  };

  const toggleCodec = (type, codec) => {
    setForm((f) => {
      const key = type === "audio" ? "audioCodecs" : "videoCodecs";
      const list = f[key];
      return {
        ...f,
        [key]: list.includes(codec)
          ? list.filter((c) => c !== codec)
          : [...list, codec],
      };
    });
  };

  const handleConnect = (e) => {
    e.preventDefault();
    console.log("[Softphone] handleConnect - currentUserId:", currentUserId);

    const config = withForcedWssTransport({
      server: form.server,
      extension: form.extension,
      password: form.password,
      displayName: form.displayName,
      audioCodecs: form.audioCodecs,
      videoCodecs: form.videoCodecs,
      recordingDir: form.recordingDir,
      uploadApiUrl: form.uploadApiUrl,
      panelPosition,
      panelOffset,
      ...Object.fromEntries(
        Object.entries(uiPrefs).filter(([k]) => k !== "showSetting"),
      ),
    });
    saveConfig(config);
    setActiveConfig(config);
    setShowSettings(false);

    if (configApiUrl && currentUserId) {
      const headers = { "Content-Type": "application/json" };
      if (configApiToken) headers["Authorization"] = `Bearer ${configApiToken}`;
      fetch(configApiUrl, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          user_id: currentUserId,
          server: form.server,
          extension: form.extension,
          password: form.password,
          display_name: form.displayName,
          audio_codecs: form.audioCodecs,
          video_codecs: form.videoCodecs,
          auto_record: uiPrefs.autoRecord,
          recording_dir: form.recordingDir,
          upload_api_url: form.uploadApiUrl,
          enabled_bubble: uiPrefs.enabledBubble,
          show_dialer: uiPrefs.showDialer,
          show_opacity: uiPrefs.showOpacity,
          answer_with_video_call: uiPrefs.answerwithVideoCall,
          show_incoming_call_video_btn: uiPrefs.ShowIncomingCallVideoBtn,
          show_incoming_call_audio: uiPrefs.ShowIncomingCallAudio,
          fullscreen: uiPrefs.fullscreen,
          position_top: panelOffset.top,
          position_right: panelOffset.right,
          position_bottom: panelOffset.bottom,
          position_left: panelOffset.left,
        }),
      })
        .then((res) => res.json())
        .then((data) => console.log("[Softphone] Config saved:", data))
        .catch((err) => console.error("[Softphone] Failed to save config:", err));
    } else {
      console.warn("[Softphone] Cannot save config - configApiUrl:", configApiUrl, "currentUserId:", currentUserId);
    }
  };

  const handleCallerInfoSubmit = (e) => {
    e.preventDefault();
    const errors = {};
    if (!callerInfoForm.completeName.trim()) errors.completeName = "Complete Name is required";
    if (!callerInfoForm.completeAddress.trim()) errors.completeAddress = "Complete Address is required";
    if (Object.keys(errors).length > 0) {
      setCallerInfoErrors(errors);
      return;
    }
    setCallerInfoErrors({});
    setSubmittingCallerInfo(true);

    const payload = {
      completeName: callerInfoForm.completeName.trim(),
      completeAddress: callerInfoForm.completeAddress.trim(),
      mobileNumber: callerInfoMobileNumber,
      age: callerInfoForm.age ? Number(callerInfoForm.age) : null,
      gender: callerInfoForm.gender || null,
    };
    const headers = { "Content-Type": "application/json" };
    if (configApiToken) headers["Authorization"] = `Bearer ${configApiToken}`;

    fetch("/ksip/caller/register", {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json();
      })
      .then(() => {
        setSubmittingCallerInfo(false);
        setShowCallerInfoModal(false);
        setCallerInfoForm({ completeName: "", completeAddress: "", age: "", gender: "" });
      })
      .catch((err) => {
        console.error("Failed to submit caller registration:", err);
        setSubmittingCallerInfo(false);
        setCallerInfoErrors({ submit: "Failed to submit caller info. Please try again." });
      });
  };

  const handleCreateDirectory = async () => {
    try {
      const handle = await window.showDirectoryPicker({ mode: "readwrite", startIn: "downloads" });
      let currentHandle = handle;
      for (const folderName of ["video", "recordings", "Ksip"]) {
        currentHandle = await currentHandle.getDirectoryHandle(folderName, { create: true });
      }
      setDirHandle(currentHandle);
      setDirectoryHandle(currentHandle);
      setShowDirModal(false);
      const s = loadConfig() || {};
      saveConfig({ ...s, hasDirectoryAccess: true });
    } catch (err) {
      if (err.name !== "AbortError") console.error("Directory selection failed:", err);
    }
  };

  const handleCancelDirectory = () => {
    setShowDirModal(false);
    setUiPrefs((p) => ({ ...p, autoRecord: false }));
    const s = loadConfig() || {};
    saveConfig({ ...s, autoRecord: false });
  };

  // ── Effects ─────────────────────────────────────────────────────────────────

  // Auto-open fullscreen in new tab if enabled in localStorage and not already in fullscreen tab
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isFullscreenTab = window.location.search.includes("fullscreen=true");
      const savedConf = loadConfig();
      if (savedConf?.fullscreen && !isFullscreenTab) {
        const url = new URL(window.location.href);
        url.searchParams.set("fullscreen", "true");
        window.open(url.toString(), "_blank");
      }
    }
  }, []);

  // Fetch current user ID
  useEffect(() => {
    const headers = { "Content-Type": "application/json" };
    if (configApiToken) headers["Authorization"] = `Bearer ${configApiToken}`;
    fetch("/me", { headers, credentials: "include" })
      .then((r) => r.json())
      .then((user) => { if (user?.id) setCurrentUserId(user.id); })
      .catch((err) => console.error("[Softphone] Failed to fetch user:", err));
  }, [configApiToken]);

  // Fetch config from API
  useEffect(() => {
    if (!configApiUrl || !currentUserId) return;
    const headers = { "Content-Type": "application/json" };
    if (configApiToken) headers["Authorization"] = `Bearer ${configApiToken}`;
    fetch(`${configApiUrl}?user_id=${currentUserId}`, { headers, credentials: "include" })
      .then((r) => r.json())
      .then(({ data }) => {
        if (!data) return;
        setForm((f) => ({
          ...f,
          server: data.server ?? f.server,
          extension: data.extension ?? f.extension,
          password: data.password ?? f.password,
          displayName: data.display_name ?? f.displayName,
          audioCodecs: data.audio_codecs ?? f.audioCodecs,
          videoCodecs: data.video_codecs ?? f.videoCodecs,
          autoRecord: data.auto_record ?? f.autoRecord,
          recordingDir: data.recording_dir ?? f.recordingDir,
          uploadApiUrl: data.upload_api_url ?? f.uploadApiUrl,
        }));
        setUiPrefs((p) => ({
          ...p,
          enabledBubble: data.enabled_bubble ?? p.enabledBubble,
          showDialer: data.show_dialer ?? p.showDialer,
          showOpacity: data.show_opacity ?? p.showOpacity,
          answerwithVideoCall: data.answer_with_video_call ?? p.answerwithVideoCall,
          ShowIncomingCallVideoBtn: data.show_incoming_call_video_btn ?? p.ShowIncomingCallVideoBtn,
          ShowIncomingCallAudio: data.show_incoming_call_audio ?? p.ShowIncomingCallAudio,
          fullscreen: data.fullscreen ?? p.fullscreen,
          autoRecord: data.auto_record ?? p.autoRecord,
        }));
        setPanelOffset((o) => ({
          top: data.position_top ?? o.top,
          right: data.position_right ?? o.right,
          bottom: data.position_bottom ?? o.bottom,
          left: data.position_left ?? o.left,
        }));
        if (data.server && data.extension && data.password) {
          setActiveConfig(
            withForcedWssTransport({
              server: data.server,
              extension: data.extension,
              password: data.password,
              displayName: data.display_name ?? "",
              audioCodecs: data.audio_codecs ?? form.audioCodecs,
              videoCodecs: data.video_codecs ?? form.videoCodecs,
            }),
          );
        }
      })
      .catch((err) => console.error("[Softphone] Failed to fetch config:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configApiUrl, configApiToken, currentUserId]);

  // Media security check
  useEffect(() => { setMediaError(getMediaSecurityError()); }, []);

  // Reset on idle
  // Track the remote number while in a call (before it gets cleared)
  useEffect(() => {
    if (callState === "incoming" || callState === "ringing" || callState === "active") {
      const num = dialInput || incomingSession?.remoteIdentity?.uri?.user || "";
      if (num) lastCallNumberRef.current = num;
    }
  }, [callState, dialInput, incomingSession]);

  useEffect(() => {
    if (callState === "idle") {
      // Capture last call info for callback using the ref (not stale state)
      const number = lastCallNumberRef.current;
      if (number) {
        setLastCallInfo({
          number,
          name: callerData?.name || "",
          wasVideo: callHasVideo && !isAudioOnlyCall,
        });
      }
      lastCallNumberRef.current = "";
      setCallHasVideo(true);
      setAriCallType(null);
      setDialInput("");
    }
  }, [callState]);

  // Sync recording config
  useEffect(() => {
    setRecordingConfig({
      enabled: uiPrefs.autoRecord,
      directory: form.recordingDir,
      uploadApiUrl: form.uploadApiUrl,
    });
  }, [uiPrefs.autoRecord, form.recordingDir, form.uploadApiUrl]);

  // Check dir access when auto-record enabled
  useEffect(() => {
    const s = loadConfig();
    if (uiPrefs.autoRecord && !dirHandle && !s?.hasDirectoryAccess) {
      setShowDirModal(true);
    }
  }, [uiPrefs.autoRecord, dirHandle]);

  // Save recording dir changes
  useEffect(() => {
    const s = loadConfig();
    if (s && form.recordingDir !== s.recordingDir) {
      saveConfig({ ...s, recordingDir: form.recordingDir });
    }
  }, [form.recordingDir]);

  // Ctrl+Shift+K shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "K" || e.key === "k")) {
        e.preventDefault();
        console.log("🔑 Keyboard shortcut triggered: Ctrl + Shift + K");
        setShowSettings((s) => !s);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch caller data
  useEffect(() => {
    let ext = "";
    if (callState === "incoming" && incomingSession) {
      ext = incomingSession?.remoteIdentity?.uri?.user;
    } else if ((callState === "ringing" || callState === "active") && dialInput) {
      ext = dialInput;
    }
    if (ext && /^\d+$/.test(String(ext)) && String(ext).length > 10) {
      ext = String(ext).slice(-10);
    }
    if (ext && !fetchingCaller && (!callerData || callerData._fetchedExt !== ext)) {
      setFetchingCaller(true);
      fetch(`/user/extension/${ext}`)
        .then((res) => res.json())
        .then((data) => {
          setCallerData({ ...data, _fetchedExt: ext });
          setFetchingCaller(false);
          if (ShowUnknwonRegisterModalForm && callState === "incoming" && incomingSession) {
            const hasName = data && typeof data.name === "string" && data.name.trim().length > 0;
            const hasAddress = data && typeof data.address === "string" && data.address.trim().length > 0;
            if (!hasName || !hasAddress) {
              setCallerInfoMobileNumber(ext);
              setPendingCallerInfoModal(true);
            } else {
              setPendingCallerInfoModal(false);
            }
          }
        })
        .catch((err) => {
          console.error("Failed to fetch caller data:", err);
          setFetchingCaller(false);
          if (ShowUnknwonRegisterModalForm && callState === "incoming" && incomingSession) {
            setCallerInfoMobileNumber(ext);
            setPendingCallerInfoModal(true);
          }
        });
    } else if (callState === "idle") {
      if (callerData !== null) setCallerData(null);
      if (fetchingCaller) setFetchingCaller(false);
      setPendingCallerInfoModal(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callState, incomingSession, dialInput]);

  // Status toast + ksipcall broadcast
  useEffect(() => {
    ksipcall.updateStatus({
      registered,
      reconnecting,
      extension: activeConfig?.extension,
      error,
      ariConnected,
      callState,
      callerData,
    });
    if (registered) {
      setShowStatusToast(true);
      const timer = setTimeout(() => setShowStatusToast(false), 5000);
      return () => clearTimeout(timer);
    } else {
      setShowStatusToast(true);
    }
  }, [registered, reconnecting, activeConfig?.extension, error, ariConnected, callState, callerData]);

  // ksipcall external call listener
  useEffect(() => {
    const unsub = ksipcall._subscribe(({ target, video }) => {
      if (!registered) return;
      setDialInput(target);
      safeCall(target, video);
    });
    return unsub;
  }, [registered, safeCall]);

  // Reset remote video state
  useEffect(() => {
    if (callState === "idle" || callState === "ringing") {
      setRemoteVideoLoaded(false);
    }
  }, [callState]);

  // ARI channel polling
  useEffect(() => {
    if (callState === "idle" || !sipConfig.extension) {
      setAriGoIpDetected(false);
      setCheckingAri(false);
      setAriChannelActive(false);
      setAriCallType(null);
      return;
    }

    let isMounted = true;
    let pollInterval = null;
    setAriChannelActive(true);
    setCheckingAri(true);
    setAriGoIpDetected(false);

    const myHeaders = new Headers();
    myHeaders.append("Authorization", "Basic a3NpcF9hZG1pbjo0NGFmMDlmNTVmMGI4NWUyZWI1ZGI1N2VkNDhlODk5MA==");
    const requestOptions = { method: "GET", headers: myHeaders, redirect: "follow" };

    const checkAriChannels = () => {
      fetch("https://pbx.carmona.gov.ph/ari/channels", requestOptions)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP error ${res.status}`);
          return res.json();
        })
        .then((channels) => {
          if (!isMounted) return;
          if (!Array.isArray(channels)) {
            setCheckingAri(false);
            setAriChannelActive(false);
            return;
          }
          const myChannels = channels.filter(
            (ch) => ch.name && ch.name.includes(sipConfig.extension),
          );
          if (myChannels.length === 0) {
            setAriGoIpDetected(false);
            setCheckingAri(false);
            setAriChannelActive(false);
            setAriCallType(null);
            return;
          }
          setAriChannelActive(true);
          const goIpChannels = channels.filter(
            (ch) => ch.name && ch.name.toLowerCase().includes("goips"),
          );
          let linkedToGoIp = false;
          if (goIpChannels.length > 0) {
            for (const myCh of myChannels) {
              const myBaseId = myCh.id ? myCh.id.split(".")[0] : "";
              const myConnectedNum = myCh.connected?.number || "";
              const myConnectedName = myCh.connected?.name || "";
              const myCallerNum = myCh.caller?.number || "";
              for (const goIpCh of goIpChannels) {
                const goIpBaseId = goIpCh.id ? goIpCh.id.split(".")[0] : "";
                const goIpCallerNum = goIpCh.caller?.number || "";
                const goIpConnectedNum = goIpCh.connected?.number || "";
                const sameBaseId = myBaseId && goIpBaseId && myBaseId === goIpBaseId;
                const numMatch =
                  (myConnectedNum && goIpCallerNum && myConnectedNum === goIpCallerNum) ||
                  (myConnectedName && goIpCallerNum && myConnectedName === goIpCallerNum) ||
                  (myCallerNum && goIpConnectedNum && myCallerNum === goIpConnectedNum);
                if (sameBaseId || numMatch) {
                  linkedToGoIp = true;
                  break;
                }
              }
              if (linkedToGoIp) break;
            }
          }
          setAriGoIpDetected(linkedToGoIp);

          // Find caller channel for CALL_TYPE variable
          let callerChannel = null;
          for (const myCh of myChannels) {
            const myBaseId = myCh.id ? myCh.id.split(".")[0] : "";
            const myCallerNum = myCh.caller?.number || "";
            const candidate = channels.find((ch) => {
              if (ch.id === myCh.id) return false;
              const chBaseId = ch.id ? ch.id.split(".")[0] : "";
              const sameBase = myBaseId && chBaseId && myBaseId === chBaseId;
              const isPjsip = ch.name && ch.name.startsWith("PJSIP/");
              const isOperator = ch.name && ch.name.includes(sipConfig.extension);
              if (isPjsip && !isOperator && (sameBase || (myCallerNum && ch.name.includes(myCallerNum)))) return true;
              return false;
            });
            if (candidate) { callerChannel = candidate; break; }
          }
          if (!callerChannel) {
            for (const myCh of myChannels) {
              const myCallerNum = myCh.caller?.number || "";
              const candidate = channels.find((ch) => {
                if (ch.id === myCh.id) return false;
                const isOperator = ch.name && ch.name.includes(sipConfig.extension);
                if (isOperator) return false;
                const myBaseId = myCh.id ? myCh.id.split(".")[0] : "";
                const chBaseId = ch.id ? ch.id.split(".")[0] : "";
                const sameBase = myBaseId && chBaseId && myBaseId === chBaseId;
                return sameBase || (myCallerNum && ch.name.includes(myCallerNum)) || (ch.caller?.number === myCallerNum);
              });
              if (candidate) { callerChannel = candidate; break; }
            }
          }

          if (callerChannel) {
            fetch(`https://pbx.carmona.gov.ph/ari/channels/${callerChannel.id}/variable?variable=CALL_TYPE`, requestOptions)
              .then((vRes) => {
                if (!vRes.ok) throw new Error("Failed to fetch variable");
                return vRes.json();
              })
              .then((vData) => {
                if (!isMounted) return;
                const val = vData.value ? vData.value.toUpperCase() : null;
                console.log(`[ARI] Fetched CALL_TYPE for channel ${callerChannel.id}: ${val}`);
                setAriCallType(val);
                setCheckingAri(false);
              })
              .catch((err) => {
                console.warn("[ARI] Variable fetch failed:", err);
                if (!isMounted) return;
                setCheckingAri(false);
              });
          } else {
            setCheckingAri(false);
          }
        })
        .catch((err) => {
          console.warn("ARI fetch failed:", err);
          if (!isMounted) return;
          setAriChannelActive(true);
          setCheckingAri(false);
          setAriGoIpDetected(false);
          setAriCallType(null);
        });
    };

    checkAriChannels();
    pollInterval = setInterval(checkAriChannels, 2000);
    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [callState, sipConfig.extension, incomingSession]);

  // ARI health check
  useEffect(() => {
    if (!registered) { setAriConnected(true); return; }
    let isMounted = true;
    let pollInterval = null;
    const myHeaders = new Headers();
    myHeaders.append("Authorization", "Basic a3NpcF9hZG1pbjo0NGFmMDlmNTVmMGI4NWUyZWI1ZGI1N2VkNDhlODk5MA==");
    const requestOptions = { method: "GET", headers: myHeaders, redirect: "follow" };
    const checkAriHealth = () => {
      fetch("https://pbx.carmona.gov.ph/ari/channels", requestOptions)
        .then((res) => {
          if (!isMounted) return;
          setAriConnected(res.ok ? true : false);
        })
        .catch(() => {
          if (!isMounted) return;
          setAriConnected(true);
        });
    };
    checkAriHealth();
    pollInterval = setInterval(checkAriHealth, 10000);
    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [registered]);

  // ── Shared settings props ─────────────────────────────────────────────────
  const sharedSettingsProps = {
    form,
    setForm,
    uiPrefs,
    onToggle: handleUiPref,
    onConnect: handleConnect,
    onDisconnect: () => setActiveConfig(null),
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
  };

  // ── Fullscreen mode ───────────────────────────────────────────────────────
  if (uiPrefs.fullscreen) {
    return (
      <FullscreenView
        // SIP / call state
        registered={registered}
        reconnecting={reconnecting}
        error={error}
        mediaError={mediaError}
        callState={callState}
        activeConfig={activeConfig}
        callerData={callerData}
        dialInput={dialInput}
        setDialInput={setDialInput}
        withVideo={withVideo}
        setWithVideo={setWithVideo}
        muted={muted}
        videoMuted={videoMuted}
        handleMute={handleMute}
        handleVideoMute={handleVideoMute}
        hangup={hangup}
        safeCall={safeCall}
        safeAnswer={safeAnswer}
        held={held}
        onHold={() => hold(!held)}
        lastCallInfo={lastCallInfo}
        onCallback={(number, video) => {
          setLastCallInfo(null);
          setDialInput(number);
          safeCall(number, video);
        }}
        onDismissCallback={() => setLastCallInfo(null)}
        incomingSession={incomingSession}
        remoteVideoRef={remoteVideoRef}
        localVideoRef={localVideoRef}
        remoteAudioRef={remoteAudioRef}
        isAudioOnlyCall={isAudioOnlyCall}
        ariCallType={ariCallType}
        ariChannelActive={ariChannelActive}
        sdpHasVideo={sdpHasVideo}
        checkingAri={checkingAri}
        isGoIpCall={isGoIpCall}
        remoteVideoLoaded={remoteVideoLoaded}
        setRemoteVideoLoaded={setRemoteVideoLoaded}
        statusColor={statusColor}
        // Settings
        showFsSettings={showFsSettings}
        setShowFsSettings={setShowFsSettings}
        setActiveConfig={setActiveConfig}
        handleConnect={handleConnect}
        fabOpacity={fabOpacity}
        setFabOpacity={setFabOpacity}
        {...sharedSettingsProps}
        // Caller info modal
        showCallerInfoModal={showCallerInfoModal}
        setShowCallerInfoModal={setShowCallerInfoModal}
        callerInfoForm={callerInfoForm}
        setCallerInfoForm={setCallerInfoForm}
        callerInfoMobileNumber={callerInfoMobileNumber}
        callerInfoErrors={callerInfoErrors}
        submittingCallerInfo={submittingCallerInfo}
        handleCallerInfoSubmit={handleCallerInfoSubmit}
        callerInfoDefaultPos={callerInfoDefaultPos}
        callerInfoNodeRef={callerInfoNodeRef}
      />
    );
  }

  // ── Bubble / floating mode ─────────────────────────────────────────────────
  return (
    <div className="sp-body">
      {mediaError && <div className="sp-media-warning">&#9888; {mediaError}</div>}

      {/* Global status toast (outside workspace) */}
      {enableFloatingStatus && (
        <StatusToast
          show={showStatusToast}
          registered={registered}
          reconnecting={reconnecting}
          activeConfig={activeConfig}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {/* Global settings panel (Ctrl+Shift+K, outside fullscreen check) */}
      <SettingsPanel
        show={showSettings}
        onClose={() => setShowSettings(false)}
        {...sharedSettingsProps}
      />

      <div className="sp-workspace">
        <audio ref={remoteAudioRef} autoPlay />

        {/* Status toast inside workspace */}
        {enableFloatingStatus && (
          <StatusToast
            show={showStatusToast}
            registered={registered}
            reconnecting={reconnecting}
            activeConfig={activeConfig}
            onOpenSettings={() => setShowSettings(true)}
          />
        )}

        {/* Directory Permission Modal */}
        {showDirModal && (
          <DirectoryModal
            onSelect={handleCreateDirectory}
            onCancel={handleCancelDirectory}
          />
        )}

        {/* Draggable Incoming Call Panel */}
        {callState === "incoming" && callerData && ariChannelActive && (
          <IncomingCallPanel
            nodeRef={incomingNodeRef}
            defaultPosition={incomingDefaultPos}
            callerData={callerData}
            incomingSession={incomingSession}
            ariCallType={ariCallType}
            checkingAri={checkingAri}
            isGoIpCall={isGoIpCall}
            sdpHasVideo={sdpHasVideo}
            onAnswer={safeAnswer}
            onHangup={hangup}
          />
        )}

        {/* Draggable + Resizable Video Panel */}
        {(callState === "active" || callState === "ringing" || (callState === "idle" && lastCallInfo)) && (
          <VideoPanel
            nodeRef={videoNodeRef}
            defaultPosition={videoDefaultPos}
            callState={callState}
            isAudioOnlyCall={isAudioOnlyCall}
            expanded={expanded}
            setExpanded={setExpanded}
            callerData={callerData}
            dialInput={dialInput}
            remoteVideoRef={remoteVideoRef}
            localVideoRef={localVideoRef}
            muted={muted}
            videoMuted={videoMuted}
            onMute={handleMute}
            onVideoMute={handleVideoMute}
            onHangup={hangup}
            held={held}
            onHold={() => hold(!held)}
            lastCallInfo={lastCallInfo}
            onCallback={(number, video) => {
              setLastCallInfo(null);
              setDialInput(number);
              safeCall(number, video);
            }}
            onDismissCallback={() => setLastCallInfo(null)}
            remoteVideoLoaded={remoteVideoLoaded}
            setRemoteVideoLoaded={setRemoteVideoLoaded}
            videoSize={videoSize}
          />
        )}

        {/* Draggable Dialer Panel */}
        {showDialer && (
          <DialerPanel
            nodeRef={dialerNodeRef}
            defaultPosition={computePanelPos(panelPosition, 300, 460, panelOffset)}
            dialInput={dialInput}
            setDialInput={setDialInput}
            withVideo={withVideo}
            setWithVideo={setWithVideo}
            registered={registered}
            callState={callState}
            mediaError={mediaError}
            onCall={safeCall}
            onClose={() => setShowDialer(false)}
          />
        )}

        {/* Settings Panel inside workspace */}
        <SettingsPanel
          show={showSettings}
          onClose={() => setShowSettings(false)}
          {...sharedSettingsProps}
        />

        {/* Floating FAB */}
        {uiPrefs.enabledBubble && (
          <FloatingFab
            dragRef={dragRef}
            dragPos={dragPos}
            navClass={navClass}
            navOpen={navOpen}
            setNavOpen={setNavOpen}
            uiPrefs={uiPrefs}
            fabOpacity={fabOpacity}
            setFabOpacity={setFabOpacity}
            showDialer={showDialer}
            setShowDialer={setShowDialer}
            showSettings={showSettings}
            setShowSettings={setShowSettings}
            callState={callState}
            statusColor={statusColor}
          />
        )}

        {/* Caller Information Modal */}
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
    </div>
  );
}

// Named exports so consumers can use:
//   import { Softphone, KsipStatus } from "./Softphone"
export { Softphone };
export { KsipStatus } from "./KsipStatus";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Draggable from "react-draggable";
import {
  Phone,
  PhoneOff,
  PhoneIncoming,
  PhoneMissed,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Delete,
  GripHorizontal,
  Wifi,
  WifiOff,
  Loader,
  User,
  Lock,
  Server,
  Hash,
  Monitor,
  Maximize2,
  Minimize2,
  Settings,
  Grid3x3,
  SlidersHorizontal,
  X,
  LogOut,
  FolderPlus,
  MonitorCogIcon,
  Calculator,
} from "lucide-react";
import { useSIP } from "./hooks/useSIP.js";
import { useDraggable } from "./hooks/useDraggable.js";
import { useResizable } from "./hooks/useResizable.js";
import { ksipcall } from "./ksipcall.js";
import "./Softphone.css";

const DIALPAD = [
  { key: "1", sub: "" },
  { key: "2", sub: "ABC" },
  { key: "3", sub: "DEF" },
  { key: "4", sub: "GHI" },
  { key: "5", sub: "JKL" },
  { key: "6", sub: "MNO" },
  { key: "7", sub: "PQRS" },
  { key: "8", sub: "TUV" },
  { key: "9", sub: "WXYZ" },
  { key: "*", sub: "" },
  { key: "0", sub: "+" },
  { key: "#", sub: "" },
];

const AUDIO_CODECS = ["PCMU", "PCMA", "G722", "G729", "opus"];
const VIDEO_CODECS = ["VP8", "VP9", "H264", "H265", "AV1"];

const STORAGE_KEY = "sip_softphone_config";
const SIP_WS_PROTOCOL = "wss";
const SIP_WS_PORT = "8089";
const SIP_WS_PATH = "/ws";

function loadConfig() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}
function saveConfig(c) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
}
function normalizeWsProtocol() {
  return SIP_WS_PROTOCOL;
}
function normalizeWsPort() {
  return SIP_WS_PORT;
}
function sanitizeServerHost(server) {
  const raw = String(server || "").trim();
  if (!raw) return "";

  try {
    const url = raw.includes("://") ? new URL(raw) : new URL(`https://${raw}`);
    return url.hostname;
  } catch {
    return raw
      .replace(/^wss?:\/\//i, "")
      .replace(/^https?:\/\//i, "")
      .replace(/\/.*$/, "")
      .replace(/:\d+$/, "");
  }
}
function buildWs(_protocol, server, _port) {
  const host = sanitizeServerHost(server);
  return host ? `${SIP_WS_PROTOCOL}://${host}:${SIP_WS_PORT}${SIP_WS_PATH}` : "";
}
function withForcedWssTransport(config = {}) {
  return {
    ...config,
    server: sanitizeServerHost(config.server),
    wsProtocol: SIP_WS_PROTOCOL,
    wsPort: SIP_WS_PORT,
    wsServer: buildWs(SIP_WS_PROTOCOL, config.server, SIP_WS_PORT),
  };
}
function getMediaSecurityError() {
  if (typeof window === "undefined") return "";

  const hasGetUserMedia = !!window.navigator?.mediaDevices?.getUserMedia;
  if (window.isSecureContext && hasGetUserMedia) return "";

  const origin = window.location?.origin || "this page";
  if (!window.isSecureContext) {
    return `Call failed: Media devices are not available because ${origin} is not a secure context. Open the app with HTTPS or localhost. SIP WebSocket must be wss://<pbx-host>:8089/ws.`;
  }

  return "Call failed: Media devices API is unavailable. Check browser support, microphone/camera permissions, and connected devices.";
}

const PANEL_POSITIONS = [
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

function computePanelPos(position = "center", w = 0, h = 0, offset = {}) {
  const t = offset.top ?? 12;
  const r = offset.right ?? 12;
  const b = offset.bottom ?? 12;
  const l = offset.left ?? 12;
  const W = window.innerWidth;
  const H = window.innerHeight;
  const cx = Math.round(W / 2 - w / 2);
  const cy = Math.round(H / 2 - h / 2);
  const positions = {
    "top-left": { x: l, y: t },
    "top-center": { x: cx, y: t },
    "top-right": { x: W - w - r, y: t },
    "center-left": { x: l, y: cy },
    center: { x: cx, y: cy },
    "center-right": { x: W - w - r, y: cy },
    "bottom-left": { x: l, y: H - h - b },
    "bottom-center": { x: cx, y: H - h - b },
    "bottom-right": { x: W - w - r, y: H - h - b },
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
        <span className="sp-pref-thumb" />
      </button>
    </div>
  );
}

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

  const [panelPosition, setPanelPosition] = useState(
    saved?.panelPosition ?? panelPositionProp,
  );
  const [panelOffset, setPanelOffset] = useState({
    top: saved?.panelOffset?.top ?? panelOffsetProp.top ?? 12,
    right: saved?.panelOffset?.right ?? panelOffsetProp.right ?? 12,
    bottom: saved?.panelOffset?.bottom ?? panelOffsetProp.bottom ?? 12,
    left: saved?.panelOffset?.left ?? panelOffsetProp.left ?? 12,
  });

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
    recordingDir:
      saved?.recordingDir || recordingDir || "video/recordings/Ksip",
    uploadApiUrl: saved?.uploadApiUrl || "",
  });

  const [uiPrefs, setUiPrefs] = useState({
    enabledBubble:
      saved?.enabledBubble ??
      settingConfigTogglesActiveState.bubble ??
      enabledBubble,
    showDialer:
      saved?.showDialer ??
      settingConfigTogglesActiveState.dialer ??
      showDialerProp,
    showSetting: settingConfigTogglesActiveState.settings ?? showSettingProp,
    showOpacity:
      saved?.showOpacity ??
      settingConfigTogglesActiveState.opacity ??
      showOpacityProp,
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
        : (settingConfigTogglesActiveState.answerButtonAudio ??
          ShowIncomingCallAudio)),
    fullscreen:
      saved?.fullscreen ??
      settingConfigTogglesActiveState.fullscreen ??
      fullscreen,
    autoRecord:
      saved?.autoRecord ??
      settingConfigTogglesActiveState.autoRecording ??
      autoRecord,
  });

  const [activeConfig, setActiveConfig] = useState(() => {
    // Auto-connect if saved config OR all required props are provided
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
  const [ariGoIpDetected, setAriGoIpDetected] = useState(false);
  const [checkingAri, setCheckingAri] = useState(false);
  const [ariChannelActive, setAriChannelActive] = useState(false);
  const [ariConnected, setAriConnected] = useState(true);
  const [ariCallType, setAriCallType] = useState(null); // 'VIDEO', 'AUDIO', or null

  // Caller Information Modal State
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

  // Fetch current user ID from /me API
  useEffect(() => {
    const headers = { "Content-Type": "application/json" };
    if (configApiToken) headers["Authorization"] = `Bearer ${configApiToken}`;

    fetch("/me", { headers, credentials: "include" })
      .then((r) => r.json())
      .then((user) => {
        if (user?.id) {
          setCurrentUserId(user.id);
        }
      })
      .catch((err) => console.error("[Softphone] Failed to fetch user:", err));
  }, [configApiToken]);

  // Fetch config from API on mount and apply over localStorage/props
  useEffect(() => {
    if (!configApiUrl || !currentUserId) return;

    const headers = { "Content-Type": "application/json" };
    if (configApiToken) headers["Authorization"] = `Bearer ${configApiToken}`;

    fetch(`${configApiUrl}?user_id=${currentUserId}`, { headers, credentials: "include" })
      .then((r) => r.json())
      .then(({ data }) => {
        if (!data) return; // null = no saved config, keep defaults

        // Apply SIP form fields
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

        // Apply UI prefs
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

        // Apply panel position offset (position_top/bottom/left/right)
        setPanelOffset((o) => ({
          top: data.position_top ?? o.top,
          right: data.position_right ?? o.right,
          bottom: data.position_bottom ?? o.bottom,
          left: data.position_left ?? o.left,
        }));

        // Auto-connect if SIP credentials are present in the API response
        if (data.server && data.extension && data.password) {
          setActiveConfig(
            withForcedWssTransport({
              server: data.server,
              extension: data.extension,
              password: data.password,
              displayName: data.display_name ?? "",
              audioCodecs: data.audio_codecs ?? form.audioCodecs,
              videoCodecs: data.video_codecs ?? form.videoCodecs,
            })
          );
        }
      })
      .catch((err) => console.error("[Softphone] Failed to fetch config:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configApiUrl, configApiToken, currentUserId]);

  // Filter codecs based on settingConfigCodecs
  const availableAudioCodecs = settingConfigCodecs.audio.visible
    ? AUDIO_CODECS.filter((c) => settingConfigCodecs.audio.codecs.includes(c))
    : [];
  const availableVideoCodecs = settingConfigCodecs.video.visible
    ? VIDEO_CODECS.filter((c) => settingConfigCodecs.video.codecs.includes(c))
    : [];

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
    setRecordingConfig,
    setDirectoryHandle,
  } = useSIP(sipConfig);

  const { ref: dragRef, pos: dragPos } = useDraggable({ x: window.innerWidth - 90, y: 24 });
  const videoSize = useResizable({ w: 360, h: 700 }, { w: 260, h: 700 });
  const videoNodeRef = useRef(null);
  const dialerNodeRef = useRef(null);
  const incomingNodeRef = useRef(null);
  const wsPreview = buildWs(SIP_WS_PROTOCOL, form.server, SIP_WS_PORT) || `${SIP_WS_PROTOCOL}://...:${SIP_WS_PORT}${SIP_WS_PATH}`;

  const incomingDefaultPos = useMemo(() => {
    const center = computePanelPos("center", 320, 320, panelOffset);
    if (showCallerInfoModal) {
      return { x: Math.max(0, center.x - 278), y: center.y };
    }
    return center;
  }, [showCallerInfoModal, panelOffset]);

  const callerInfoDefaultPos = useMemo(() => {
    const center = computePanelPos("center", 540, 480, panelOffset);
    if (callState === "incoming" && callerData && ariChannelActive) {
      return { x: Math.min(window.innerWidth - 550, center.x + 168), y: center.y - 40 };
    }
    return center;
  }, [callState, callerData, ariChannelActive, panelOffset]);

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

  useEffect(() => {
    setMediaError(getMediaSecurityError());
  }, []);

  // Reset callHasVideo and clear dialInput on idle
  useEffect(() => {
    if (callState === "idle") {
      setCallHasVideo(true);
      setAriCallType(null);
      setDialInput("");
    }
  }, [callState]);

  // Poll Asterisk ARI for active channels to dynamically detect calls from GoIPS gateways
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

    const checkAriChannels = () => {
      const myHeaders = new Headers();
      myHeaders.append("Authorization", "Basic a3NpcF9hZG1pbjo0NGFmMDlmNTVmMGI4NWUyZWI1ZGI1N2VkNDhlODk5MA==");

      const requestOptions = {
        method: "GET",
        headers: myHeaders,
        redirect: "follow"
      };

      fetch("https://pbx.carmona.gov.ph/ari/channels", requestOptions)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP error ${res.status}`);
          return res.json();
        })
        .then(channels => {
          if (!isMounted) return;
          if (!Array.isArray(channels)) {
            setCheckingAri(false);
            setAriChannelActive(false);
            return;
          }

          // Find channels belonging to our registered extension
          const myChannels = channels.filter(ch =>
            ch.name && ch.name.includes(sipConfig.extension)
          );

          if (myChannels.length === 0) {
            setAriGoIpDetected(false);
            setCheckingAri(false);
            setAriChannelActive(false);
            setAriCallType(null);
            return;
          }

          // We found an active channel for our extension!
          setAriChannelActive(true);

          // Find if there is any active GoIPS channel
          const goIpChannels = channels.filter(ch =>
            ch.name && ch.name.toLowerCase().includes("goips")
          );

          let linkedToGoIp = false;
          if (goIpChannels.length > 0) {
            // Check if any of our channels is linked to a GoIPS channel
            for (const myCh of myChannels) {
              const myBaseId = myCh.id ? myCh.id.split('.')[0] : "";
              const myConnectedNum = myCh.connected?.number || "";
              const myConnectedName = myCh.connected?.name || "";
              const myCallerNum = myCh.caller?.number || "";

              for (const goIpCh of goIpChannels) {
                const goIpBaseId = goIpCh.id ? goIpCh.id.split('.')[0] : "";
                const goIpCallerNum = goIpCh.caller?.number || "";
                const goIpConnectedNum = goIpCh.connected?.number || "";

                // Condition 1: Same base channel ID (e.g. sharing the same call session root ID)
                const sameBaseId = myBaseId && goIpBaseId && myBaseId === goIpBaseId;

                // Condition 2: Caller/Connected number matching
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

          // Locate the caller channel to fetch SHARED(CALL_TYPE)
          let callerChannel = null;
          for (const myCh of myChannels) {
            const myBaseId = myCh.id ? myCh.id.split('.')[0] : "";
            const myCallerNum = myCh.caller?.number || "";

            const candidate = channels.find(ch => {
              if (ch.id === myCh.id) return false;
              const chBaseId = ch.id ? ch.id.split('.')[0] : "";
              const sameBase = myBaseId && chBaseId && myBaseId === chBaseId;

              const isPjsip = ch.name && ch.name.startsWith("PJSIP/");
              const isOperator = ch.name && ch.name.includes(sipConfig.extension);

              if (isPjsip && !isOperator && (sameBase || (myCallerNum && ch.name.includes(myCallerNum)))) {
                return true;
              }
              return false;
            });

            if (candidate) {
              callerChannel = candidate;
              break;
            }
          }

          if (!callerChannel) {
            for (const myCh of myChannels) {
              const myCallerNum = myCh.caller?.number || "";
              const candidate = channels.find(ch => {
                if (ch.id === myCh.id) return false;
                const isOperator = ch.name && ch.name.includes(sipConfig.extension);
                if (isOperator) return false;

                const myBaseId = myCh.id ? myCh.id.split('.')[0] : "";
                const chBaseId = ch.id ? ch.id.split('.')[0] : "";
                const sameBase = myBaseId && chBaseId && myBaseId === chBaseId;

                return sameBase || (myCallerNum && ch.name.includes(myCallerNum)) || (ch.caller?.number === myCallerNum);
              });
              if (candidate) {
                callerChannel = candidate;
                break;
              }
            }
          }

          if (callerChannel) {
            fetch(`https://pbx.carmona.gov.ph/ari/channels/${callerChannel.id}/variable?variable=CALL_TYPE`, requestOptions)
              .then(vRes => {
                if (!vRes.ok) throw new Error("Failed to fetch variable");
                return vRes.json();
              })
              .then(vData => {
                if (!isMounted) return;
                const val = vData.value ? vData.value.toUpperCase() : null;
                console.log(`[ARI] Fetched CALL_TYPE for channel ${callerChannel.id}: ${val}`);
                setAriCallType(val);
                setCheckingAri(false);
              })
              .catch(err => {
                console.warn("[ARI] Variable fetch failed:", err);
                if (!isMounted) return;
                setCheckingAri(false);
              });
          } else {
            setCheckingAri(false);
          }
        })
        .catch(err => {
          console.warn("ARI fetch failed:", err);
          if (!isMounted) return;
          setAriChannelActive(true);
          setCheckingAri(false);
          setAriGoIpDetected(false);
          setAriCallType(null);
        });
    };

    // Run immediately and poll every 2 seconds
    checkAriChannels();
    pollInterval = setInterval(checkAriChannels, 2000);

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [callState, sipConfig.extension, incomingSession]);

  // Background ARI health check to detect connection to pbx.carmona.gov.ph ARI
  useEffect(() => {
    if (!registered) {
      setAriConnected(true);
      return;
    }

    let isMounted = true;
    let pollInterval = null;

    const checkAriHealth = () => {
      const myHeaders = new Headers();
      myHeaders.append("Authorization", "Basic a3NpcF9hZG1pbjo0NGFmMDlmNTVmMGI4NWUyZWI1ZGI1N2VkNDhlODk5MA==");

      const requestOptions = {
        method: "GET",
        headers: myHeaders,
        redirect: "follow"
      };

      fetch("https://pbx.carmona.gov.ph/ari/channels", requestOptions)
        .then(res => {
          if (!isMounted) return;
          if (res.ok) {
            setAriConnected(true);
          } else {
            setAriConnected(false);
          }
        })
        .catch(() => {
          if (!isMounted) return;
          // CORS blocks the request from the browser — this does NOT mean the
          // Asterisk server is offline. Keep ariConnected true to avoid a
          // false-positive "ARI Offline" banner on the operator screen.
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

  const isAudioOnlyCall = ariCallType === "AUDIO" || (ariCallType !== "VIDEO" && (!callHasVideo || isGoIpCall));

  // Sync recording config to useSIP whenever settings change
  useEffect(() => {
    setRecordingConfig({
      enabled: uiPrefs.autoRecord,
      directory: form.recordingDir,
      uploadApiUrl: form.uploadApiUrl,
    });
  }, [uiPrefs.autoRecord, form.recordingDir, form.uploadApiUrl]);

  // Check directory access when auto-record is enabled
  useEffect(() => {
    const saved = loadConfig();
    if (uiPrefs.autoRecord && !dirHandle && !saved?.hasDirectoryAccess) {
      setShowDirModal(true);
    }
  }, [uiPrefs.autoRecord, dirHandle]);

  // Save recording directory changes to localStorage
  useEffect(() => {
    const saved = loadConfig();
    if (saved && form.recordingDir !== saved.recordingDir) {
      saveConfig({ ...saved, recordingDir: form.recordingDir });
    }
  }, [form.recordingDir]);

  // Keyboard shortcut: Ctrl + Shift + K to open settings
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "K" || e.key === "k")) {
        e.preventDefault();
        console.log("🔑 Keyboard shortcut triggered: Ctrl + Shift + K");
        setShowSettings((s) => {
          const newState = !s;
          console.log(
            "⚙️ Settings panel toggled:",
            newState ? "OPEN" : "CLOSE",
          );
          console.log(
            "📊 Current showSettings state:",
            s,
            "→ New state:",
            newState,
          );
          return newState;
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch caller data when incoming or outgoing call
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
        .then(res => res.json())
        .then(data => {
          setCallerData({ ...data, _fetchedExt: ext });
          setFetchingCaller(false);

          // Trigger condition for Caller Information Modal
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
        .catch(err => {
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

  // Auto-hide status toast when connected
  useEffect(() => {
    // Broadcast status to ksipcall for external components
    ksipcall.updateStatus({
      registered,
      reconnecting,
      extension: activeConfig?.extension,
      error,
      ariConnected,
      callState,
      callerData
    });

    if (registered) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowStatusToast(true);
      const timer = setTimeout(() => setShowStatusToast(false), 5000);
      return () => clearTimeout(timer);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowStatusToast(true);
    }
  }, [registered, reconnecting, activeConfig?.extension, error, ariConnected, callState, callerData]);

  const handleCreateDirectory = async () => {
    try {
      const handle = await window.showDirectoryPicker({
        mode: "readwrite",
        startIn: "downloads",
      });

      // Create nested folder structure: video/recordings/Ksip
      let currentHandle = handle;
      const folders = ["video", "recordings", "Ksip"];

      for (const folderName of folders) {
        currentHandle = await currentHandle.getDirectoryHandle(folderName, {
          create: true,
        });
      }

      setDirHandle(currentHandle);
      setDirectoryHandle(currentHandle);
      setShowDirModal(false);

      // Save directory handle state to localStorage
      const saved = loadConfig() || {};
      saveConfig({ ...saved, hasDirectoryAccess: true });
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Directory selection failed:", err);
      }
    }
  };

  const handleCancelDirectory = () => {
    setShowDirModal(false);
    setUiPrefs((p) => ({ ...p, autoRecord: false }));

    // Update localStorage
    const saved = loadConfig() || {};
    saveConfig({ ...saved, autoRecord: false });
  };

  useEffect(() => {
    const unsub = ksipcall._subscribe(({ target, video }) => {
      if (!registered) return;
      setDialInput(target);
      // Don't permanently set withVideo — only use it for this specific call
      safeCall(target, video);
    });
    return unsub;
  }, [registered, safeCall]);

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
      // Save all uiPrefs EXCEPT showSetting
      ...Object.fromEntries(
        Object.entries(uiPrefs).filter(([k]) => k !== "showSetting"),
      ),
    });
    saveConfig(config);
    setActiveConfig(config);
    setShowSettings(false);

    // Save to database if configApiUrl is provided
    if (configApiUrl && currentUserId) {
      console.log("[Softphone] Saving config with user_id:", currentUserId);
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
        .then(res => res.json())
        .then(data => console.log("[Softphone] Config saved:", data))
        .catch((err) => console.error("[Softphone] Failed to save config:", err));
    } else {
      console.warn("[Softphone] Cannot save config - configApiUrl:", configApiUrl, "currentUserId:", currentUserId);
    }
  };

  const handleMute = () => {
    mute(!muted);
    setMuted((m) => !m);
  };

  // Reset remote video loaded state when call state changes
  useEffect(() => {
    if (callState === "idle" || callState === "ringing") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRemoteVideoLoaded(false);
    }
  }, [callState]);

  const handleCallerInfoSubmit = (e) => {
    e.preventDefault();
    const errors = {};
    if (!callerInfoForm.completeName.trim()) {
      errors.completeName = "Complete Name is required";
    }
    if (!callerInfoForm.completeAddress.trim()) {
      errors.completeAddress = "Complete Address is required";
    }
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
        setCallerInfoForm({
          completeName: "",
          completeAddress: "",
          age: "",
          gender: "",
        });
      })
      .catch((err) => {
        console.error("Failed to submit caller registration:", err);
        setSubmittingCallerInfo(false);
        setCallerInfoErrors({ submit: "Failed to submit caller info. Please try again." });
      });
  };

  const handleVideoMute = () => {
    const next = !videoMuted;
    setVideoMuted(next);
    toggleVideo(next);
  };

  const handleUiPref = (key, val) => {
    setUiPrefs((p) => {
      const next = { ...p, [key]: val };
      if (key === "answerwithVideoCall" && val)
        next.ShowIncomingCallAudio = false;
      if (key === "ShowIncomingCallAudio" && val)
        next.answerwithVideoCall = false;

      // Save to localStorage immediately for all UI prefs except showSetting
      if (key !== "showSetting") {
        const saved = loadConfig() || {};
        saveConfig({ ...saved, [key]: val });
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

  const statusColor = registered
    ? "status-green"
    : reconnecting
      ? "status-yellow"
      : "status-red";
  const fabInBottomHalf = dragPos.y > window.innerHeight / 2;
  const fabInRightHalf = dragPos.x > window.innerWidth / 2;
  const navClass = `sp-fab-wrap ${fabInBottomHalf ? "nav-up" : "nav-down"} ${fabInRightHalf ? "nav-left" : "nav-right"}`;

  console.log("🔍 Render check:", {
    enabledBubble: uiPrefs.enabledBubble,
    fullscreen: uiPrefs.fullscreen,
    showSettings,
    showDialer,
  });

  console.log("🔍 Render check:", {
    enabledBubble: uiPrefs.enabledBubble,
    fullscreen: uiPrefs.fullscreen,
    showSettings,
    showDialer,
  });

  // ── Fullscreen Mode ───────────────────────────────────────────
  if (uiPrefs.fullscreen) {
    return (
      <div className="sp-fs-workspace">
        <audio ref={remoteAudioRef} autoPlay />

        {/* Fullscreen Header */}
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
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {activeConfig && (
              <button
                className="sp-icon-btn"
                title="Disconnect"
                onClick={() => setActiveConfig(null)}
              >
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

        {/* Fullscreen Body */}
        <div className="sp-fs-body">
          {/* Column 1 — Dialer */}
          <div className="sp-fs-col sp-fs-dialer-col">
            <div className="sp-fs-col-title">Dialer</div>

            {/* Incoming call banner inside dialer col */}
            {callState === "incoming" && callerData && ariChannelActive && (
              <div className="sp-fs-incoming">
                <div
                  className="sp-incoming-avatar"
                  style={{ margin: "0 auto 12px" }}
                >
                  {callerData?.avatar ? (
                    <img src={callerData.avatar} alt="Caller" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  ) : (
                    <PhoneIncoming size={22} />
                  )}
                </div>
                <p className="sp-incoming-label">Incoming Call</p>
                <p className="sp-incoming-caller">
                  {callerData?.name || incomingSession?.remoteIdentity?.displayName ||
                    incomingSession?.remoteIdentity?.uri?.user ||
                    "Unknown"}
                </p>
                {ariCallType && (
                  <div style={{ marginTop: 6, display: 'flex', justifyContent: 'center' }}>
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
                {callerData && (
                  <div style={{ fontSize: "0.85rem", opacity: 0.8, marginTop: 4 }}>
                    {callerData.address && <div>Address: {callerData.address}</div>}
                  </div>
                )}
                <br />
                <div
                  className="sp-incoming-actions"
                  style={{ justifyContent: "center", marginTop: 12 }}
                >
                  {checkingAri ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.85rem', padding: '10px 0', width: '100%' }}>
                      <div style={{ width: 14, height: 14, border: '2px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spSpin 0.6s linear infinite' }} />
                      Verifying call line...
                    </div>
                  ) : (ariCallType === "AUDIO" || isGoIpCall) ? (
                    <button
                      className="sp-action-btn sp-action-answer"
                      onClick={() => safeAnswer(false)}
                      title="Answer Call"
                    >
                      <Phone size={18} />
                    </button>
                  ) : (
                    <button
                      className="sp-action-btn sp-action-video"
                      onClick={() => safeAnswer(true)}
                      title="Answer with Video"
                    >
                      <Video size={18} />
                    </button>
                  )}
                  <button
                    className="sp-action-btn sp-action-reject"
                    onClick={hangup}
                  >
                    <PhoneMissed size={18} />
                  </button>
                </div>
              </div>
            )}

            <div className="sp-dial-row">
              <input
                className="sp-dial-input"
                value={dialInput}
                onChange={(e) => setDialInput(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    dialInput &&
                    registered &&
                    callState === "idle"
                  )
                    safeCall(dialInput, withVideo);
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
                <Video size={16} />
                <span>Video</span>
              </label>
              <button
                className="sp-call-btn"
                onClick={() => {
                  if (dialInput && registered && callState === "idle")
                    safeCall(dialInput, withVideo);
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
              {callState === "ringing"
                ? "Calling..."
                : callState === "active"
                  ? "On Call"
                  : "Video"}
              {(callState === "active" || callState === "ringing") && (
                <div
                  className={`sp-call-dot ${callState === "active" ? "active" : "ringing"}`}
                  style={{ marginLeft: 8 }}
                />
              )}
            </div>
            {isAudioOnlyCall ? (
              <div className="sp-fs-video-wrap sp-audio-call-wrap" style={{ flex: 1, background: 'radial-gradient(circle at center, #1e1e38 0%, #0a0a14 100%)', display: 'flex', flexDirection: 'column' }}>
                <div className="sp-audio-call-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '24px', textAlign: 'center' }}>

                  {/* Beautiful glowing avatar */}
                  <div className="sp-audio-avatar-wrap" style={{ position: 'relative', marginBottom: '20px' }}>
                    <div className="sp-audio-avatar-glow" style={{
                      position: 'absolute',
                      inset: '-12px',
                      borderRadius: '50%',
                      background: 'rgba(79, 70, 229, 0.25)',
                      filter: 'blur(16px)',
                      animation: callState === 'active' ? 'pulseGlow 2s infinite' : 'none'
                    }} />
                    <div className="sp-incoming-avatar" style={{
                      margin: "0",
                      width: 140,
                      height: 140,
                      border: '3px solid rgba(129, 140, 248, 0.6)',
                      background: 'rgba(79, 70, 229, 0.1)',
                      boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
                      animation: callState === 'ringing' ? 'ring 1.2s ease infinite' : 'none'
                    }}>
                      {callerData?.avatar ? (
                        <img src={callerData.avatar} alt="Citizen" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      ) : (
                        <User size={64} style={{ color: '#818cf8' }} />
                      )}
                    </div>
                  </div>

                  {/* Caller Name */}
                  <div style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '8px', color: '#f8fafc', letterSpacing: '0.5px' }}>
                    {callerData?.name || dialInput || "Citizen"}
                  </div>

                  {/* Caller Address */}
                  {callerData?.address && (
                    <div style={{ fontSize: '1rem', opacity: 0.8, color: '#94a3b8', marginBottom: '20px', maxWidth: '400px', lineHeight: '1.4' }}>
                      {callerData.address}
                    </div>
                  )}

                  {/* Calling Status & Duration */}
                  {callState === "ringing" ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#facc15', fontSize: '1rem', fontWeight: '500', background: 'rgba(250, 204, 21, 0.1)', padding: '8px 24px', borderRadius: '24px' }}>
                      <Loader size={18} className="spin" />
                      <span>Calling...</span>
                    </div>
                  ) : (
                    <div style={{ color: '#4ade80', fontSize: '1rem', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase', background: 'rgba(74, 222, 128, 0.1)', padding: '6px 16px', borderRadius: '14px' }}>
                      Ongoing Call
                    </div>
                  )}
                </div>

                {/* Compact Audio Call Controls (only Mic/Mute and Hangup) */}
                <div className="sp-call-controls sp-audio-call-controls" style={{ background: 'transparent', padding: '32px 20px 48px', position: 'relative' }}>
                  <button
                    className={`sp-ctrl-btn ${muted ? "active" : ""}`}
                    onClick={handleMute}
                    style={{ width: '56px', height: '56px' }}
                    title={muted ? "Unmute Mic" : "Mute Mic"}
                  >
                    {muted ? <MicOff size={22} /> : <Mic size={22} />}
                  </button>
                  <button
                    className="sp-ctrl-btn sp-ctrl-hangup"
                    onClick={hangup}
                    style={{ width: '64px', height: '64px', boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)' }}
                    title="Hang Up"
                  >
                    <PhoneOff size={26} />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="sp-fs-video-wrap">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="sp-video-remote"
                    onLoadedData={() => setRemoteVideoLoaded(true)}
                  />
                  {!videoMuted && (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="sp-video-local"
                    />
                  )}
                  {(callState === "ringing" || (callState === "active" && !remoteVideoLoaded)) && (
                    <div className="sp-video-placeholder" style={{ flexDirection: 'column', padding: '20px', textAlign: 'center' }}>
                      <div className="sp-incoming-avatar" style={{ margin: "0 auto 12px", width: 80, height: 80 }}>
                        {callerData?.avatar ? (
                          <img src={callerData.avatar} alt="Citizen" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                        ) : (
                          <User size={36} />
                        )}
                      </div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: 4, color: '#e2e8f0' }}>
                        {callerData?.name || dialInput || "Citizen"}
                      </div>
                      {callerData?.address && (
                        <div style={{ fontSize: "0.85rem", opacity: 0.8, marginBottom: 16 }}>
                          Address: {callerData.address}
                        </div>
                      )}
                      {callState === "ringing" ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.8, color: '#cbd5e1' }}>
                          <Loader size={18} className="spin" />
                          <span>Calling...</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.8, color: '#cbd5e1' }}>
                          <Phone size={18} />
                          <span>In Call</span>
                        </div>
                      )}
                    </div>
                  )}
                  {callState === "idle" && (
                    <div className="sp-video-placeholder">
                      <Phone size={32} style={{ opacity: 0.2, color: "white" }} />
                      <span style={{ opacity: 0.4, color: "white" }}>
                        No active call
                      </span>
                    </div>
                  )}
                </div>
                {(callState === "active" || callState === "ringing") && (
                  <div className="sp-call-controls">
                    <button
                      className={`sp-ctrl-btn ${muted ? "active" : ""}`}
                      onClick={handleMute}
                    >
                      {muted ? <MicOff size={16} /> : <Mic size={16} />}
                    </button>
                    <button className="sp-ctrl-btn sp-ctrl-hangup" onClick={hangup}>
                      <PhoneOff size={18} />
                    </button>
                    <button
                      className={`sp-ctrl-btn ${videoMuted ? "active" : ""}`}
                      onClick={handleVideoMute}
                    >
                      {videoMuted ? <VideoOff size={16} /> : <Video size={16} />}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Column 3 — Settings (slide in/out) */}
          <div
            className={`sp-fs-col sp-fs-settings-col ${showFsSettings ? "open" : ""}`}
          >
            <div className="sp-fs-col-title">
              Settings
              <button
                className="sp-icon-btn"
                onClick={() => setShowFsSettings(false)}
                style={{ marginLeft: "auto" }}
              >
                <X size={13} />
              </button>
            </div>
            <div className="sp-fs-settings-body">
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
                      setActiveConfig(null);
                      setShowFsSettings(false);
                    }}
                  >
                    <LogOut size={13} /> Disconnect
                  </button>
                )}
              </div>
              <form className="sp-login-form" onSubmit={handleConnect}>
                {[
                  {
                    icon: <Server size={14} />,
                    ph: "Server IP",
                    k: "server",
                    t: "text",
                  },
                  {
                    icon: <User size={14} />,
                    ph: "Extension",
                    k: "extension",
                    t: "text",
                  },
                  {
                    icon: <Lock size={14} />,
                    ph: "Password",
                    k: "password",
                    t: "password",
                  },
                  {
                    icon: <User size={14} />,
                    ph: "Display Name (opt.)",
                    k: "displayName",
                    t: "text",
                  },
                ].map(({ icon, ph, k, t }) => (
                  <div className="sp-field" key={k}>
                    {icon}
                    <input
                      placeholder={ph}
                      type={t}
                      value={form[k]}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [k]: e.target.value }))
                      }
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
                <p className="sp-settings-label" style={{ marginTop: 6 }}>
                  UI Preferences
                </p>
                <div className="sp-prefs-list">
                  {settingConfigToggles.fullscreen && (
                    <ToggleRow
                      label="Fullscreen Mode"
                      k="fullscreen"
                      uiPrefs={uiPrefs}
                      onToggle={handleUiPref}
                    />
                  )}
                  {settingConfigToggles.autoAnswerVideo && (
                    <ToggleRow
                      label="Answer with Video"
                      k="answerwithVideoCall"
                      uiPrefs={uiPrefs}
                      onToggle={handleUiPref}
                    />
                  )}
                  {settingConfigToggles.answerButtonVideo && (
                    <ToggleRow
                      label="Show Video Answer Btn"
                      k="ShowIncomingCallVideoBtn"
                      uiPrefs={uiPrefs}
                      onToggle={handleUiPref}
                    />
                  )}
                  {settingConfigToggles.answerButtonAudio && (
                    <ToggleRow
                      label="Show Audio Answer Btn"
                      k="ShowIncomingCallAudio"
                      uiPrefs={uiPrefs}
                      onToggle={handleUiPref}
                    />
                  )}
                  {settingConfigToggles.autoRecording && (
                    <ToggleRow
                      label="Auto Record Calls"
                      k="autoRecord"
                      uiPrefs={uiPrefs}
                      onToggle={handleUiPref}
                    />
                  )}
                </div>
                {uiPrefs.autoRecord && (
                  <div className="sp-field" style={{ marginTop: 8 }}>
                    <Server size={14} />
                    <input
                      placeholder="video/recordings/Ksip"
                      type="text"
                      value={form.recordingDir}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, recordingDir: e.target.value }))
                      }
                    />
                  </div>
                )}
                {uiPrefs.autoRecord && (
                  <div className="sp-field" style={{ marginTop: 8 }}>
                    <Server size={14} />
                    <input
                      placeholder="Upload API URL (optional)"
                      type="url"
                      value={form.uploadApiUrl}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, uploadApiUrl: e.target.value }))
                      }
                    />
                  </div>
                )}
                <p className="sp-settings-label" style={{ marginTop: 10 }}>
                  Audio Codecs
                </p>
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
                <p className="sp-settings-label" style={{ marginTop: 10 }}>
                  Video Codecs
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
                <button type="submit" className="sp-login-btn">
                  <Phone size={14} />{" "}
                  {activeConfig ? "Save & Reconnect" : "Save & Connect"}
                </button>
                {/* Caller Information Modal (Fullscreen Overlay) */}
                {showCallerInfoModal && (
                  <Draggable
                    nodeRef={callerInfoNodeRef}
                    handle=".sp-panel-header"
                    bounds="parent"
                    defaultPosition={callerInfoDefaultPos}
                  >
                    <div ref={callerInfoNodeRef} className="sp-caller-info-panel">
                      <div className="sp-panel-inner">
                        <div className="sp-panel-header">
                          <GripHorizontal size={14} style={{ cursor: 'move' }} />
                          <span>Caller Registration</span>
                          <button
                            type="button"
                            className="sp-icon-btn sp-caller-info-close-btn"
                            onClick={() => setShowCallerInfoModal(false)}
                            title="Close"
                            style={{ marginLeft: "auto" }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <form onSubmit={handleCallerInfoSubmit} className="sp-caller-info-body">
                          <div className="sp-caller-info-title">New Caller Info</div>
                          <div className="sp-caller-info-subtitle">
                            No matching records found. Please register the caller's details.
                          </div>

                          <div className="sp-caller-info-grid">
                            <div className="sp-form-group">
                              <label className="sp-form-label required">Complete Name</label>
                              <input
                                type="text"
                                className="sp-form-input"
                                placeholder="John Doe"
                                value={callerInfoForm.completeName}
                                onChange={(e) => setCallerInfoForm(f => ({ ...f, completeName: e.target.value }))}
                              />
                              {callerInfoErrors.completeName && (
                                <span className="sp-form-error">{callerInfoErrors.completeName}</span>
                              )}
                            </div>

                            <div className="sp-form-group">
                              <label className="sp-form-label">Mobile Number</label>
                              <input
                                type="text"
                                className="sp-form-input"
                                value={callerInfoMobileNumber}
                                disabled
                                readOnly
                              />
                            </div>

                            <div className="sp-form-group" style={{ gridColumn: 'span 2' }}>
                              <label className="sp-form-label required">Complete Address</label>
                              <input
                                type="text"
                                className="sp-form-input"
                                placeholder="123 Main St, City"
                                value={callerInfoForm.completeAddress}
                                onChange={(e) => setCallerInfoForm(f => ({ ...f, completeAddress: e.target.value }))}
                              />
                              {callerInfoErrors.completeAddress && (
                                <span className="sp-form-error">{callerInfoErrors.completeAddress}</span>
                              )}
                            </div>

                            <div className="sp-form-group">
                              <label className="sp-form-label">Age</label>
                              <input
                                type="number"
                                className="sp-form-input"
                                placeholder="Enter age"
                                min="0"
                                max="120"
                                value={callerInfoForm.age}
                                onChange={(e) => setCallerInfoForm(f => ({ ...f, age: e.target.value }))}
                              />
                            </div>

                            <div className="sp-form-group">
                              <label className="sp-form-label">Gender</label>
                              <div className="sp-gender-options">
                                {["Male", "Female", "Other"].map((g) => (
                                  <label key={g} className="sp-gender-option">
                                    <input
                                      type="radio"
                                      name="gender"
                                      value={g}
                                      checked={callerInfoForm.gender === g}
                                      onChange={() => setCallerInfoForm(f => ({ ...f, gender: g }))}
                                    />
                                    <span>{g}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>

                          {callerInfoErrors.submit && (
                            <span className="sp-form-error" style={{ textAlign: "center" }}>
                              {callerInfoErrors.submit}
                            </span>
                          )}

                          <button
                            type="submit"
                            className="sp-caller-info-submit-btn"
                            disabled={submittingCallerInfo}
                          >
                            {submittingCallerInfo ? (
                              <>
                                <div style={{ width: 14, height: 14, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spSpin 0.6s linear infinite' }} />
                                Submitting...
                              </>
                            ) : (
                              "Register Caller"
                            )}
                          </button>
                        </form>
                      </div>
                    </div>
                  </Draggable>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sp-body">
      {mediaError && <div className="sp-media-warning">&#9888; {mediaError}</div>}
      {/* Status Toast - Always visible */}
      {enableFloatingStatus && showStatusToast && (
        <div className={`sp-status-toast ${statusColor}`}>
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
            onClick={() => setShowSettings(true)}
            title="Open Settings"
          >
            <Settings size={16} />
          </button>
        </div>
      )}

      {/* Settings Panel - Always available via Ctrl+Shift+K */}
      {showSettings && (
        <>
          <div
            className="sp-settings-backdrop"
            onClick={() => {
              console.log("🖱️ Backdrop clicked, closing settings");
              setShowSettings(false);
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
                  setShowSettings(false);
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
                      setActiveConfig(null);
                      setShowSettings(false);
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
                  <form className="sp-login-form" onSubmit={handleConnect}>
                    {[
                      {
                        icon: <Server size={14} />,
                        ph: "FreePBX Server IP",
                        k: "server",
                        t: "text",
                      },
                      {
                        icon: <User size={14} />,
                        ph: "Extension",
                        k: "extension",
                        t: "text",
                      },
                      {
                        icon: <Lock size={14} />,
                        ph: "Password",
                        k: "password",
                        t: "password",
                      },
                      {
                        icon: <User size={14} />,
                        ph: "Display Name (opt.)",
                        k: "displayName",
                        t: "text",
                      },
                    ].map(({ icon, ph, k, t }) => (
                      <div className="sp-field" key={k}>
                        {icon}
                        <input
                          placeholder={ph}
                          type={t}
                          value={form[k]}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, [k]: e.target.value }))
                          }
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
                      <p
                        className="sp-settings-label"
                        style={{ marginTop: 10 }}
                      >
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
                      <p
                        className="sp-settings-label"
                        style={{ marginTop: 10 }}
                      >
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
                      <ToggleRow
                        label="Show Bubble"
                        k="enabledBubble"
                        uiPrefs={uiPrefs}
                        onToggle={handleUiPref}
                      />
                    )}
                    {settingConfigToggles.dialer && (
                      <ToggleRow
                        label="Show Dialer Button"
                        k="showDialer"
                        uiPrefs={uiPrefs}
                        onToggle={handleUiPref}
                      />
                    )}
                    {settingConfigToggles.settings && (
                      <ToggleRow
                        label="Show Settings Button"
                        k="showSetting"
                        uiPrefs={uiPrefs}
                        onToggle={handleUiPref}
                      />
                    )}
                    {settingConfigToggles.opacity && (
                      <ToggleRow
                        label="Show Opacity Button"
                        k="showOpacity"
                        uiPrefs={uiPrefs}
                        onToggle={handleUiPref}
                      />
                    )}
                    {settingConfigToggles.autoAnswerVideo && (
                      <ToggleRow
                        label="Answer with Video"
                        k="answerwithVideoCall"
                        uiPrefs={uiPrefs}
                        onToggle={handleUiPref}
                      />
                    )}
                    {settingConfigToggles.answerButtonVideo && (
                      <ToggleRow
                        label="Show Video Answer Btn"
                        k="ShowIncomingCallVideoBtn"
                        uiPrefs={uiPrefs}
                        onToggle={handleUiPref}
                      />
                    )}
                    {settingConfigToggles.answerButtonAudio && (
                      <ToggleRow
                        label="Show Audio Answer Btn"
                        k="ShowIncomingCallAudio"
                        uiPrefs={uiPrefs}
                        onToggle={handleUiPref}
                      />
                    )}
                    {settingConfigToggles.fullscreen && (
                      <ToggleRow
                        label="Fullscreen Mode"
                        k="fullscreen"
                        uiPrefs={uiPrefs}
                        onToggle={handleUiPref}
                      />
                    )}
                    {settingConfigToggles.autoRecording && (
                      <ToggleRow
                        label="Auto Record Calls"
                        k="autoRecord"
                        uiPrefs={uiPrefs}
                        onToggle={handleUiPref}
                      />
                    )}
                  </div>

                  {uiPrefs.autoRecord && (
                    <>
                      <p
                        className="sp-settings-label"
                        style={{ marginTop: 10 }}
                      >
                        Recording Directory
                      </p>
                      <div className="sp-field">
                        <Server size={14} />
                        <input
                          placeholder="video/recordings/Ksip"
                          type="text"
                          value={form.recordingDir}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              recordingDir: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <p
                        className="sp-settings-label"
                        style={{ marginTop: 10 }}
                      >
                        Upload API URL (optional)
                      </p>
                      <div className="sp-field">
                        <Server size={14} />
                        <input
                          placeholder="https://api.example.com/upload-recording"
                          type="url"
                          value={form.uploadApiUrl}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              uploadApiUrl: e.target.value,
                            }))
                          }
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
                            setPanelOffset((o) => ({
                              ...o,
                              [side]: Number(e.target.value),
                            }))
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
      )}

      {/* Show bubble UI only if enabled */}
      {!uiPrefs.fullscreen && (
        <div className="sp-workspace">
          <audio ref={remoteAudioRef} autoPlay />

          {/* Status Toast */}
          {enableFloatingStatus && showStatusToast && (
            <div className={`sp-status-toast ${statusColor}`}>
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
                onClick={() => setShowSettings(true)}
                title="Open Settings"
              >
                <Settings size={16} />
              </button>
            </div>
          )}

          {/* Directory Permission Modal */}
          {showDirModal && (
            <>
              <div
                className="sp-settings-backdrop"
                onClick={handleCancelDirectory}
              />
              <div className="sp-dir-modal">
                <div className="sp-dir-modal-header">
                  <FolderPlus size={20} />
                  <span>Recording Directory Required</span>
                </div>
                <div className="sp-dir-modal-body">
                  <p>Auto-recording is enabled but no directory is selected.</p>
                  <p>
                    Would you like to select a directory for saving call
                    recordings?
                  </p>
                  <div className="sp-dir-modal-note">
                    <strong>Note:</strong> After selecting a folder, the system
                    will automatically create:
                    <code
                      style={{
                        display: "block",
                        marginTop: "6px",
                        padding: "4px 8px",
                        background: "rgba(0,0,0,0.3)",
                        borderRadius: "4px",
                        fontSize: "0.8rem",
                      }}
                    >
                      [selected-folder]/video/recordings/Ksip/
                    </code>
                    All recordings will be saved there.
                  </div>
                </div>
                <div className="sp-dir-modal-actions">
                  <button
                    className="sp-dir-btn sp-dir-cancel"
                    onClick={handleCancelDirectory}
                  >
                    Cancel
                  </button>
                  <button
                    className="sp-dir-btn sp-dir-create"
                    onClick={handleCreateDirectory}
                  >
                    <FolderPlus size={16} />
                    Select Directory
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Draggable Incoming Call Panel */}
          {callState === "incoming" && callerData && ariChannelActive && (
            <Draggable
              nodeRef={incomingNodeRef}
              handle=".sp-panel-header"
              bounds="parent"
              defaultPosition={incomingDefaultPos}
            >
              <div ref={incomingNodeRef} className="sp-incoming-panel">
                <div className="sp-panel-inner">
                  <div className="sp-panel-header">
                    <GripHorizontal size={14} />
                    <span>Incoming Call</span>
                  </div>
                  <div className="sp-incoming-body">
                    <div className="sp-incoming-avatar">
                      {callerData?.avatar ? (
                        <img src={callerData.avatar} alt="Caller" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      ) : (
                        <PhoneIncoming size={26} />
                      )}
                    </div>
                    <p className="sp-incoming-caller">
                      {callerData?.name || incomingSession?.remoteIdentity?.displayName ||
                        incomingSession?.remoteIdentity?.uri?.user ||
                        "Unknown"}
                    </p>
                    {ariCallType && (
                      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center' }}>
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
                    {callerData && (
                      <div style={{ fontSize: "0.9rem", opacity: 0.85, marginTop: 8 }}>
                        {callerData.address && <div>Address: {callerData.address}</div>}
                      </div>
                    )}
                    <br />
                    <div className="sp-incoming-actions">
                      {checkingAri ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.9rem', padding: '10px 0', width: '100%' }}>
                          <div style={{ width: 16, height: 16, border: '2px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spSpin 0.6s linear infinite' }} />
                          Verifying line...
                        </div>
                      ) : (ariCallType === "AUDIO" || isGoIpCall) ? (
                        <button
                          className="sp-action-btn sp-action-answer"
                          onClick={() => safeAnswer(false)}
                          title="Answer Call"
                        >
                          <Phone size={20} />
                        </button>
                      ) : (
                        <button
                          className="sp-action-btn sp-action-video"
                          onClick={() => safeAnswer(true)}
                          title="Answer with Video"
                        >
                          <Video size={20} />
                        </button>
                      )}
                      <button
                        className="sp-action-btn sp-action-reject"
                        onClick={hangup}
                      >
                        <PhoneMissed size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Draggable>
          )}

          {/* Draggable + Resizable Video Panel */}
          {(callState === "active" || callState === "ringing") && (
            <Draggable
              nodeRef={videoNodeRef}
              handle=".sp-panel-header"
              bounds="parent"
              defaultPosition={computePanelPos(
                panelPosition,
                360,
                320,
                panelOffset,
              )}
            >
              <div
                ref={videoNodeRef}
                className={`sp-video-panel ${expanded ? "sp-video-expanded" : ""}`}
                style={
                  expanded
                    ? {}
                    : isAudioOnlyCall
                      ? {
                        width: "320px",
                        height: "460px",
                      }
                      : {
                        width: `${videoSize.size.w}px`,
                        height: `${videoSize.size.h}px`,
                      }
                }
              >
                <div className="sp-panel-inner">
                  <div className="sp-panel-header">
                    <GripHorizontal size={14} />
                    <span>
                      {callState === "ringing" ? "Calling..." : "On Call"}
                    </span>
                    <div
                      className={`sp-call-dot ${callState === "active" ? "active" : "ringing"}`}
                    />
                    {!isAudioOnlyCall && (
                      <button
                        className="sp-icon-btn"
                        onClick={() => setExpanded((e) => !e)}
                        style={{ marginLeft: "auto" }}
                      >
                        {expanded ? (
                          <Minimize2 size={13} />
                        ) : (
                          <Maximize2 size={13} />
                        )}
                      </button>
                    )}
                  </div>
                  {isAudioOnlyCall ? (
                    <div className="sp-video-wrap sp-audio-call-wrap" style={{ minHeight: '380px', background: 'radial-gradient(circle at center, #1e1e38 0%, #0a0a14 100%)', display: 'flex', flexDirection: 'column' }}>
                      <div className="sp-audio-call-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '24px', textAlign: 'center' }}>

                        {/* Beautiful glowing avatar */}
                        <div className="sp-audio-avatar-wrap" style={{ position: 'relative', marginBottom: '20px' }}>
                          <div className="sp-audio-avatar-glow" style={{
                            position: 'absolute',
                            inset: '-8px',
                            borderRadius: '50%',
                            background: 'rgba(79, 70, 229, 0.25)',
                            filter: 'blur(12px)',
                            animation: callState === 'active' ? 'pulseGlow 2s infinite' : 'none'
                          }} />
                          <div className="sp-incoming-avatar" style={{
                            margin: "0",
                            width: 100,
                            height: 100,
                            border: '2px solid rgba(129, 140, 248, 0.6)',
                            background: 'rgba(79, 70, 229, 0.1)',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                            animation: callState === 'ringing' ? 'ring 1.2s ease infinite' : 'none'
                          }}>
                            {callerData?.avatar ? (
                              <img src={callerData.avatar} alt="Citizen" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                            ) : (
                              <User size={48} style={{ color: '#818cf8' }} />
                            )}
                          </div>
                        </div>

                        {/* Caller Name */}
                        <div style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '6px', color: '#f8fafc', letterSpacing: '0.5px' }}>
                          {callerData?.name || dialInput || "Citizen"}
                        </div>

                        {/* Caller Address */}
                        {callerData?.address && (
                          <div style={{ fontSize: "0.9rem", opacity: 0.8, color: '#94a3b8', marginBottom: '16px', maxWidth: '280px', lineHeight: '1.4' }}>
                            {callerData.address}
                          </div>
                        )}

                        {/* Calling Status & Duration */}
                        {callState === "ringing" ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#facc15', fontSize: '0.95rem', fontWeight: '500', background: 'rgba(250, 204, 21, 0.1)', padding: '6px 16px', borderRadius: '20px' }}>
                            <Loader size={16} className="spin" />
                            <span>Calling...</span>
                          </div>
                        ) : (
                          <div style={{ color: '#4ade80', fontSize: '0.95rem', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase', background: 'rgba(74, 222, 128, 0.1)', padding: '4px 12px', borderRadius: '12px' }}>
                            Ongoing Call
                          </div>
                        )}
                      </div>

                      {/* Compact Audio Call Controls (only Mic/Mute and Hangup) */}
                      <div className="sp-call-controls sp-audio-call-controls" style={{ background: 'transparent', padding: '24px 20px 28px', position: 'relative' }}>
                        <button
                          className={`sp-ctrl-btn ${muted ? "active" : ""}`}
                          onClick={handleMute}
                          style={{ width: '48px', height: '48px' }}
                          title={muted ? "Unmute Mic" : "Mute Mic"}
                        >
                          {muted ? <MicOff size={20} /> : <Mic size={20} />}
                        </button>
                        <button
                          className="sp-ctrl-btn sp-ctrl-hangup"
                          onClick={hangup}
                          style={{ width: '56px', height: '56px', boxShadow: '0 8px 20px rgba(239, 68, 68, 0.4)' }}
                          title="Hang Up"
                        >
                          <PhoneOff size={22} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="sp-video-wrap">
                      <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="sp-video-remote"
                        onLoadedData={() => setRemoteVideoLoaded(true)}
                      />
                      {!videoMuted && (
                        <video
                          ref={localVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className="sp-video-local"
                        />
                      )}
                      {(callState === "ringing" || (callState === "active" && !remoteVideoLoaded)) && (
                        <div className="sp-video-placeholder" style={{ flexDirection: 'column', padding: '20px', textAlign: 'center' }}>
                          <div className="sp-incoming-avatar" style={{ margin: "0 auto 12px", width: 80, height: 80 }}>
                            {callerData?.avatar ? (
                              <img src={callerData.avatar} alt="Citizen" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                            ) : (
                              <User size={36} />
                            )}
                          </div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: 4, color: '#e2e8f0' }}>
                            {callerData?.name || dialInput || "Citizen"}
                          </div>
                          {callerData?.address && (
                            <div style={{ fontSize: "0.85rem", opacity: 0.8, marginBottom: 16 }}>
                              Address: {callerData.address}
                            </div>
                          )}
                          {callState === "ringing" ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.8, color: '#cbd5e1' }}>
                              <Loader size={18} className="spin" />
                              <span>Calling...</span>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.8, color: '#cbd5e1' }}>
                              <Phone size={18} />
                              <span>In Call</span>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="sp-call-controls">
                        <button
                          className={`sp-ctrl-btn ${muted ? "active" : ""}`}
                          onClick={handleMute}
                        >
                          {muted ? <MicOff size={16} /> : <Mic size={16} />}
                        </button>
                        <button
                          className="sp-ctrl-btn sp-ctrl-hangup"
                          onClick={hangup}
                        >
                          <PhoneOff size={18} />
                        </button>
                        <button
                          className={`sp-ctrl-btn ${videoMuted ? "active" : ""}`}
                          onClick={handleVideoMute}
                        >
                          {videoMuted ? (
                            <VideoOff size={16} />
                          ) : (
                            <Video size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {!expanded && !isAudioOnlyCall && (
                  <div
                    className="sp-resize-handle"
                    onMouseDown={videoSize.onResizeStart}
                  />
                )}
              </div>
            </Draggable>
          )}

          {/* Draggable Dialer Panel */}
          {showDialer && (
            <Draggable
              nodeRef={dialerNodeRef}
              handle=".sp-panel-header"
              bounds="parent"
              defaultPosition={computePanelPos(
                panelPosition,
                300,
                460,
                panelOffset,
              )}
            >
              <div ref={dialerNodeRef} className="sp-dialer-panel">
                <div className="sp-panel-inner">
                  <div className="sp-panel-header">
                    <GripHorizontal size={14} />
                    <span>Dialer</span>
                    <button
                      className="sp-icon-btn"
                      onClick={() => setShowDialer(false)}
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
                        if (
                          e.key === "Enter" &&
                          dialInput &&
                          registered &&
                          callState === "idle"
                        ) {
                          safeCall(dialInput, withVideo);
                          setShowDialer(false);
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
                          safeCall(dialInput, withVideo);
                          setShowDialer(false);
                        }
                      }}
                      disabled={
                        !dialInput || !registered || callState !== "idle" || !!mediaError
                      }
                    >
                      <Phone size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </Draggable>
          )}

          {/* Settings Panel — 3-column layout */}
          {showSettings && (
            <>
              <div
                className="sp-settings-backdrop"
                onClick={() => {
                  console.log("🖱️ Backdrop clicked, closing settings");
                  setShowSettings(false);
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
                      setShowSettings(false);
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
                          setActiveConfig(null);
                          setShowSettings(false);
                        }}
                      >
                        <LogOut size={13} /> Disconnect
                      </button>
                    )}
                  </div>
                  {error && !reconnecting && (
                    <p className="sp-settings-error">&#9888; {error}</p>
                  )}

                  {/* 3-column grid */}
                  <div className="sp-settings-cols">
                    {/* Column 1 — SIP Config */}
                    <div className="sp-settings-col">
                      <p className="sp-col-title">SIP Configuration</p>
                      <form className="sp-login-form" onSubmit={handleConnect}>
                        {[
                          {
                            icon: <Server size={14} />,
                            ph: "FreePBX Server IP",
                            k: "server",
                            t: "text",
                          },
                          {
                            icon: <User size={14} />,
                            ph: "Extension",
                            k: "extension",
                            t: "text",
                          },
                          {
                            icon: <Lock size={14} />,
                            ph: "Password",
                            k: "password",
                            t: "password",
                          },
                          {
                            icon: <User size={14} />,
                            ph: "Display Name (opt.)",
                            k: "displayName",
                            t: "text",
                          },
                        ].map(({ icon, ph, k, t }) => (
                          <div className="sp-field" key={k}>
                            {icon}
                            <input
                              placeholder={ph}
                              type={t}
                              value={form[k]}
                              onChange={(e) =>
                                setForm((f) => ({ ...f, [k]: e.target.value }))
                              }
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
                          <p
                            className="sp-settings-label"
                            style={{ marginTop: 10 }}
                          >
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
                          <p
                            className="sp-settings-label"
                            style={{ marginTop: 10 }}
                          >
                            <SlidersHorizontal size={13} /> Opacity —{" "}
                            {Math.round(fabOpacity * 100)}%
                          </p>
                          <input
                            type="range"
                            min="0.3"
                            max="1"
                            step="0.05"
                            value={fabOpacity}
                            onChange={(e) =>
                              setFabOpacity(Number(e.target.value))
                            }
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
                          <ToggleRow
                            label="Show Bubble"
                            k="enabledBubble"
                            uiPrefs={uiPrefs}
                            onToggle={handleUiPref}
                          />
                        )}
                        {settingConfigToggles.dialer && (
                          <ToggleRow
                            label="Show Dialer Button"
                            k="showDialer"
                            uiPrefs={uiPrefs}
                            onToggle={handleUiPref}
                          />
                        )}
                        {settingConfigToggles.settings && (
                          <ToggleRow
                            label="Show Settings Button"
                            k="showSetting"
                            uiPrefs={uiPrefs}
                            onToggle={handleUiPref}
                          />
                        )}
                        {settingConfigToggles.opacity && (
                          <ToggleRow
                            label="Show Opacity Button"
                            k="showOpacity"
                            uiPrefs={uiPrefs}
                            onToggle={handleUiPref}
                          />
                        )}
                        {settingConfigToggles.autoAnswerVideo && (
                          <ToggleRow
                            label="Answer with Video"
                            k="answerwithVideoCall"
                            uiPrefs={uiPrefs}
                            onToggle={handleUiPref}
                          />
                        )}
                        {settingConfigToggles.answerButtonVideo && (
                          <ToggleRow
                            label="Show Video Answer Btn"
                            k="ShowIncomingCallVideoBtn"
                            uiPrefs={uiPrefs}
                            onToggle={handleUiPref}
                          />
                        )}
                        {settingConfigToggles.answerButtonAudio && (
                          <ToggleRow
                            label="Show Audio Answer Btn"
                            k="ShowIncomingCallAudio"
                            uiPrefs={uiPrefs}
                            onToggle={handleUiPref}
                          />
                        )}
                        {settingConfigToggles.fullscreen && (
                          <ToggleRow
                            label="Fullscreen Mode"
                            k="fullscreen"
                            uiPrefs={uiPrefs}
                            onToggle={handleUiPref}
                          />
                        )}
                        {settingConfigToggles.autoRecording && (
                          <ToggleRow
                            label="Auto Record Calls"
                            k="autoRecord"
                            uiPrefs={uiPrefs}
                            onToggle={handleUiPref}
                          />
                        )}
                      </div>

                      {uiPrefs.autoRecord && (
                        <>
                          <p
                            className="sp-settings-label"
                            style={{ marginTop: 10 }}
                          >
                            Recording Directory
                          </p>
                          <div className="sp-field">
                            <Server size={14} />
                            <input
                              placeholder="video/recordings/Ksip"
                              type="text"
                              value={form.recordingDir}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  recordingDir: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <p
                            className="sp-settings-label"
                            style={{ marginTop: 10 }}
                          >
                            Upload API URL (optional)
                          </p>
                          <div className="sp-field">
                            <Server size={14} />
                            <input
                              placeholder="https://api.example.com/upload-recording"
                              type="url"
                              value={form.uploadApiUrl}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  uploadApiUrl: e.target.value,
                                }))
                              }
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
                      <p
                        className="sp-settings-label"
                        style={{ marginTop: 10 }}
                      >
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
                                setPanelOffset((o) => ({
                                  ...o,
                                  [side]: Number(e.target.value),
                                }))
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
          )}

          {/* Settings Panel — 3-column layout */}
          {showSettings && (
            <>
              <div
                className="sp-settings-backdrop"
                onClick={() => {
                  console.log("🖱️ Backdrop clicked, closing settings");
                  setShowSettings(false);
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
                      setShowSettings(false);
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
                          setActiveConfig(null);
                          setShowSettings(false);
                        }}
                      >
                        <LogOut size={13} /> Disconnect
                      </button>
                    )}
                  </div>
                  {error && !reconnecting && (
                    <p className="sp-settings-error">&#9888; {error}</p>
                  )}

                  {/* 3-column grid */}
                  <div className="sp-settings-cols">
                    {/* Column 1 — SIP Config */}
                    <div className="sp-settings-col">
                      <p className="sp-col-title">SIP Configuration</p>
                      <form className="sp-login-form" onSubmit={handleConnect}>
                        {[
                          {
                            icon: <Server size={14} />,
                            ph: "FreePBX Server IP",
                            k: "server",
                            t: "text",
                          },
                          {
                            icon: <User size={14} />,
                            ph: "Extension",
                            k: "extension",
                            t: "text",
                          },
                          {
                            icon: <Lock size={14} />,
                            ph: "Password",
                            k: "password",
                            t: "password",
                          },
                          {
                            icon: <User size={14} />,
                            ph: "Display Name (opt.)",
                            k: "displayName",
                            t: "text",
                          },
                        ].map(({ icon, ph, k, t }) => (
                          <div className="sp-field" key={k}>
                            {icon}
                            <input
                              placeholder={ph}
                              type={t}
                              value={form[k]}
                              onChange={(e) =>
                                setForm((f) => ({ ...f, [k]: e.target.value }))
                              }
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
                          <p
                            className="sp-settings-label"
                            style={{ marginTop: 10 }}
                          >
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
                          <p
                            className="sp-settings-label"
                            style={{ marginTop: 10 }}
                          >
                            <SlidersHorizontal size={13} /> Opacity —{" "}
                            {Math.round(fabOpacity * 100)}%
                          </p>
                          <input
                            type="range"
                            min="0.3"
                            max="1"
                            step="0.05"
                            value={fabOpacity}
                            onChange={(e) =>
                              setFabOpacity(Number(e.target.value))
                            }
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
                          <ToggleRow
                            label="Show Bubble"
                            k="enabledBubble"
                            uiPrefs={uiPrefs}
                            onToggle={handleUiPref}
                          />
                        )}
                        {settingConfigToggles.dialer && (
                          <ToggleRow
                            label="Show Dialer Button"
                            k="showDialer"
                            uiPrefs={uiPrefs}
                            onToggle={handleUiPref}
                          />
                        )}
                        {settingConfigToggles.settings && (
                          <ToggleRow
                            label="Show Settings Button"
                            k="showSetting"
                            uiPrefs={uiPrefs}
                            onToggle={handleUiPref}
                          />
                        )}
                        {settingConfigToggles.opacity && (
                          <ToggleRow
                            label="Show Opacity Button"
                            k="showOpacity"
                            uiPrefs={uiPrefs}
                            onToggle={handleUiPref}
                          />
                        )}
                        {settingConfigToggles.autoAnswerVideo && (
                          <ToggleRow
                            label="Answer with Video"
                            k="answerwithVideoCall"
                            uiPrefs={uiPrefs}
                            onToggle={handleUiPref}
                          />
                        )}
                        {settingConfigToggles.answerButtonVideo && (
                          <ToggleRow
                            label="Show Video Answer Btn"
                            k="ShowIncomingCallVideoBtn"
                            uiPrefs={uiPrefs}
                            onToggle={handleUiPref}
                          />
                        )}
                        {settingConfigToggles.answerButtonAudio && (
                          <ToggleRow
                            label="Show Audio Answer Btn"
                            k="ShowIncomingCallAudio"
                            uiPrefs={uiPrefs}
                            onToggle={handleUiPref}
                          />
                        )}
                        {settingConfigToggles.fullscreen && (
                          <ToggleRow
                            label="Fullscreen Mode"
                            k="fullscreen"
                            uiPrefs={uiPrefs}
                            onToggle={handleUiPref}
                          />
                        )}
                        {settingConfigToggles.autoRecording && (
                          <ToggleRow
                            label="Auto Record Calls"
                            k="autoRecord"
                            uiPrefs={uiPrefs}
                            onToggle={handleUiPref}
                          />
                        )}
                      </div>

                      {uiPrefs.autoRecord && (
                        <>
                          <p
                            className="sp-settings-label"
                            style={{ marginTop: 10 }}
                          >
                            Recording Directory
                          </p>
                          <div className="sp-field">
                            <Server size={14} />
                            <input
                              placeholder="video/recordings/Ksip"
                              type="text"
                              value={form.recordingDir}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  recordingDir: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <p
                            className="sp-settings-label"
                            style={{ marginTop: 10 }}
                          >
                            Upload API URL (optional)
                          </p>
                          <div className="sp-field">
                            <Server size={14} />
                            <input
                              placeholder="https://api.example.com/upload-recording"
                              type="url"
                              value={form.uploadApiUrl}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  uploadApiUrl: e.target.value,
                                }))
                              }
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
                      <p
                        className="sp-settings-label"
                        style={{ marginTop: 10 }}
                      >
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
                                setPanelOffset((o) => ({
                                  ...o,
                                  [side]: Number(e.target.value),
                                }))
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
          )}

          {/* Floating FAB */}
          {uiPrefs.enabledBubble && (
            <div
              ref={dragRef}
              className={navClass}
              style={{
                transform: `translate(${dragPos.x}px, ${dragPos.y}px)`,
              }}
            >
              <div className={`sp-fab-menu ${navOpen ? "open" : ""}`}>
                {uiPrefs.showOpacity && (
                  <button
                    className="sp-fab-item"
                    title="Opacity"
                    onClick={() =>
                      setFabOpacity((o) =>
                        o <= 0.3 ? 1 : Math.max(0.3, +(o - 0.2).toFixed(2)),
                      )
                    }
                  >
                    <SlidersHorizontal size={16} />
                  </button>
                )}
                {uiPrefs.showDialer && (
                  <button
                    className={`sp-fab-item ${showDialer ? "fab-active" : ""}`}
                    title="Dialer"
                    onClick={() => {
                      setShowDialer((d) => !d);
                      setShowSettings(false);
                    }}
                  >
                    <Calculator size={24} />
                  </button>
                )}
                {uiPrefs.showSetting && (
                  <button
                    className={`sp-fab-item ${showSettings ? "fab-active" : ""}`}
                    title="Settings"
                    onClick={() => {
                      setShowSettings((s) => !s);
                      setShowDialer(false);
                    }}
                  >
                    <Settings size={24} />
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
                {navOpen ? <X size={20} /> : <MonitorCogIcon size={26} />}
                <span className={`sp-fab-dot ${statusColor}`} />
              </button>
            </div>
          )}

          {/* Caller Information Modal */}
          {showCallerInfoModal && (
            <Draggable
              nodeRef={callerInfoNodeRef}
              handle=".sp-panel-header"
              bounds="parent"
              defaultPosition={callerInfoDefaultPos}
            >
              <div ref={callerInfoNodeRef} className="sp-caller-info-panel">
                <div className="sp-panel-inner">
                  <div className="sp-panel-header">
                    <GripHorizontal size={14} style={{ cursor: 'move' }} />
                    <span>Caller Registration</span>
                    <button
                      type="button"
                      className="sp-icon-btn sp-caller-info-close-btn"
                      onClick={() => setShowCallerInfoModal(false)}
                      title="Close"
                      style={{ marginLeft: "auto" }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <form onSubmit={handleCallerInfoSubmit} className="sp-caller-info-body">
                    <div className="sp-caller-info-title">New Caller Info</div>
                    <div className="sp-caller-info-subtitle">
                      No matching records found. Please register the caller's details.
                    </div>

                    <div className="sp-caller-info-grid">
                      <div className="sp-form-group">
                        <label className="sp-form-label required">Complete Name</label>
                        <input
                          type="text"
                          className="sp-form-input"
                          placeholder="John Doe"
                          value={callerInfoForm.completeName}
                          onChange={(e) => setCallerInfoForm(f => ({ ...f, completeName: e.target.value }))}
                        />
                        {callerInfoErrors.completeName && (
                          <span className="sp-form-error">{callerInfoErrors.completeName}</span>
                        )}
                      </div>

                      <div className="sp-form-group">
                        <label className="sp-form-label">Mobile Number</label>
                        <input
                          type="text"
                          className="sp-form-input"
                          value={callerInfoMobileNumber}
                          disabled
                          readOnly
                        />
                      </div>

                      <div className="sp-form-group" style={{ gridColumn: 'span 2' }}>
                        <label className="sp-form-label required">Complete Address</label>
                        <input
                          type="text"
                          className="sp-form-input"
                          placeholder="123 Main St, City"
                          value={callerInfoForm.completeAddress}
                          onChange={(e) => setCallerInfoForm(f => ({ ...f, completeAddress: e.target.value }))}
                        />
                        {callerInfoErrors.completeAddress && (
                          <span className="sp-form-error">{callerInfoErrors.completeAddress}</span>
                        )}
                      </div>

                      <div className="sp-form-group">
                        <label className="sp-form-label">Age</label>
                        <input
                          type="number"
                          className="sp-form-input"
                          placeholder="Enter age"
                          min="0"
                          max="120"
                          value={callerInfoForm.age}
                          onChange={(e) => setCallerInfoForm(f => ({ ...f, age: e.target.value }))}
                        />
                      </div>

                      <div className="sp-form-group">
                        <label className="sp-form-label">Gender</label>
                        <div className="sp-gender-options">
                          {["Male", "Female", "Other"].map((g) => (
                            <label key={g} className="sp-gender-option">
                              <input
                                type="radio"
                                name="gender"
                                value={g}
                                checked={callerInfoForm.gender === g}
                                onChange={() => setCallerInfoForm(f => ({ ...f, gender: g }))}
                              />
                              <span>{g}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    {callerInfoErrors.submit && (
                      <span className="sp-form-error" style={{ textAlign: "center" }}>
                        {callerInfoErrors.submit}
                      </span>
                    )}

                    <button
                      type="submit"
                      className="sp-caller-info-submit-btn"
                      disabled={submittingCallerInfo}
                    >
                      {submittingCallerInfo ? (
                        <>
                          <div style={{ width: 14, height: 14, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spSpin 0.6s linear infinite' }} />
                          Submitting...
                        </>
                      ) : (
                        "Register Caller"
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </Draggable>
          )}
        </div>
      )}
    </div>
  );
}

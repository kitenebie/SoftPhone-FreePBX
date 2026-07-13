// ─── Constants ────────────────────────────────────────────────────────────────

export const DIALPAD = [
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

export const AUDIO_CODECS = ["PCMU", "PCMA", "G722", "G729", "opus"];
export const VIDEO_CODECS = ["VP8", "VP9", "H264", "H265", "AV1"];

export const STORAGE_KEY = "sip_softphone_config";
export const SIP_WS_PROTOCOL = "wss";
export const SIP_WS_PORT = "8089";
export const SIP_WS_PATH = "/ws";

export const PANEL_POSITIONS = [
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

// ─── Config Storage ───────────────────────────────────────────────────────────

export function loadConfig() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveConfig(c) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
}

// ─── WS / SIP Helpers ─────────────────────────────────────────────────────────

export function normalizeWsProtocol() {
  return SIP_WS_PROTOCOL;
}

export function normalizeWsPort() {
  return SIP_WS_PORT;
}

export function sanitizeServerHost(server) {
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

export function buildWs(_protocol, server, _port) {
  const host = sanitizeServerHost(server);
  return host ? `${SIP_WS_PROTOCOL}://${host}:${SIP_WS_PORT}${SIP_WS_PATH}` : "";
}

export function withForcedWssTransport(config = {}) {
  return {
    ...config,
    server: sanitizeServerHost(config.server),
    wsProtocol: SIP_WS_PROTOCOL,
    wsPort: SIP_WS_PORT,
    wsServer: buildWs(SIP_WS_PROTOCOL, config.server, SIP_WS_PORT),
  };
}

// ─── Media Security ───────────────────────────────────────────────────────────

export function getMediaSecurityError() {
  if (typeof window === "undefined") return "";

  const hasGetUserMedia = !!window.navigator?.mediaDevices?.getUserMedia;
  if (window.isSecureContext && hasGetUserMedia) return "";

  const origin = window.location?.origin || "this page";
  if (!window.isSecureContext) {
    return `Call failed: Media devices are not available because ${origin} is not a secure context. Open the app with HTTPS or localhost. SIP WebSocket must be wss://<pbx-host>:8089/ws.`;
  }

  return "Call failed: Media devices API is unavailable. Check browser support, microphone/camera permissions, and connected devices.";
}

// ─── Panel Position ───────────────────────────────────────────────────────────

export function computePanelPos(position = "center", w = 0, h = 0, offset = {}) {
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

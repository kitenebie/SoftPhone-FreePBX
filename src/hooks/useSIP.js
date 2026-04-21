import { useEffect, useRef, useState } from "react";
import { UserAgent, Registerer, Inviter, SessionState } from "sip.js";
import incomingRingtone from "../assets/ringtones/incoming_call.mp3";
import endCallSound    from "../assets/ringtones/end_call.mp3";

const RECONNECT_DELAY = 3000;

export function useSIP({ server, wsServer, extension, password, displayName }) {
  const [registered,      setRegistered]      = useState(false);
  const [callState,       setCallState]       = useState("idle");
  const [incomingSession, setIncomingSession] = useState(null);
  const [error,           setError]           = useState(null);
  const [reconnecting,    setReconnecting]    = useState(false);

  const uaRef             = useRef(null);
  const registererRef     = useRef(null);
  const sessionRef        = useRef(null);
  const localVideoRef     = useRef(null);
  const remoteVideoRef    = useRef(null);
  const remoteAudioRef    = useRef(null);
  const reconnectTimerRef = useRef(null);
  const unmountedRef      = useRef(false);
  const configRef         = useRef({});
  const callStateRef      = useRef("idle");

  // Ringtone players
  const ringAudio = useRef(null);
  const endAudio  = useRef(null);
  useEffect(() => {
    ringAudio.current = new Audio(incomingRingtone);
    ringAudio.current.loop = true;
    endAudio.current  = new Audio(endCallSound);
    return () => {
      ringAudio.current?.pause();
      endAudio.current?.pause();
    };
  }, []);

  function playRing()  { ringAudio.current?.play().catch(() => {}); }
  function stopRing()  { if (ringAudio.current) { ringAudio.current.pause(); ringAudio.current.currentTime = 0; } }
  function playEnd()   { stopRing(); endAudio.current?.play().catch(() => {}); } // mirror of callState for use inside callbacks

  // Always-fresh setters
  const S = useRef({});
  S.current.callState = (v) => { callStateRef.current = v; setCallState(v); };
  S.current.incomingSession = setIncomingSession;
  S.current.error           = setError;
  S.current.registered      = setRegistered;
  S.current.reconnecting    = setReconnecting;

  // ── Media ─────────────────────────────────────────────────────
  function clearMedia() {
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (localVideoRef.current)  localVideoRef.current.srcObject  = null;
  }

  function attachMedia(session) {
    const attempt = (n = 0) => {
      const sdh = session?.sessionDescriptionHandler;
      if (!sdh) {
        if (n < 15) setTimeout(() => attempt(n + 1), 200);
        return;
      }
      const assign = () => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = sdh.remoteMediaStream;
          remoteAudioRef.current.play().catch(() => {});
        }
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = sdh.remoteMediaStream;
        if (localVideoRef.current)  localVideoRef.current.srcObject  = sdh.localMediaStream;
      };
      assign();
      sdh.peerConnection?.addEventListener("track", assign);
    };
    attempt();
  }

  // ── Wire a session's stateChange ──────────────────────────────
  function wireSession(session) {
    // Capture the session identity at wire time
    const thisSession = session;

    session.stateChange.addListener((state) => {
      // Ignore Terminated from an OLD session that was already replaced
      if (state === SessionState.Terminated && sessionRef.current !== thisSession) return;

      if (state === SessionState.Established) {
        stopRing();
        S.current.callState("active");
        S.current.incomingSession(null);
        attachMedia(thisSession);
      } else if (state === SessionState.Terminated) {
        playEnd();
        S.current.callState("idle");
        S.current.incomingSession(null);
        sessionRef.current = null;
        clearMedia();
      }
    });
  }

  // ── Start UA ──────────────────────────────────────────────────
  function startUA() {
    if (unmountedRef.current) return;
    const { server, wsServer, extension, password, displayName } = configRef.current;
    if (!server || !extension || !password || !wsServer) return;

    S.current.error(null);
    const uri = UserAgent.makeURI(`sip:${extension}@${server}`);
    if (!uri) { S.current.error("Invalid SIP URI"); return; }

    const ua = new UserAgent({
      uri,
      transportOptions: { server: wsServer, connectionTimeout: 10 },
      authorizationUsername: extension,
      authorizationPassword: password,
      displayName: displayName || extension,
      sessionDescriptionHandlerFactoryOptions: {
        iceGatheringTimeout: 5000,
        peerConnectionConfiguration: {
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        },
      },
      delegate: {
        onInvite(invitation) {
          sessionRef.current = invitation;
          S.current.incomingSession(invitation);
          S.current.callState("incoming");
          playRing();
          wireSession(invitation);
        },
        onDisconnect(err) {
          S.current.registered(false);
          S.current.callState("idle");
          sessionRef.current = null;
          clearMedia();
          if (!unmountedRef.current) {
            S.current.reconnecting(true);
            reconnectTimerRef.current = setTimeout(() => {
              if (!unmountedRef.current) startUA();
            }, RECONNECT_DELAY);
          }
        },
      },
    });

    uaRef.current = ua;
    ua.start()
      .then(() => {
        if (unmountedRef.current) return;
        S.current.reconnecting(false);
        const reg = new Registerer(ua);
        registererRef.current = reg;
        reg.stateChange.addListener((s) => {
          S.current.registered(s === "Registered");
        });
        return reg.register();
      })
      .catch((e) => {
        if (!unmountedRef.current) {
          S.current.error(`Connection failed: ${e.message}`);
          S.current.reconnecting(true);
          reconnectTimerRef.current = setTimeout(() => {
            if (!unmountedRef.current) startUA();
          }, RECONNECT_DELAY);
        }
      });
  }

  useEffect(() => {
    if (!server || !extension || !password || !wsServer) return;
    configRef.current = { server, wsServer, extension, password, displayName };
    unmountedRef.current = false;
    startUA();
    return () => {
      unmountedRef.current = true;
      clearTimeout(reconnectTimerRef.current);
      registererRef.current?.unregister().catch(() => {});
      uaRef.current?.stop().catch(() => {});
      uaRef.current = null;
    };
  }, [server, wsServer, extension, password, displayName]);

  // ── Public API ────────────────────────────────────────────────
  function call(target, withVideo = false) {
    if (!uaRef.current) return;
    const targetURI = UserAgent.makeURI(`sip:${target}@${configRef.current.server}`);
    if (!targetURI) return;

    const inviter = new Inviter(uaRef.current, targetURI, {
      sessionDescriptionHandlerOptions: {
        constraints: { audio: true, video: withVideo },
      },
    });

    sessionRef.current = inviter;
    S.current.callState("ringing");
    wireSession(inviter);

    inviter.invite().catch((e) => {
      playEnd();
      S.current.error(`Call failed: ${e.message}`);
      S.current.callState("idle");
      sessionRef.current = null;
    });
  }

  function answer(withVideo = false) {
    const session = sessionRef.current;
    if (!session) return;

    stopRing();
    S.current.callState("active");
    S.current.incomingSession(null);

    session
      .accept({
        sessionDescriptionHandlerOptions: {
          constraints: { audio: true, video: withVideo },
        },
      })
      .catch((e) => {
        S.current.error(`Answer failed: ${e.message}`);
        S.current.callState("idle");
      });
  }

  function hangup() {
    const s = sessionRef.current;
    if (!s) return;
    playEnd();
    try {
      if (s.state === SessionState.Established) s.bye();
      else { s.cancel?.(); s.reject?.(); }
    } catch (_e) { /* ignore */ }
    S.current.callState("idle");
    sessionRef.current = null;
    S.current.incomingSession(null);
    clearMedia();
  }

  function mute(muted) {
    sessionRef.current?.sessionDescriptionHandler?.peerConnection
      ?.getSenders()
      .forEach((s) => { if (s.track && s.track.kind === "audio") s.track.enabled = !muted; });
  }

  function toggleVideo(disabled) {
    const session = sessionRef.current;
    const pc = session?.sessionDescriptionHandler?.peerConnection;
    if (!pc) return;

    if (disabled) {
      // Stop the video track completely — turns off camera hardware
      pc.getSenders().forEach((sender) => {
        if (sender.track && sender.track.kind === "video") {
          sender.track.stop();
          sender.replaceTrack(null);
        }
      });
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
    } else {
      // Restart camera — get new stream and replace track in peer connection
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: false })
        .then((stream) => {
          const newVideoTrack = stream.getVideoTracks()[0];
          if (!newVideoTrack) return;

          const sender = pc.getSenders().find((s) => s.track === null || (s.track && s.track.kind === "video"));
          if (sender) {
            sender.replaceTrack(newVideoTrack).then(() => {
              if (localVideoRef.current) {
                // Attach new stream to local preview
                const previewStream = new MediaStream([newVideoTrack]);
                localVideoRef.current.srcObject = previewStream;
              }
            });
          }
        })
        .catch(() => {});
    }
  }

  return {
    registered, callState, incomingSession, error, reconnecting,
    localVideoRef, remoteVideoRef, remoteAudioRef,
    call, answer, hangup, mute, toggleVideo,
  };
}

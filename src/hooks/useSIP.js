import { useEffect, useRef, useState } from "react";
import { UserAgent, Registerer, Inviter, SessionState } from "sip.js";

import incomingRingtone from "../assets/ringtones/incoming_call.mp3";
import endCallSound    from "../assets/ringtones/end_call.mp3";

const RECONNECT_DELAY = 3000;
const REGISTRATION_EXPIRES = 600; // 10 minutes (600 seconds)

export function useSIP({ server, wsServer, extension, password, displayName, audioCodecs, videoCodecs }) {
  const [registered,      setRegistered]      = useState(false);
  const [callState,       setCallState]       = useState("idle");
  const [incomingSession, setIncomingSession] = useState(null);
  const [error,           setError]           = useState(null);
  const [held,            setHeld]            = useState(false);
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

  const codecsRef         = useRef({ audioCodecs, videoCodecs });
  useEffect(() => {
    codecsRef.current = { audioCodecs, videoCodecs };
  }, [audioCodecs, videoCodecs]);

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

  // ── Recording ─────────────────────────────────────────────────
  const mediaRecorderRef = useRef(null);
  const recordingChunks  = useRef([]);
  const recordingConfig  = useRef({ enabled: false, directory: "video/recordings/Ksip", uploadApiUrl: "" });
  const directoryHandle  = useRef(null);
  const uploadedFiles    = useRef(new Set()); // Track uploaded files
  const failedUploads    = useRef([]); // Track failed uploads for retry

  function setRecordingConfig(cfg) {
    recordingConfig.current = { ...recordingConfig.current, ...cfg };
  }

  function setDirectoryHandle(handle) {
    directoryHandle.current = handle;
  }

  function startRecording(session) {
    if (!recordingConfig.current.enabled) return;
    const pc = session?.sessionDescriptionHandler?.peerConnection;
    if (!pc) return;

    try {
      // Collect all remote + local tracks into one stream
      const tracks = [];
      pc.getReceivers().forEach((r) => { if (r.track) tracks.push(r.track); });
      pc.getSenders().forEach((s)  => { if (s.track) tracks.push(s.track); });
      if (!tracks.length) return;

      const stream = new MediaStream(tracks);
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      recordingChunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordingChunks.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(recordingChunks.current, { type: mimeType });
        const ext  = mimeType.startsWith("video") ? "webm" : "webm";
        const now  = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const ts   = now.toISOString().replace(/[:.]/g, "-");
        const filename = `${ts}.${ext}`;

        try {
          // Save to local directory
          if (directoryHandle.current) {
            const fileHandle = await directoryHandle.current.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
          } else {
            // Fallback to download
            const dir  = recordingConfig.current.directory || "video/recordings/Ksip";
            const fullPath = `${dir.replace(/[\\/]+$/, "")}/${filename}`;
            const url = URL.createObjectURL(blob);
            const a   = document.createElement("a");
            a.href     = url;
            a.download = fullPath;
            a.click();
            URL.revokeObjectURL(url);
          }

          // Upload to API if URL is configured and file not already uploaded today
          const uploadUrl = recordingConfig.current.uploadApiUrl;
          if (uploadUrl && !uploadedFiles.current.has(dateStr)) {
            await uploadRecording(blob, filename, dateStr, ts, uploadUrl);
          }
        } catch (err) {
          console.error('Failed to save recording:', err);
          // Fallback to download on error
          const dir  = recordingConfig.current.directory || "video/recordings/Ksip";
          const fullPath = `${dir.replace(/[\\/]+$/, "")}/${filename}`;
          const url = URL.createObjectURL(blob);
          const a   = document.createElement("a");
          a.href     = url;
          a.download = fullPath;
          a.click();
          URL.revokeObjectURL(url);
        }
        recordingChunks.current = [];
      };

      recorder.start(1000); // collect chunks every 1s
      mediaRecorderRef.current = recorder;
    } catch { /* recording not supported */ }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  }

  // Upload recording with retry on failure
  async function uploadRecording(blob, filename, dateStr, timestamp, uploadUrl, retryCount = 0) {
    const maxRetries = 3;
    const retryDelay = 5000; // 5 seconds

    try {
      const formData = new FormData();
      formData.append('recording', blob, filename);
      formData.append('date', dateStr);
      formData.append('timestamp', timestamp);
      formData.append('extension', configRef.current.extension || 'unknown');

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        uploadedFiles.current.add(dateStr);
        console.log(`✅ Recording uploaded successfully for ${dateStr}`);
        
        // Remove from failed queue if it was there
        failedUploads.current = failedUploads.current.filter(f => f.dateStr !== dateStr);
      } else {
        throw new Error(`Upload failed with status: ${response.status}`);
      }
    } catch (uploadErr) {
      console.error(`❌ Upload error (attempt ${retryCount + 1}/${maxRetries}):`, uploadErr.message);
      
      // Retry logic
      if (retryCount < maxRetries) {
        console.log(`⏳ Retrying upload in ${retryDelay / 1000} seconds...`);
        setTimeout(() => {
          uploadRecording(blob, filename, dateStr, timestamp, uploadUrl, retryCount + 1);
        }, retryDelay);
      } else {
        // Max retries reached - add to failed queue
        console.error(`❌ Upload failed after ${maxRetries} attempts. Saved to retry queue.`);
        failedUploads.current.push({
          blob,
          filename,
          dateStr,
          timestamp,
          uploadUrl,
          failedAt: new Date().toISOString(),
        });
      }
    }
  }
  function logNegotiatedCodecs(session) {
    try {
      const pc = session?.sessionDescriptionHandler?.peerConnection;
      if (!pc) {
        console.log("📝 Codec Log: PeerConnection not available.");
        return;
      }

      // Parse from SDP
      const localSdp = pc.localDescription?.sdp;
      const remoteSdp = pc.remoteDescription?.sdp;

      const parseCodecs = (sdp) => {
        if (!sdp) return [];
        const matches = sdp.matchAll(/^a=rtpmap:(\d+)\s+([a-zA-Z0-9\-]+)\/(\d+)/gm);
        const codecs = [];
        for (const match of matches) {
          codecs.push(`${match[2]} (${match[3]}Hz, PT=${match[1]})`);
        }
        return [...new Set(codecs)];
      };

      console.log("📞 [useSIP] SDP Negotiated Codecs:");
      console.log("   - Local SDP Codecs:", parseCodecs(localSdp).join(", ") || "None");
      console.log("   - Remote SDP Codecs:", parseCodecs(remoteSdp).join(", ") || "None");

      // Query active stats after a short delay to let traffic flow
      setTimeout(() => {
        if (pc.signalingState === "closed") return;
        pc.getStats().then((stats) => {
          let outboundAudio = "Unknown";
          let inboundAudio = "Unknown";
          
          stats.forEach((report) => {
            if (report.type === "outbound-rtp" && report.kind === "audio") {
              const codec = stats.get(report.codecId);
              if (codec) outboundAudio = `${codec.mimeType} (payloadType=${codec.payloadType})`;
            }
            if (report.type === "inbound-rtp" && report.kind === "audio") {
              const codec = stats.get(report.codecId);
              if (codec) inboundAudio = `${codec.mimeType} (payloadType=${codec.payloadType})`;
            }
          });

          console.log("🎵 [useSIP] Active Audio Codecs (getStats):");
          console.log(`   - Outgoing (Browser -> PBX): ${outboundAudio}`);
          console.log(`   - Incoming (PBX -> Browser): ${inboundAudio}`);
        }).catch((err) => {
          console.error("❌ [useSIP] Failed to get RTCPeerConnection stats:", err);
        });
      }, 1500);

    } catch (err) {
      console.error("❌ [useSIP] Error logging negotiated codecs:", err);
    }
  }

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
        logNegotiatedCodecs(thisSession);
        // Start recording after short delay to ensure tracks are ready
        setTimeout(() => startRecording(thisSession), 500);
      } else if (state === SessionState.Terminated) {
        stopRecording();
        playEnd();
        setHeld(false);
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

    console.log(`[KSIP Log] Connecting to PBX: wsServer=${wsServer}, extension=${extension}`);
    S.current.error(null);
    const uri = UserAgent.makeURI(`sip:${extension}@${server}`);
    if (!uri) {
      console.error(`[KSIP Log] Invalid SIP URI for extension ${extension}@${server}`);
      S.current.error("Invalid SIP URI");
      return;
    }

    const ua = new UserAgent({
      uri,
      transportOptions: { server: wsServer, connectionTimeout: 10 },
      authorizationUsername: extension,
      authorizationPassword: password,
      displayName: displayName || extension,
      sessionDescriptionHandlerFactoryOptions: {
        iceGatheringTimeout: 5000,
        peerConnectionConfiguration: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            {
              urls: [
                "turn:38.60.246.111:3478?transport=udp",
                "turn:38.60.246.111:3478?transport=tcp",
                "turns:38.60.246.111:5349?transport=tcp"
              ],
              username: "Turn_server",
              credential: "K!3jsvteU9UvNKpawJhBPGSS2@V4rd"
            }
          ],
          iceTransportPolicy: "all",
          bundlePolicy: "max-bundle",
          rtcpMuxPolicy: "require"
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
        onDisconnect() {
          console.warn('[KSIP Log] PBX connection disconnected.');
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
        console.log('[KSIP Log] PBX UserAgent started successfully. Registering...');
        S.current.reconnecting(false);
        const reg = new Registerer(ua, {
          expires: REGISTRATION_EXPIRES, // Re-register every 10 minutes
        });
        registererRef.current = reg;
        reg.stateChange.addListener((s) => {
          console.log('[KSIP Log] Registration state changed:', s);
          S.current.registered(s === "Registered");
          
          // If unregistered unexpectedly, try to re-register
          if (s === "Unregistered" && !unmountedRef.current) {
            console.warn('[KSIP Log] Unexpected unregistration, attempting to re-register...');
            setTimeout(() => {
              if (registererRef.current && !unmountedRef.current) {
                registererRef.current.register().catch((err) => {
                  console.error('[KSIP Log] Re-registration failed:', err.message || err);
                  S.current.error(`Re-registration failed: ${err.message}`);
                });
              }
            }, 2000);
          }
        });
        return reg.register();
      })
      .catch((e) => {
        console.error('[KSIP Log] PBX connection error or issue:', e.message || e);
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
      console.log('[KSIP Log] Cleaning up/Disconnecting PBX connection...');
      unmountedRef.current = true;
      clearTimeout(reconnectTimerRef.current);
      registererRef.current?.unregister().catch(() => {});
      uaRef.current?.stop().catch(() => {});
      uaRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server, wsServer, extension, password, displayName]);

  const sdpModifier = (sessionDescription) => {
    const audioCodecsList = codecsRef.current.audioCodecs || ["PCMU", "PCMA"];
    const videoCodecsList = codecsRef.current.videoCodecs || ["VP8", "H264"];
    console.log("📋 SDP BEFORE:", sessionDescription.sdp);
    sessionDescription.sdp = reorderCodecs(sessionDescription.sdp, audioCodecsList, videoCodecsList);
    console.log("📋 SDP AFTER:", sessionDescription.sdp);
    return Promise.resolve(sessionDescription);
  };

  // ── Public API ────────────────────────────────────────────────
  function call(target, withVideo = false) {
    if (!uaRef.current) return;
    const targetURI = UserAgent.makeURI(`sip:${target}@${configRef.current.server}`);
    if (!targetURI) return;

    const inviter = new Inviter(uaRef.current, targetURI, {
      sessionDescriptionHandlerOptions: {
        constraints: { audio: true, video: withVideo },
      },
      sessionDescriptionHandlerModifiers: [sdpModifier]
    });

    sessionRef.current = inviter;
    S.current.callState("ringing");
    wireSession(inviter);

    inviter.invite().catch((e) => {
      console.error('[KSIP Log] Call failed:', e.message || e);
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
        sessionDescriptionHandlerModifiers: [sdpModifier]
      })
      .catch((e) => {
        console.error('[KSIP Log] Answer failed:', e.message || e);
        S.current.error(`Answer failed: ${e.message}`);
        S.current.callState("idle");
      });
  }

  function hangup() {
    const s = sessionRef.current;
    if (!s) return;
    setHeld(false);
    stopRecording();
    playEnd();
    try {
      if (s.state === SessionState.Established) s.bye();
      else { s.cancel?.(); s.reject?.(); }
    } catch { /* ignore */ }
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

  function hold(shouldHold) {
    const session = sessionRef.current;
    if (!session || session.state !== SessionState.Established) return;

    const pc = session.sessionDescriptionHandler?.peerConnection;
    if (!pc) return;

    try {
      pc.getSenders().forEach((sender) => {
        if (sender.track) sender.track.enabled = !shouldHold;
      });
      pc.getReceivers().forEach((receiver) => {
        if (receiver.track) receiver.track.enabled = !shouldHold;
      });
      setHeld(shouldHold);
      console.log(`[KSIP Log] Call ${shouldHold ? "held" : "resumed"}`);
    } catch (err) {
      console.error("[KSIP Log] Hold/resume failed:", err);
    }
  }

  return {
    registered, callState, incomingSession, error, reconnecting, held,
    localVideoRef, remoteVideoRef, remoteAudioRef,
    call, answer, hangup, mute, toggleVideo, hold,
    setRecordingConfig, setDirectoryHandle,
  };
}

function reorderCodecs(sdp, audioCodecs, videoCodecs) {
  // Normalize line endings
  const lines = sdp.split(/\r?\n/);
  const modifiedLines = [];

  let currentMedia = null; // 'audio', 'video', or null
  let mediaLine = null;
  let mediaPayloads = [];

  // Maps payload type (string) -> codec name/description (lowercase)
  let ptToCodec = {
    "0": "pcmu",
    "8": "pcma",
    "9": "g722",
    "18": "g729"
  };

  // We'll collect all rtpmap/fmtp/rtcp-fb lines within the current media section
  // to filter them later based on which payload types are kept.
  let mediaLines = [];

  // Helper to process the media section when it ends or when we hit a new media section
  function flushMediaSection() {
    if (!mediaLine) return;

    const parts = mediaLine.split(" ");
    const allowedCodecs = currentMedia === "audio" ? audioCodecs : videoCodecs;
    const allowedLower = (allowedCodecs || []).map(c => c.toLowerCase());

    const keptPayloads = [];
    const dtmfAndCnPayloads = [];

    // Group our payload types by codec
    const codecToPts = {};
    for (const pt of mediaPayloads) {
      const codec = ptToCodec[pt];
      if (codec) {
        if (!codecToPts[codec]) {
          codecToPts[codec] = [];
        }
        codecToPts[codec].push(pt);
      }
    }

    // Add allowed codecs in their preferred order
    for (const codecName of allowedLower) {
      for (const [sdpCodec, pts] of Object.entries(codecToPts)) {
        if (sdpCodec === codecName || sdpCodec.startsWith(codecName + "/") || sdpCodec.startsWith(codecName + " ")) {
          for (const pt of pts) {
            if (!keptPayloads.includes(pt)) {
              keptPayloads.push(pt);
            }
          }
        }
      }
    }

    // Find telephone-event (DTMF) and comfort noise (CN) to preserve them
    for (const pt of mediaPayloads) {
      const codec = ptToCodec[pt];
      if (codec && (codec.includes("telephone-event") || codec === "cn")) {
        if (!dtmfAndCnPayloads.includes(pt)) {
          dtmfAndCnPayloads.push(pt);
        }
      }
    }

    // If no configured codecs match, fallback to original payloads to avoid completely breaking
    let finalPayloads = keptPayloads.concat(dtmfAndCnPayloads);
    if (finalPayloads.length === 0) {
      finalPayloads = mediaPayloads;
    }

    // Build new m= line
    const newMediaLine = parts.slice(0, 3).concat(finalPayloads).join(" ");
    modifiedLines.push(newMediaLine);

    // Filter the session lines for this media section (like a=rtpmap, a=fmtp, a=rtcp-fb)
    for (const line of mediaLines) {
      const match = line.match(/^a=(rtpmap|fmtp|rtcp-fb):(\d+)\b/i);
      if (match) {
        const pt = match[2];
        if (finalPayloads.includes(pt)) {
          modifiedLines.push(line);
        }
      } else {
        modifiedLines.push(line);
      }
    }

    // Reset for next section
    mediaLine = null;
    mediaPayloads = [];
    mediaLines = [];
    ptToCodec = {
      "0": "pcmu",
      "8": "pcma",
      "9": "g722",
      "18": "g729"
    };
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith("m=")) {
      flushMediaSection();
      const parts = line.split(" ");
      currentMedia = parts[0].substring(2); // 'audio' or 'video'
      mediaLine = line;
      mediaPayloads = parts.slice(3);
    } else if (mediaLine) {
      const rtpmapMatch = line.match(/^a=rtpmap:(\d+)\s+(.+)/i);
      if (rtpmapMatch) {
        const pt = rtpmapMatch[1];
        const codec = rtpmapMatch[2].trim().toLowerCase();
        ptToCodec[pt] = codec;
      }
      mediaLines.push(line);
    } else {
      modifiedLines.push(line);
    }
  }

  flushMediaSection();

  return modifiedLines.join("\r\n") + "\r\n";
}

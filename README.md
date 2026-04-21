# juv-ksip-softphone

A professional, draggable, resizable, transparent React WebRTC SIP softphone component for FreePBX / Asterisk. Supports audio and video calls, incoming call handling, codec selection, and a global `ksipcall` API for triggering calls from anywhere in your app.

**Author:** Kenneth H. Gimpao
---
**Published:**  April 21, 2026

---

## What is this?

`juv-ksip-softphone` is a **React-based WebRTC SIP softphone** designed to be dropped into any existing web application as a transparent floating overlay. It connects to a **FreePBX / Asterisk PBX server** using the SIP protocol over WebSocket (`ws://` or `wss://`) and enables real-time **audio and video calling** directly from the browser — no plugins, no downloads required.

### What is it for?

This component is built for developers who need to add **VoIP calling capabilities** to their existing React web applications without rebuilding their UI from scratch. Common use cases include:

- **Call center dashboards** — agents can make and receive calls directly from their browser-based CRM or ticketing system
- **Customer support portals** — embed a softphone into a helpdesk app so support staff can call customers with one click
- **Dispatch and operations systems** — field coordinators can communicate via audio/video without switching applications
- **Healthcare platforms** — doctors and staff can conduct audio/video consultations from within a patient management system
- **Any web app that needs calling** — simply drop `<Softphone />` into your app and it floats transparently on top

### How does it work?

1. **SIP over WebSocket** — The component connects to your FreePBX/Asterisk server via a WebSocket connection (`ws://` or `wss://`). FreePBX listens on port `8088` (ws) or `8089` (wss) for WebSocket SIP traffic.

2. **WebRTC for media** — Once a call is established, the browser uses WebRTC (built into all modern browsers) to handle the actual audio and video streams. This means no additional software is needed — the browser handles microphone, camera, and speaker access natively.

3. **SIP registration** — On connect, the component registers your extension with the PBX just like a physical desk phone would. Once registered, you can make outgoing calls and receive incoming calls.

4. **Transparent overlay** — The softphone renders as a `position: fixed` transparent layer on top of your existing app. Your app's UI is completely unaffected — the softphone simply floats above it.

5. **Global `ksipcall` API** — A global `window.ksipcall` object is exposed so you can trigger calls from anywhere in your codebase — even from plain JavaScript, Vue, Angular, or any other framework running on the same page.

```
Browser  ──WebSocket──▶  FreePBX/Asterisk  ──SIP──▶  Other Phone/Extension
           (SIP/WS)           (PBX)                    (IP Phone, Softphone)

Browser  ◀──WebRTC──▶  FreePBX/Asterisk  ◀──RTP──▶  Other Phone/Extension
           (Audio/Video)      (Media)                  (Audio/Video Stream)
```

---

## Screenshots

<p align="center">
  <img src="https://raw.githubusercontent.com/kitenebie/SoftPhone-FreePBX/main/src/assets/image_1.png" width="48%" alt="Softphone Settings Panel" />
  <img src="https://raw.githubusercontent.com/kitenebie/SoftPhone-FreePBX/main/src/assets/image_2.png" width="48%" alt="Incoming Call" />
</p>
<p align="center">
  <img src="https://raw.githubusercontent.com/kitenebie/SoftPhone-FreePBX/main/src/assets/image_3.png" width="48%" alt="Video Call" />
  <img src="https://raw.githubusercontent.com/kitenebie/SoftPhone-FreePBX/main/src/assets/image_4.png" width="48%" alt="Dialer Panel" />
</p>

---

## Features

- 🎙 Audio & video calls via WebRTC + SIP (FreePBX / Asterisk)
- 📞 Incoming call notifications with accept/reject
- 🪟 Draggable + resizable floating video panel (expandable to fullscreen)
- 🔢 Draggable dialpad panel
- 💾 Auto-saves config to `localStorage` and auto-connects on reload
- 🔄 Auto-reconnects on WebSocket disconnect
- 🌐 Transparent background — overlays any existing app
- 🎛 Floating messenger-style FAB nav (settings, dialer, opacity)
- 📡 Global `ksipcall` API — trigger calls from plain JS or any framework
- 🔒 ws:// / wss:// protocol selector
- 🎚 Audio & video codec selection
- ⚙ Fully configurable via props and in-app settings panel
- 🔔 Ringtones for incoming and end call

---

## Installation

```bash
npm install juv-ksip-softphone
```

---

## Quick Start

```jsx
import { Softphone } from 'juv-ksip-softphone';
import 'juv-ksip-softphone/styles';

function App() {
  return (
    <>
      <YourExistingApp />
      <Softphone />
    </>
  );
}
```

The softphone renders as a transparent overlay with a floating phone button (top-right). Click it to open the nav menu.

---

## Props

### SIP Connection Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `server` | `string` | `""` | FreePBX server IP or hostname |
| `wsProtocol` | `"ws"` \| `"wss"` | `"ws"` | WebSocket protocol. Use `wss` for HTTPS pages |
| `wsPort` | `string` | `"8088"` | WebSocket port (`8088` for ws, `8089` for wss) |
| `extension` | `string` | `""` | SIP extension number |
| `password` | `string` | `""` | SIP extension password |
| `displayName` | `string` | `""` | Caller ID display name (optional) |

### UI Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `enabledBubble` | `boolean` | `true` | Show or hide the entire softphone bubble |
| `showDialer` | `boolean` | `true` | Show the dialer button in the FAB nav |
| `showSetting` | `boolean` | `true` | Show the settings button in the FAB nav |
| `showOpacity` | `boolean` | `true` | Show the opacity button in the FAB nav |
| `answerwithVideoCall` | `boolean` | `false` | Auto-answer incoming calls with video. Forces `ShowIncomingCallAudio` to `false` |
| `ShowIncomingCallVideoBtn` | `boolean` | `true` | Show the video answer button on incoming calls |
| `ShowIncomingCallAudio` | `boolean` | `true` | Show the audio answer button on incoming calls. Forced `false` when `answerwithVideoCall=true` |

### Priority Order

Props are used as **initial defaults**. If the user has previously saved a config via the settings panel, `localStorage` takes priority. This allows the user to override props from within the app.

---

## Examples

### Basic — manual config via settings panel

```jsx
<Softphone />
```

### Pre-configured — auto-connect on load

```jsx
<Softphone
  server="192.168.1.100"
  wsProtocol="ws"
  wsPort="8088"
  extension="1001"
  password="mypassword"
  displayName="John Doe"
/>
```

### Full configuration

```jsx
<Softphone
  // SIP Connection
  server="192.168.1.100"
  wsProtocol="ws"
  wsPort="8088"
  extension="1001"
  password="mypassword"
  displayName="John Doe"
  // UI
  enabledBubble={true}
  showDialer={true}
  showSetting={true}
  showOpacity={true}
  answerwithVideoCall={false}
  ShowIncomingCallVideoBtn={true}
  ShowIncomingCallAudio={true}
/>
```

### Audio-only mode (no video answer button)

```jsx
<Softphone
  ShowIncomingCallVideoBtn={false}
  ShowIncomingCallAudio={true}
/>
```

### Auto-answer with video

```jsx
<Softphone
  answerwithVideoCall={true}
  // ShowIncomingCallAudio is automatically false
/>
```

### wss:// for HTTPS pages

```jsx
<Softphone
  server="pbx.yourdomain.com"
  wsProtocol="wss"
  wsPort="8089"
  extension="1001"
  password="mypassword"
/>
```

---

## ksipcall API

The `ksipcall` global lets you trigger calls from **anywhere** — plain JavaScript, Vue, Angular, or any other framework.

### Audio Call

```js
ksipcall.audio("123");
```

### Video Call

```js
ksipcall.video("123");
```

### Via window (plain HTML / vanilla JS)

```html
<button onclick="ksipcall.audio('123')">Call Support</button>
<button onclick="ksipcall.video('456')">Video Call</button>
```

### Import in React / other frameworks

```js
import { ksipcall } from 'juv-ksip-softphone';

ksipcall.audio("123");
ksipcall.video("123");
```

---


## Settings Panel

The in-app settings panel (accessible via the ⚙ button) has a **3-column layout**:

### Column 1 — SIP Configuration
| Field | Description | Example |
|---|---|---|
| FreePBX Server IP | IP or hostname | `192.168.1.100` |
| Extension | SIP extension number | `1001` |
| Password | Extension SIP password | `mypassword` |
| Display Name | Caller ID name (optional) | `John Doe` |
| Protocol | `ws://` or `wss://` | `ws://` |
| Port | WebSocket port | `8088` |

### Column 2 — Codecs

**Audio Codecs:** `PCMU`, `PCMA`, `G722`, `G729`, `opus`

**Video Codecs:** `VP8`, `VP9`, `H264`, `H265`, `AV1`

**Opacity:** FAB bubble opacity slider (min 30%)

### Column 3 — UI Preferences

All UI props are configurable as toggles:
- Show Bubble
- Show Dialer Button
- Show Settings Button
- Show Opacity Button
- Answer with Video
- Show Video Answer Button
- Show Audio Answer Button

---

## CDN Usage (Browser)

You can use this package directly in the browser via CDN — no build tools required.

### 1. Include dependencies

```html
<!-- Styles -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/juv-ksip-softphone/dist/juv-ksip-softphone.css">

<!-- React (required peer dependency) -->
<script src="https://cdn.jsdelivr.net/npm/react/umd/react.production.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/react-dom/umd/react-dom.production.min.js"></script>

<!-- Softphone -->
<script src="https://cdn.jsdelivr.net/npm/juv-ksip-softphone/dist/juv-ksip-softphone.umd.cjs"></script>
```

### 2. Mount the softphone

The UMD build exposes `window.JuvKsipSoftphone`. Use `React.createElement` to pass props — the same props documented above apply.

```html
<div id="softphone"></div>

<script>
  const { Softphone } = window.JuvKsipSoftphone;

  const root = ReactDOM.createRoot(document.getElementById('softphone'));
  root.render(
    React.createElement(Softphone, {
      server: "192.168.1.100",
      wsProtocol: "wss",
      wsPort: "8089",
      extension: "1001",
      password: "mypassword",
      displayName: "John Doe"
    })
  );
</script>
```

### 3. Trigger calls via `ksipcall` (CDN)

Once the softphone is mounted, `window.ksipcall` is automatically available:

```html
<button onclick="window.ksipcall.audio('1002')">Audio Call</button>
<button onclick="window.ksipcall.video('1002')">Video Call</button>
```

> **Notes:**
> - React and ReactDOM must be loaded **before** the softphone script.
> - Use `wss://` when your page is served over HTTPS.
> - All props from the [Props](#props) section work the same way via `React.createElement`.

---

## WebSocket Protocol

| Protocol | Port | Use Case |
|---|---|---|
| `ws://` | `8088` | Local network, HTTP pages |
| `wss://` | `8089` | Production, HTTPS pages (requires SSL cert on FreePBX) |

> **Note:** Browsers block `ws://` (insecure) when the page is served over `https://`. Use `wss://` with a valid SSL certificate for production.

---

## FreePBX / Asterisk Requirements

For WebRTC to work, each SIP extension must have these settings:

| Setting | Value |
|---|---|
| `webrtc` | `yes` |
| `use_avpf` | `yes` |
| `media_encryption` | `dtls` |
| `ice_support` | `yes` |
| `bundle` | `yes` |
| `rtcp_mux` | `yes` |
| `dtls_setup` | `actpass` |

### Enable via FreePBX Admin UI

1. **Applications → Extensions → [your extension]**
2. Tab: **Advanced**
3. Set **WebRTC** → `Yes`
4. **Submit → Apply Config**

### Enable via CLI (pjsip.endpoint_custom.conf)

```ini
[1001](+)
webrtc=yes
```

```bash
asterisk -rx "pjsip reload"
```

---

## Floating Nav Controls

| Button | Action |
|---|---|
| 📞 Phone (FAB) | Open / close the nav menu |
| ⊞ Grid | Toggle dialpad panel |
| ⚙ Settings | Toggle settings & SIP config panel |
| ≡ Sliders | Quick opacity adjustment (min 30%) |

---

## localStorage

Config is automatically saved under the key `sip_softphone_config` and restored on next page load, including:
- SIP credentials (server, extension, password, display name)
- WebSocket protocol and port
- Selected audio/video codecs
- UI preferences (all toggle states)

> `enabledBubble` and `showSetting` are **never saved** to localStorage — they are always controlled by props.


---

## Author

**Kenneth H. Gimpao**
Published: 2026

**GitHub Repository:** [https://github.com/kitenebie/SoftPhone-FreePBX](https://github.com/kitenebie/SoftPhone-FreePBX)

**NPM Package:** [https://www.npmjs.com/package/juv-ksip-softphone](https://www.npmjs.com/package/juv-ksip-softphone)
---

## License

MIT

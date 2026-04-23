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
<p align="center">
  <img src="https://raw.githubusercontent.com/kitenebie/SoftPhone-FreePBX/main/src/assets/image_5.png" width="48%" alt="FullScreen Panel" />
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

### Recording Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `autoRecord` | `boolean` | `false` | Enable automatic recording of all calls |
| `recordingDir` | `string` | `"video/recordings/Ksip"` | Directory path for saved recordings |
| `uploadApiUrl` | `string` | `""` | API endpoint URL for uploading recordings (optional) |

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

### 1. Include scripts

```html
<!-- Styles -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/juv-ksip-softphone@1.0.35/dist/juv-ksip-softphone.css">

<!-- Softphone — fully self-contained, no other scripts needed -->
<script src="https://cdn.jsdelivr.net/npm/juv-ksip-softphone@1.0.35/dist/juv-ksip-softphone.cdn.js"></script>
```

### 2. Mount the softphone

The CDN build exposes `window.JuvKsipSoftphone` with `Softphone`, `createRoot`, and `ksipcall` all included.

```html
<div id="softphone"></div>

<script>
  const { Softphone, createRoot, createElement } = window.JuvKsipSoftphone;
  createRoot(document.getElementById('softphone')).render(
    createElement(Softphone, {
      server: "192.168.1.100",
      wsProtocol: "ws",
      wsPort: "8088",
      extension: "1001",
      password: "mypassword",
      displayName: "John Doe"
    })
  );
</script>
```

### Minimal (zero-config — use the settings panel)

```html
<div id="softphone"></div>

<script>
  const { Softphone, createRoot, createElement } = window.JuvKsipSoftphone;
  createRoot(document.getElementById('softphone')).render(
    createElement(Softphone)
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
> - No React or ReactDOM scripts needed — everything is bundled in `juv-ksip-softphone.cdn.js`.
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

# Auto Recording Feature

## Overview
The softphone now supports automatic recording of audio and video calls with configurable save directory.

## Features
- ✅ Auto-record toggle in settings panel
- ✅ Configurable recording directory
- ✅ Saves as WebM format (video/webm or audio/webm)
- ✅ Automatic download after call ends
- ✅ Filename format: `{directory}_{timestamp}.webm`
- ✅ Props support for default configuration
- ✅ localStorage persistence

## Props

### `autoRecord` (boolean)
- **Default:** `false`
- **Description:** Enable automatic recording of all calls
- **Example:**
```jsx
<Softphone autoRecord={true} />
```

### `recordingDir` (string)
- **Default:** `"video/recordings/Ksip"`
- **Description:** Directory path for saved recordings (browser will suggest this path in download dialog)
- **Example:**
```jsx
<Softphone 
  autoRecord={true}
  recordingDir="video/recordings/Ksip"
/>
```

## Settings Panel

### Toggle
- **Location:** Settings → UI Preferences → "Auto Record Calls"
- **Behavior:** Enable/disable automatic recording

### Directory Input
- **Location:** Appears below toggle when auto-record is enabled
- **Placeholder:** "video/recordings/Ksip"
- **Default:** "video/recordings/Ksip"
- **Note:** Browser downloads use this as suggested filename path. Actual folder creation depends on browser settings.

## How It Works

1. **Directory Selection:** When auto-record is enabled for the first time, a modal appears asking to select a directory
2. **Browser Permission:** User selects a folder using the File System Access API (Chrome/Edge)
3. **Recording Start:** When a call is established (state = "active"), recording starts automatically if enabled
4. **Recording Stop:** When call ends (state = "idle"), recording stops and saves directly to the selected directory
5. **File Format:** WebM container with VP8/Opus codecs (or fallback to audio-only)
6. **File Naming:** `{ISO-timestamp}.webm`
   - Example: `2024-04-21T14-30-45-123Z.webm`
7. **Persistent Access:** Browser remembers the directory permission for future recordings

## Technical Details

### MediaRecorder API
- Uses browser's native MediaRecorder API
- Captures both local and remote audio/video tracks
- Collects chunks every 1 second
- Creates downloadable blob on stop

### Codec Support
- **Preferred:** `video/webm;codecs=vp8,opus`
- **Fallback 1:** `video/webm`
- **Fallback 2:** `audio/webm`

### Browser Compatibility
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Limited (may require polyfill)

## Usage Examples

### Basic Usage
```jsx
<Softphone autoRecord={true} />
```

### Custom Directory
```jsx
<Softphone 
  autoRecord={true}
  recordingDir="video/recordings/Ksip"
/>
```

### Full Configuration
```jsx
<Softphone
  server="192.168.1.100"
  extension="1001"
  password="secret"
  autoRecord={true}
  recordingDir="video/recordings/Ksip"
/>
```

### Runtime Toggle
Users can enable/disable recording via the settings panel without reloading the page.

## Storage

Settings are saved to `localStorage` under key `sip_softphone_config`:
```json
{
  "autoRecord": true,
  "recordingDir": "video/recordings/Ksip",
  ...
}
```

## Notes

- **File System Access API** (Chrome/Edge 86+, Opera):
  - Modal prompts user to select directory on first use
  - Files save directly to selected folder without download prompts
  - Browser remembers permission (persists across sessions)
  - User can revoke permission in browser settings

- **Fallback for unsupported browsers** (Firefox, Safari):
  - Uses traditional download method
  - Files download to default Downloads folder
  - No automatic directory creation

- **Security:**
  - User must explicitly grant directory access
  - Permission can be revoked anytime
  - No access to files outside selected directory

- File size depends on call duration and quality
- WebM format is widely supported and efficient
- To convert to MP3, use external tools like FFmpeg:
  ```bash
  ffmpeg -i recording.webm -vn -ar 44100 -ac 2 -b:a 192k output.mp3
  ```


---

# Laravel Backend Example for Recording Uploads

This guide shows how to create a Laravel API endpoint to receive and store call recordings from the softphone.

## 1. Create Migration

```bash
php artisan make:migration create_call_recordings_table
```

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('call_recordings', function (Blueprint $table) {
            $table->id();
            $table->string('extension')->nullable();
            $table->string('filename');
            $table->string('file_path');
            $table->date('recording_date');
            $table->string('timestamp');
            $table->bigInteger('file_size')->nullable();
            $table->string('mime_type')->nullable();
            $table->boolean('uploaded_successfully')->default(true);
            $table->timestamps();
            
            $table->index('recording_date');
            $table->index('extension');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('call_recordings');
    }
};
```

```bash
php artisan migrate
```

## 2. Create Model

```bash
php artisan make:model CallRecording
```

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CallRecording extends Model
{
    protected $fillable = [
        'extension',
        'filename',
        'file_path',
        'recording_date',
        'timestamp',
        'file_size',
        'mime_type',
        'uploaded_successfully',
    ];

    protected $casts = [
        'recording_date' => 'date',
        'uploaded_successfully' => 'boolean',
    ];
}
```

## 3. Create Controller

```bash
php artisan make:controller Api/CallRecordingController
```

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CallRecording;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class CallRecordingController extends Controller
{
    public function upload(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'recording' => 'required|file|mimes:webm,mp4,avi|max:102400', // 100MB max
            'date' => 'required|date',
            'timestamp' => 'required|string',
            'extension' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $file = $request->file('recording');
            $date = $request->input('date');
            $timestamp = $request->input('timestamp');
            $extension = $request->input('extension', 'unknown');

            // Check if recording for this date already exists
            $existingRecording = CallRecording::where('recording_date', $date)
                ->where('extension', $extension)
                ->first();

            if ($existingRecording) {
                return response()->json([
                    'success' => true,
                    'message' => 'Recording already exists for this date',
                    'data' => $existingRecording
                ], 200);
            }

            // Create directory structure: recordings/{year}/{month}/{extension}/
            $year = date('Y', strtotime($date));
            $month = date('m', strtotime($date));
            $directory = "recordings/{$year}/{$month}/{$extension}";

            // Store file in public storage
            $filename = $timestamp . '.' . $file->getClientOriginalExtension();
            $filePath = $file->storeAs($directory, $filename, 'public');

            // Save to database
            $recording = CallRecording::create([
                'extension' => $extension,
                'filename' => $filename,
                'file_path' => $filePath,
                'recording_date' => $date,
                'timestamp' => $timestamp,
                'file_size' => $file->getSize(),
                'mime_type' => $file->getMimeType(),
                'uploaded_successfully' => true,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Recording uploaded successfully',
                'data' => $recording
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Upload failed: ' . $e->getMessage()
            ], 500);
        }
    }

    public function index(Request $request)
    {
        $query = CallRecording::query();

        // Filter by date range
        if ($request->has('start_date')) {
            $query->where('recording_date', '>=', $request->start_date);
        }
        if ($request->has('end_date')) {
            $query->where('recording_date', '<=', $request->end_date);
        }

        // Filter by extension
        if ($request->has('extension')) {
            $query->where('extension', $request->extension);
        }

        $recordings = $query->orderBy('recording_date', 'desc')
            ->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $recordings
        ]);
    }

    public function show($id)
    {
        $recording = CallRecording::findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $recording
        ]);
    }

    public function download($id)
    {
        $recording = CallRecording::findOrFail($id);

        if (!Storage::disk('public')->exists($recording->file_path)) {
            return response()->json([
                'success' => false,
                'message' => 'File not found'
            ], 404);
        }

        return Storage::disk('public')->download($recording->file_path, $recording->filename);
    }

    public function delete($id)
    {
        $recording = CallRecording::findOrFail($id);

        // Delete file from storage
        if (Storage::disk('public')->exists($recording->file_path)) {
            Storage::disk('public')->delete($recording->file_path);
        }

        // Delete database record
        $recording->delete();

        return response()->json([
            'success' => true,
            'message' => 'Recording deleted successfully'
        ]);
    }
}
```

## 4. Add Routes

In `routes/api.php`:

```php
<?php

use App\Http\Controllers\Api\CallRecordingController;
use Illuminate\Support\Facades\Route;

Route::prefix('recordings')->group(function () {
    Route::post('/upload', [CallRecordingController::class, 'upload']);
    Route::get('/', [CallRecordingController::class, 'index']);
    Route::get('/{id}', [CallRecordingController::class, 'show']);
    Route::get('/{id}/download', [CallRecordingController::class, 'download']);
    Route::delete('/{id}', [CallRecordingController::class, 'delete']);
});
```

## 5. Configure CORS (if needed)

In `config/cors.php`:

```php
<?php

return [
    'paths' => ['api/*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => ['*'], // Change to your frontend URL in production
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];
```

## 6. Create Storage Link

```bash
php artisan storage:link
```

This creates a symbolic link from `public/storage` to `storage/app/public`.

## 7. Usage in Softphone

Configure the softphone with your API URL:

```jsx
<Softphone
  autoRecord={true}
  recordingDir="video/recordings/Ksip"
  uploadApiUrl="https://your-domain.com/api/recordings/upload"
/>
```

Or set it in the settings panel:
- Upload API URL: `https://your-domain.com/api/recordings/upload`

## 8. API Endpoints

### Upload Recording
```
POST /api/recordings/upload
Content-Type: multipart/form-data

Body:
- recording: File (webm)
- date: String (YYYY-MM-DD)
- timestamp: String (ISO timestamp)
- extension: String (SIP extension number)
```

### List Recordings
```
GET /api/recordings?start_date=2024-01-01&end_date=2024-12-31&extension=1001
```

### Get Single Recording
```
GET /api/recordings/{id}
```

### Download Recording
```
GET /api/recordings/{id}/download
```

### Delete Recording
```
DELETE /api/recordings/{id}
```

## 9. File Storage Structure

Files are stored in:
```
storage/app/public/recordings/{year}/{month}/{extension}/{timestamp}.webm
```

Example:
```
storage/app/public/recordings/2024/04/1001/2024-04-21T14-30-45-123Z.webm
```

Accessible via:
```
https://your-domain.com/storage/recordings/2024/04/1001/2024-04-21T14-30-45-123Z.webm
```

## 10. Security Considerations

### Add Authentication (Optional)

```php
// In routes/api.php
Route::middleware('auth:sanctum')->prefix('recordings')->group(function () {
    Route::post('/upload', [CallRecordingController::class, 'upload']);
    // ... other routes
});
```

### Validate File Size in .env

```env
UPLOAD_MAX_FILESIZE=100M
POST_MAX_SIZE=100M
```

### Add Rate Limiting

```php
// In app/Http/Kernel.php
protected $middlewareGroups = [
    'api' => [
        'throttle:60,1', // 60 requests per minute
        // ...
    ],
];
```

## 11. Testing

```bash
# Test upload
curl -X POST https://your-domain.com/api/recordings/upload \
  -F "recording=@test.webm" \
  -F "date=2024-04-21" \
  -F "timestamp=2024-04-21T14-30-45-123Z" \
  -F "extension=1001"

# List recordings
curl https://your-domain.com/api/recordings

# Download recording
curl https://your-domain.com/api/recordings/1/download -o recording.webm
```

## 12. Database Queries

```php
// Get today's recordings
$today = CallRecording::whereDate('recording_date', today())->get();

// Get recordings by extension
$recordings = CallRecording::where('extension', '1001')->get();

// Get recordings for date range
$recordings = CallRecording::whereBetween('recording_date', ['2024-01-01', '2024-12-31'])->get();

// Get total storage used
$totalSize = CallRecording::sum('file_size');
```

## Notes

- Files are automatically organized by year/month/extension
- Duplicate uploads for the same date are prevented
- All files are stored in `storage/app/public/recordings/`
- Database tracks all metadata for easy querying
- Files can be accessed via public URL after `storage:link`


---
## Author

**Kenneth H. Gimpao**
Published: 2026

**GitHub Repository:** [https://github.com/kitenebie/SoftPhone-FreePBX](https://github.com/kitenebie/SoftPhone-FreePBX)

**NPM Package:** [https://www.npmjs.com/package/juv-ksip-softphone](https://www.npmjs.com/package/juv-ksip-softphone)
---

## License

MIT

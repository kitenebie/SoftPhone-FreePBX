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

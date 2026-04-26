# Changelog

All notable changes to this project will be documented in this file.

## [1.0.48] - 2024-12-XX

### Added
- **Connection Monitoring**: Automatic SIP re-registration every 10 minutes to maintain active connection
- **Disconnect Detection**: Immediate detection when WebSocket connection is lost
- **Auto-reconnect**: Attempts to reconnect every 3 seconds when connection is lost
- **Unexpected Unregistration Handling**: Automatically attempts to re-register if server rejects registration
- **Long-running Session Support**: Maintains connection health even after hours of being connected without page reload
- **Keyboard Shortcut**: `Ctrl + Shift + K` to toggle settings panel (works even when bubble is hidden)
- **Status Toast Enhancement**: Always visible even when bubble is hidden, accessible via keyboard shortcut
- **Console Logging**: Added detailed logs for registration state changes and re-registration attempts

### Changed
- **localStorage Persistence**: `enabledBubble` state now saves to localStorage immediately on toggle
- **Settings Modal**: Now accessible via keyboard shortcut even when bubble is hidden
- **Registration Expiry**: Changed from default (3600s) to 600 seconds (10 minutes) for more frequent keepalive

### Fixed
- Fixed issue where `enabledBubble` toggle didn't persist to localStorage
- Fixed keyboard shortcut not working (now accepts both uppercase 'K' and lowercase 'k')
- Fixed settings modal not appearing when bubble is hidden
- Fixed status toast not showing when bubble is disabled

### Documentation
- Added comprehensive connection monitoring section to README.md
- Added example scenario for server failure detection
- Updated index.html with connection monitoring details
- Created PUBLISH_GUIDE.md for NPM publishing workflow

## [1.0.47] - 2024-XX-XX

### Added
- Auto-recording feature with File System Access API
- API upload support with retry mechanism
- Recording directory configuration
- Failed upload queue tracking
- Duplicate prevention (once per day upload)

### Changed
- Updated settings panel with recording options
- Enhanced localStorage to include recording settings

## [1.0.35] - 2024-XX-XX

### Added
- Initial release
- Audio & video calls via WebRTC + SIP
- Incoming call notifications
- Draggable + resizable video panel
- Draggable dialpad panel
- Auto-save config to localStorage
- Auto-reconnect on disconnect
- Global `ksipcall` API
- Codec selection (audio & video)
- Settings panel with 3-column layout
- CDN support for browser usage

---

## Version Format

This project follows [Semantic Versioning](https://semver.org/):
- **MAJOR.MINOR.PATCH** (e.g., 1.0.48)
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

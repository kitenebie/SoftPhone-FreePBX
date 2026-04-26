# NPM Publishing Guide

## Version 1.0.48 - New Features

### What's New:
- ✅ **Connection Monitoring**: Automatic re-registration every 10 minutes
- ✅ **Robust Disconnect Detection**: Immediate detection when server goes down
- ✅ **Auto-reconnect**: Retry every 3 seconds when connection is lost
- ✅ **Unexpected Unregistration Handling**: Auto re-register on server rejection
- ✅ **Status Toast**: Always visible even when bubble is hidden
- ✅ **Keyboard Shortcut**: Ctrl+Shift+K to toggle settings
- ✅ **localStorage Persistence**: enabledBubble now saved to localStorage
- ✅ **Long-running Session Support**: Maintains connection health after hours without reload

---

## Pre-Publishing Checklist

### 1. Verify Changes
- [x] Connection monitoring implemented (10-min re-registration)
- [x] Status toast always visible
- [x] Keyboard shortcut working (Ctrl+Shift+K)
- [x] localStorage saving enabledBubble
- [x] Documentation updated (README.md + index.html)
- [x] Version bumped to 1.0.48

### 2. Test Build
```bash
cd d:\Softphone-react
npm run build:lib
npm run build:cdn
```

### 3. Verify Build Output
Check that these files exist:
- `dist/juv-ksip-softphone.js`
- `dist/juv-ksip-softphone.umd.js`
- `dist/juv-ksip-softphone.css`
- `dist/juv-ksip-softphone.cdn.js`

---

## Publishing Steps

### Step 1: Login to NPM
```bash
npm login
```
Enter your credentials:
- Username: `your-npm-username`
- Password: `your-npm-password`
- Email: `your-email@example.com`
- OTP (if 2FA enabled): `123456`

### Step 2: Build the Package
```bash
npm run build:lib
npm run build:cdn
```

### Step 3: Test Package Locally (Optional)
```bash
npm pack
```
This creates `juv-ksip-softphone-1.0.48.tgz` for testing.

### Step 4: Publish to NPM
```bash
npm publish
```

### Step 5: Verify Publication
Visit: https://www.npmjs.com/package/juv-ksip-softphone

Check that version 1.0.48 is live.

---

## Post-Publishing

### 1. Update CDN Links in Documentation
Update README.md and index.html CDN links from:
```html
https://cdn.jsdelivr.net/npm/juv-ksip-softphone@1.0.35/dist/...
```
To:
```html
https://cdn.jsdelivr.net/npm/juv-ksip-softphone@1.0.48/dist/...
```

### 2. Create Git Tag
```bash
git add .
git commit -m "Release v1.0.48 - Connection monitoring and status toast improvements"
git tag v1.0.48
git push origin main
git push origin v1.0.48
```

### 3. Create GitHub Release
Go to: https://github.com/kitenebie/SoftPhone-FreePBX/releases/new

**Tag:** v1.0.48  
**Title:** v1.0.48 - Connection Monitoring & Status Toast Improvements

**Description:**
```markdown
## 🎉 What's New in v1.0.48

### Connection Monitoring
- ✅ Automatic SIP re-registration every 10 minutes
- ✅ Immediate disconnect detection when server goes down
- ✅ Auto-reconnect with 3-second retry interval
- ✅ Unexpected unregistration handling with auto re-register
- ✅ Long-running session support (maintains connection after hours without reload)

### UI Improvements
- ✅ Status toast always visible even when bubble is hidden
- ✅ Keyboard shortcut: Ctrl+Shift+K to toggle settings panel
- ✅ enabledBubble state now persists to localStorage

### Bug Fixes
- 🐛 Fixed issue where bubble toggle didn't save to localStorage
- 🐛 Fixed keyboard shortcut not working (now accepts both K and k)
- 🐛 Fixed settings modal not appearing when bubble is hidden

### Documentation
- 📚 Added comprehensive connection monitoring documentation
- 📚 Updated README.md with status toast behavior
- 📚 Added example scenarios for server failure detection

## Installation

```bash
npm install juv-ksip-softphone@1.0.48
```

## CDN Usage

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/juv-ksip-softphone@1.0.48/dist/juv-ksip-softphone.css">
<script src="https://cdn.jsdelivr.net/npm/juv-ksip-softphone@1.0.48/dist/juv-ksip-softphone.cdn.js"></script>
```

## Full Changelog
See [CHANGELOG.md](./CHANGELOG.md) for complete details.
```

---

## Troubleshooting

### Error: "You do not have permission to publish"
```bash
npm whoami  # Check logged in user
npm login   # Re-login
```

### Error: "Version already exists"
Update version in package.json:
```bash
npm version patch  # 1.0.48 -> 1.0.49
```

### Error: "prepublishOnly script failed"
Check build errors:
```bash
npm run build:lib
npm run build:cdn
```

---

## Quick Publish Command (All-in-One)

```bash
# Build, test, and publish
npm run build:lib && npm run build:cdn && npm publish
```

---

## Rollback (If Needed)

If you need to unpublish (within 72 hours):
```bash
npm unpublish juv-ksip-softphone@1.0.48
```

**Note:** Unpublishing is discouraged. Use deprecation instead:
```bash
npm deprecate juv-ksip-softphone@1.0.48 "Use version 1.0.49 instead"
```

---

## Success Checklist

After publishing, verify:
- [ ] Package visible on npmjs.com
- [ ] CDN files accessible via jsdelivr.net
- [ ] Installation works: `npm install juv-ksip-softphone@1.0.48`
- [ ] GitHub release created
- [ ] Git tag pushed
- [ ] Documentation updated

---

**Ready to publish? Run:**
```bash
npm publish
```

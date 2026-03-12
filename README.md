# ActiveBharat — Android App

> **React Native + Expo** mobile application for real-time athletic analysis. Uses Vision Camera and native C++ Frame Processors for Phase 2 Edge AI at 60 FPS.

---

## Quick Config

**Before running the app**, set your backend host in `src/constants.js`:

```js
export const BACKEND_HOST = '192.168.1.100'; // ← your Wi-Fi IP (run `ipconfig`)
```

---

## Architecture

```
activebharat-android/
├── App.js                         ← Root navigator
├── src/
│   ├── constants.js               ← Backend host/port config (edit this!)
│   ├── services/
│   │   └── api.js                 ← HTTP + WebSocket API layer
│   ├── screens/
│   │   ├── HomeScreen.js
│   │   ├── HubScreen.js
│   │   ├── TrainScreen.js         ← V1: HTTP JPEG frame analysis (Expo Go)
│   │   ├── TrainScreenPhase2.js   ← Phase 2: 60fps WebSocket Edge AI (native build)
│   │   ├── LeaderboardScreen.js
│   │   └── ProfileScreen.js
│   └── components/
├── android/
│   └── app/src/main/
│       ├── java/com/activebharat/
│       │   ├── MediaPipeFrameProcessorPlugin.java  ← Vision Camera JNI bridge
│       │   └── MediaPipeFrameProcessorPluginPackage.java
│       └── cpp/
│           └── MediaPipeFrameProcessorPlugin.cpp   ← C++ GPU MediaPipe inference
├── app.json
└── package.json
```

### Two Training Modes

| Mode | Screen | Build | Frame Rate |
|------|--------|-------|-----------|
| **V1 HTTP** | `TrainScreen.js` | Expo Go ✅ | ~0.25 FPS |
| **Phase 2 Edge AI** | `TrainScreenPhase2.js` | Native build (Android Studio) | 60 FPS |

---

## Setup and Running

### V1 (Expo Go — works immediately)

```bash
# 1. Install dependencies
npm install

# 2. Edit backend host
# open src/constants.js and set BACKEND_HOST to your Wi-Fi IP

# 3. Start
npx expo start

# 4. Scan QR with Expo Go app on your phone
```

### Phase 2 Edge AI (Native Android Build)

Phase 2 requires compiling C++ native modules. You need Android Studio + Android NDK.

```bash
# 1. Ensure your device is connected (USB debugging on) or emulator running
adb devices

# 2. Compile and install
npx expo run:android
```

The app will compile the C++ MediaPipe frame processor and install directly onto your device.

---

## API Flow

```
Android App
  │
  ├─ V1:  POST http://BACKEND_HOST:8083/session/{id}/frame  (JPEG over HTTP)
  │          ↓
  │       activebharat-frontend (proxy) → activebharat-backend (MediaPipe)
  │
  └─ Phase 2:  WS ws://BACKEND_HOST:8082/session/{id}/live-stream
                  (528-byte float array at 60 FPS — no image transfer!)
                  ↓
               activebharat-backend (Phase-Space kinematics direct)
```

---

## Phase 2 Edge AI — How It Works

1. **Vision Camera** captures frames at 60 FPS
2. **C++ Frame Processor** (`MediaPipeFrameProcessorPlugin.cpp`) runs MediaPipe GPU inference natively — extracts 33 3D landmarks
3. **Java Worklet** (`MediaPipeFrameProcessorPlugin.java`) marshalls 132 floats (528 bytes) across the JNI bridge with zero JS thread blocking
4. **WebSocket** streams the coordinate array directly to the backend
5. **Backend** (`activebharat-backend`) computes Mahalanobis Distance, Quaternion Torsion, Dimensionless Jerk
6. **Result** sent back over the same WebSocket, updates the `TrainScreenPhase2.js` UI

---

## Environment

```js
// src/constants.js — the ONLY place you need to edit
export const BACKEND_HOST = '192.168.x.x';  // your Wi-Fi IP
export const PROXY_PORT   = 8083;            // frontend proxy
export const FASTAPI_PORT = 8082;            // direct backend (Phase 2 WS)
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| App can't connect to backend | Check `BACKEND_HOST` in `src/constants.js`; ensure phone and PC are on same Wi-Fi |
| `METRO_BUNDLER` error | Run `npx expo start --clear` |
| Phase 2 compile fails | Ensure Android NDK is installed in Android Studio → SDK Manager |
| `adb devices` shows nothing | Enable USB Debugging in phone Developer Options |

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `expo` | Base Expo SDK |
| `react-native` | Cross-platform UI |
| `react-native-vision-camera` | Native camera with frame processors |
| `react-native-worklets-core` | C++ worklet thread for zero-latency processing |
| `expo-camera` | V1 fallback camera (Expo Go compatible) |

// On-device form quality classifier (DEFERRED).
// -----------------------------------------------------------------------------
// Intended to bundle the same MLP that runs on the backend
// (pose_classifier.tflite, 18-feature → 4-class) so the camera HUD keeps
// scoring reps when the network drops mid-session.
//
// Status: BLOCKED. The library we'd use (react-native-fast-tflite v3) loads
// through react-native-nitro-modules, which requires React Native's New
// Architecture (TurboModules / Fabric). Expo SDK 54 ships with the new
// architecture *off* by default and turning it on touches every native
// module — Reanimated, expo-camera, navigation, etc. — and demands a full
// regression pass on a real device.
//
// Until that flip happens, this module is a safe no-op:
//   - isReady() always returns false
//   - classifyForm() always returns null (callers fall through to backend)
//   - loadModel() resolves but does nothing
// All runtime crashes from the missing NitroModule are avoided because we
// never actually require('react-native-fast-tflite') at module load.
//
// To re-enable when New Architecture is ready:
//   1. Set "newArchEnabled": true in app.json + Gradle build args
//   2. Rebuild the APK
//   3. Replace this whole file with the code in commit 0b67976 (the version
//      that actually loads the model via loadTensorflowModel + run([input]))

let _ready = false
const _loadError = new Error(
    'on-device classifier disabled — react-native-fast-tflite v3 needs new architecture'
)

export function isReady() {
    return _ready
}

export function getLoadError() {
    return _loadError.message
}

export async function waitUntilReady() {
    return false
}

export async function loadModel() {
    return false
}

export async function classifyForm(_frame, _sport = 'vertical_jump') {
    // No-op until the New Architecture flip lands.
    return null
}

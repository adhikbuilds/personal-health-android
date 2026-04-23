// VisionTrainCamera — drop-in replacement for expo-camera's CameraView in
// the Train flow. Exposes the same `takePictureAsync({ quality }) → { base64 }`
// surface so TrainScreen can switch transports via a feature flag without
// touching the capture loop.
//
// react-native-vision-camera + nitro-image are LAZILY required inside this
// module so a missing native registration (e.g. CameraFactory HybridObject
// not yet wired into MainApplication.kt) fails the require — TrainScreen
// catches the error and falls back to expo-camera. The installed APK has
// the .so files but VC v5 needs an explicit Nitrogen init that we haven't
// added to MainApplication yet — that's the next on-device step.
//
// Internally:
//   - useCameraDevice('back') picks the back lens
//   - usePhotoOutput() configures a mid-resolution JPEG output
//   - capturePhoto → photo.saveToTemporaryFileAsync → FileSystem read base64
//   - photo + temp file are disposed/deleted to avoid leaking memory/disk

import React, { forwardRef, useImperativeHandle, useEffect } from 'react'
import { View } from 'react-native'

let VC = null
try {
    VC = require('react-native-vision-camera')
} catch (e) {
    VC = null
}

let FS = null
try {
    FS = require('expo-file-system')
} catch (_) {
    FS = null
}

if (!VC || !FS) {
    // Export a stub so any caller that bypassed the feature flag still
    // gets a graceful fallback object instead of a runtime crash.
    const Stub = forwardRef(function VisionTrainCameraStub({ style }, ref) {
        useImperativeHandle(ref, () => ({
            async takePictureAsync() { return null },
        }), [])
        return <View style={style} />
    })
    module.exports = Stub
    module.exports.default = Stub
} else {

const { Camera, useCameraDevice, useCameraPermission, usePhotoOutput } = VC

const VisionTrainCamera = forwardRef(function VisionTrainCamera(
    { style, isActive = true },
    ref,
) {
    const device = useCameraDevice('back')
    const { hasPermission, requestPermission } = useCameraPermission()
    // 1280×720 is enough for pose detection + keeps JPEGs ≈80–150KB so the
    // WebSocket transport stays snappy.
    const photoOutput = usePhotoOutput({
        targetResolution: { width: 1280, height: 720 },
        quality: 0.6,
        qualityPrioritization: 'speed',
    })

    useEffect(() => {
        if (!hasPermission) {
            requestPermission().catch(() => {})
        }
    }, [hasPermission, requestPermission])

    useImperativeHandle(ref, () => ({
        // Same shape as expo-camera's takePictureAsync — TrainScreen reads
        // result.base64 either way.
        async takePictureAsync(_opts = {}) {
            try {
                const photo = await photoOutput.capturePhoto({}, {})
                let tempPath
                try {
                    tempPath = await photo.saveToTemporaryFileAsync()
                } finally {
                    try { photo.dispose() } catch (_) {}
                }
                const uri = tempPath.startsWith('file://') ? tempPath : `file://${tempPath}`
                const base64 = await FS.readAsStringAsync(uri, {
                    encoding: FS.EncodingType.Base64,
                })
                FS.deleteAsync(uri, { idempotent: true }).catch(() => {})
                return { base64, uri }
            } catch (e) {
                if (__DEV__) console.warn('[VisionTrainCamera] capture failed:', e?.message)
                return null
            }
        },
    }), [photoOutput])

    if (!device || !hasPermission) {
        return <View style={style} />
    }
    return (
        <Camera
            style={style}
            device={device}
            isActive={isActive}
            outputs={[photoOutput]}
        />
    )
})

module.exports = VisionTrainCamera
module.exports.default = VisionTrainCamera

}

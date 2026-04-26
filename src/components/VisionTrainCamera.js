// VisionTrainCamera — VisionCamera v5 wrapper for TrainScreen video streaming.
// Uses takeSnapshot() for fast preview-buffer capture at 10fps.
// Falls back gracefully if native side isn't initialized.

import React, { useRef, useImperativeHandle, forwardRef, useEffect } from 'react'
import { View, StyleSheet } from 'react-native'

let VCCamera = null
let useCameraDevice = null
let useCameraPermission = null

try {
    const vc = require('react-native-vision-camera')
    VCCamera = vc.Camera
    useCameraDevice = vc.useCameraDevice
    useCameraPermission = vc.useCameraPermission
} catch (e) {
    console.warn('[VisionTrainCamera] react-native-vision-camera not available:', e?.message)
}

let FS = null
try {
    FS = require('expo-file-system')
} catch (_) {}

function base64ToArrayBuffer(b64) {
    const bin = global.atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return bytes.buffer
}

if (!VCCamera || !useCameraDevice || !FS) {
    const Stub = forwardRef(function VisionTrainCameraStub({ style }, ref) {
        useImperativeHandle(ref, () => ({
            async takePictureAsync() { return null },
            async takeSnapshotBinary() { return null },
        }), [])
        return <View style={style} />
    })
    module.exports = Stub
    module.exports.default = Stub
} else {

const VisionTrainCamera = forwardRef(function VisionTrainCamera(
    { style, isActive = true },
    ref,
) {
    const cameraRef = useRef(null)
    const device = useCameraDevice('back')
    const { hasPermission, requestPermission } = useCameraPermission()

    useEffect(() => {
        if (!hasPermission) requestPermission().catch(() => {})
    }, [hasPermission, requestPermission])

    useImperativeHandle(ref, () => ({
        async takePictureAsync(_opts = {}) {
            if (!cameraRef.current) return null
            try {
                const snapshot = await cameraRef.current.takeSnapshot({ quality: 50 })
                const path = snapshot.path || snapshot.uri
                if (!path) { snapshot.dispose?.(); return null }
                const fileUri = path.startsWith('file://') ? path : `file://${path}`
                const b64 = await FS.readAsStringAsync(fileUri, {
                    encoding: FS.EncodingType.Base64,
                })
                try { await FS.deleteAsync(fileUri, { idempotent: true }) } catch (_) {}
                snapshot.dispose?.()
                return { base64: b64, uri: fileUri }
            } catch (e) {
                if (__DEV__) console.warn('[VisionTrainCamera] takePictureAsync failed:', e?.message)
                return null
            }
        },

        async takeSnapshotBinary() {
            if (!cameraRef.current) return null
            try {
                const snapshot = await cameraRef.current.takeSnapshot({ quality: 50 })
                const path = snapshot.path || snapshot.uri
                if (!path) { snapshot.dispose?.(); return null }
                const fileUri = path.startsWith('file://') ? path : `file://${path}`
                const b64 = await FS.readAsStringAsync(fileUri, {
                    encoding: FS.EncodingType.Base64,
                })
                try { await FS.deleteAsync(fileUri, { idempotent: true }) } catch (_) {}
                snapshot.dispose?.()
                return base64ToArrayBuffer(b64)
            } catch (e) {
                if (__DEV__) console.warn('[VisionTrainCamera] takeSnapshotBinary failed:', e?.message)
                return null
            }
        },
    }), [])

    if (!device || !hasPermission) return <View style={style} />

    return (
        <VCCamera
            ref={cameraRef}
            style={style || StyleSheet.absoluteFill}
            device={device}
            isActive={isActive}
            photo={true}
            video={false}
            audio={false}
        />
    )
})

module.exports = VisionTrainCamera
module.exports.default = VisionTrainCamera

}

package com.activebharat.app.rppg

import android.util.Log
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import okhttp3.*
import org.json.JSONObject
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger

class RPPGStreamModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "RPPGStream"
        private const val TARGET_FPS = 30
        private const val FRAME_INTERVAL_MS = 1000L / TARGET_FPS
    }

    override fun getName() = "RPPGStream"

    private val executor = Executors.newSingleThreadExecutor()
    private val okClient = OkHttpClient.Builder()
        .readTimeout(30, TimeUnit.SECONDS)
        .pingInterval(15, TimeUnit.SECONDS)
        .build()

    private var cameraProvider: ProcessCameraProvider? = null
    private var webSocket: WebSocket? = null
    private var camera: Camera? = null
    private val isStreaming = AtomicBoolean(false)
    private val sampleCount = AtomicInteger(0)

    @ReactMethod
    fun start(sessionId: String, wsUrl: String, promise: Promise) {
        if (isStreaming.get()) {
            promise.reject("ALREADY_STREAMING", "rPPG stream already active")
            return
        }

        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No current activity")
            return
        }

        sampleCount.set(0)

        val request = Request.Builder().url(wsUrl).build()
        webSocket = okClient.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(ws: WebSocket, response: Response) {
                Log.i(TAG, "WS connected: $sessionId")
                emitEvent("onRPPGStatus", Arguments.createMap().apply {
                    putString("status", "ws_connected")
                })
            }

            override fun onMessage(ws: WebSocket, text: String) {
                try {
                    val json = JSONObject(text)
                    val params = Arguments.createMap().apply {
                        putDouble("bpm", json.optDouble("bpm", 0.0))
                        putDouble("hrv_ms", json.optDouble("hrv_ms", 0.0))
                        putString("signal_quality", json.optString("signal_quality", ""))
                        putString("status", json.optString("status", ""))
                        putString("message", json.optString("message", ""))
                        putBoolean("face_detected", json.optBoolean("face_detected", false))
                        putDouble("snr", json.optDouble("snr", 0.0))
                        putInt("frames_in_window", json.optInt("frames_in_window", 0))
                        putBoolean("artifact_detected", json.optBoolean("artifact_detected", false))

                        val wfArr = json.optJSONArray("waveform")
                        if (wfArr != null) {
                            val wf = Arguments.createArray()
                            for (i in 0 until wfArr.length()) {
                                wf.pushDouble(wfArr.optDouble(i, 0.0))
                            }
                            putArray("waveform", wf)
                        }

                        val zone = json.optJSONObject("zone")
                        if (zone != null) {
                            val zm = Arguments.createMap().apply {
                                putString("zone", zone.optString("zone", "unknown"))
                                putInt("index", zone.optInt("index", 0))
                                putString("color", zone.optString("color", "#64748b"))
                            }
                            putMap("zone", zm)
                        }
                    }
                    emitEvent("onRPPGResult", params)
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to parse WS message: ${e.message}")
                }
            }

            override fun onFailure(ws: WebSocket, t: Throwable, response: Response?) {
                Log.e(TAG, "WS failed: ${t.message}")
                emitEvent("onRPPGError", Arguments.createMap().apply {
                    putString("error", t.message ?: "WebSocket connection failed")
                })
                stopInternal()
            }

            override fun onClosed(ws: WebSocket, code: Int, reason: String) {
                Log.i(TAG, "WS closed: $code $reason")
                stopInternal()
            }
        })

        val cameraProviderFuture = ProcessCameraProvider.getInstance(activity)
        cameraProviderFuture.addListener({
            try {
                cameraProvider = cameraProviderFuture.get()

                val imageAnalysis = ImageAnalysis.Builder()
                    .setTargetResolution(android.util.Size(320, 240))
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_YUV_420_888)
                    .build()

                var lastCaptureMs = 0L

                imageAnalysis.setAnalyzer(executor) { imageProxy ->
                    if (!isStreaming.get()) {
                        imageProxy.close()
                        return@setAnalyzer
                    }

                    val now = System.currentTimeMillis()
                    if (now - lastCaptureMs < FRAME_INTERVAL_MS) {
                        imageProxy.close()
                        return@setAnalyzer
                    }
                    lastCaptureMs = now

                    try {
                        val rgb = extractMeanRGB(imageProxy)
                        val ts = now / 1000.0

                        val payload = JSONObject().apply {
                            put("r", rgb[0].toDouble())
                            put("g", rgb[1].toDouble())
                            put("b", rgb[2].toDouble())
                            put("ts", ts)
                        }
                        webSocket?.send(payload.toString())
                        sampleCount.incrementAndGet()
                    } catch (e: Exception) {
                        Log.w(TAG, "Frame processing error: ${e.message}")
                    } finally {
                        imageProxy.close()
                    }
                }

                val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

                cameraProvider!!.unbindAll()
                camera = cameraProvider!!.bindToLifecycle(
                    activity as LifecycleOwner,
                    cameraSelector,
                    imageAnalysis
                )

                camera?.cameraControl?.enableTorch(true)

                isStreaming.set(true)
                promise.resolve(true)

                emitEvent("onRPPGStatus", Arguments.createMap().apply {
                    putString("status", "streaming")
                })
            } catch (e: Exception) {
                Log.e(TAG, "Camera setup failed: ${e.message}")
                promise.reject("CAMERA_ERROR", e.message)
            }
        }, ContextCompat.getMainExecutor(activity))
    }

    @ReactMethod
    fun stop(promise: Promise) {
        stopInternal()
        promise.resolve(true)
    }

    @ReactMethod
    fun getSampleCount(promise: Promise) {
        promise.resolve(sampleCount.get())
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}

    private fun stopInternal() {
        isStreaming.set(false)
        try { camera?.cameraControl?.enableTorch(false) } catch (_: Exception) {}
        try { cameraProvider?.unbindAll() } catch (_: Exception) {}
        try { webSocket?.close(1000, "stopped") } catch (_: Exception) {}
        camera = null
        cameraProvider = null
        webSocket = null
    }

    private fun emitEvent(name: String, params: WritableMap) {
        try {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(name, params)
        } catch (_: Exception) {}
    }

    private fun extractMeanRGB(image: ImageProxy): FloatArray {
        val planes = image.planes
        val yBuffer = planes[0].buffer
        val uBuffer = planes[1].buffer
        val vBuffer = planes[2].buffer

        val yRowStride = planes[0].rowStride
        val uvRowStride = planes[1].rowStride
        val uvPixelStride = planes[1].pixelStride

        val w = image.width
        val h = image.height

        val x0 = w / 4; val x1 = w * 3 / 4
        val y0 = h / 4; val y1 = h * 3 / 4

        var rSum = 0.0; var gSum = 0.0; var bSum = 0.0; var count = 0

        var y = y0
        while (y < y1) {
            var x = x0
            while (x < x1) {
                val yVal = (yBuffer.get(y * yRowStride + x).toInt() and 0xFF).toFloat()
                val uvIdx = (y / 2) * uvRowStride + (x / 2) * uvPixelStride
                val uVal = (uBuffer.get(uvIdx).toInt() and 0xFF).toFloat() - 128f
                val vVal = (vBuffer.get(uvIdx).toInt() and 0xFF).toFloat() - 128f

                rSum += yVal + 1.402f * vVal
                gSum += yVal - 0.344136f * uVal - 0.714136f * vVal
                bSum += yVal + 1.772f * uVal
                count++

                x += 4
            }
            y += 4
        }

        return floatArrayOf(
            (rSum / count).toFloat().coerceIn(0f, 255f),
            (gSum / count).toFloat().coerceIn(0f, 255f),
            (bSum / count).toFloat().coerceIn(0f, 255f)
        )
    }
}

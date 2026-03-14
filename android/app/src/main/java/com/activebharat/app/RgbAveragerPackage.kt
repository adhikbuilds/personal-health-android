package com.activebharat.app

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.mrousavy.camera.frameprocessors.FrameProcessorPluginRegistry

class RgbAveragerPackage : ReactPackage {

    companion object {
        init {
            // Register the frame processor plugin under the name "getAverageRGB"
            // This name is what you call from JS: getAverageRGB(frame)
            FrameProcessorPluginRegistry.addFrameProcessorPlugin("getAverageRGB") { proxy, options ->
                RgbAveragerPlugin(proxy, options)
            }
        }
    }

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        emptyList()

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}

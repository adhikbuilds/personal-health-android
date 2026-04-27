# React Native Reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# OkHttp (used by native rPPG module)
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**

# CameraX
-keep class androidx.camera.** { *; }

# Vision Camera
-keep class com.mrousavy.camera.** { *; }

# Expo modules
-keep class expo.modules.** { *; }

# Hermes
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# TensorFlow Lite
-keep class org.tensorflow.** { *; }
-dontwarn org.tensorflow.**

# NitroModules
-keep class com.margelo.nitro.** { *; }

# Keep native module names
-keep class com.activebharat.app.rppg.** { *; }

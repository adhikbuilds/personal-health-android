const IS_PROD = process.env.APP_ENV === 'production';
const IS_STAGING = process.env.APP_ENV === 'staging';

const getBackendHost = () => {
  if (IS_PROD) return process.env.BACKEND_HOST || 'api.activebharat.in';
  if (IS_STAGING) return process.env.BACKEND_HOST || 'staging-api.activebharat.in';
  // Honour BACKEND_HOST in dev too: on a physical device 'localhost' resolves
  // to the phone itself, so LAN testing needs the machine's IP here (or
  // `adb reverse tcp:8082 tcp:8082`).
  return process.env.BACKEND_HOST || 'localhost';
};

const backendHost = getBackendHost();
const backendPort = IS_PROD || IS_STAGING ? '' : ':8082';
const protocol = IS_PROD || IS_STAGING ? 'https' : 'http';
const wsProtocol = IS_PROD || IS_STAGING ? 'wss' : 'ws';

export default {
  expo: {
    name: "Personal Health",
    slug: "personal-health",
    // Deep-link scheme (personalhealth://…). Previously only declared in the
    // inert app.json, so it never reached the build.
    scheme: "personalhealth",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#000000"
    },
    assetBundlePatterns: ["**/*", "assets/**"],
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.activebharat.app"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#000000"
      },
      package: "com.activebharat.app",
      // Must stay in sync with android/app/src/main/AndroidManifest.xml — that
      // file is committed, so a prebuild is not what puts these on the device.
      permissions: [
        "android.permission.CAMERA",
        "android.permission.INTERNET",
        "android.permission.VIBRATE",
        // expo-camera records audio alongside video
        "android.permission.RECORD_AUDIO",
        // MapScreen calls Location.requestForegroundPermissionsAsync()
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        // notifications.js schedules reminders that must survive a reboot
        "android.permission.RECEIVE_BOOT_COMPLETED"
      ],
      softwareKeyboardLayoutMode: "pan",
      usesCleartextTraffic: !IS_PROD && !IS_STAGING
    },
    plugins: [
      ["expo-camera", {
        cameraPermission: "Personal Health uses your camera for real-time AI form analysis during training sessions."
      }],
      "expo-asset",
      "expo-font"
    ],
    extra: {
      backendHost,
      backendPort,
      apiBase: `${protocol}://${backendHost}${backendPort}`,
      wsBase: `${wsProtocol}://${backendHost}${backendPort}`,
      appEnv: process.env.APP_ENV || 'dev'
    }
  }
};

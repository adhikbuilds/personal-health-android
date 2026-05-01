const IS_PROD = process.env.APP_ENV === 'production';
const IS_STAGING = process.env.APP_ENV === 'staging';

const getBackendHost = () => {
  if (IS_PROD) return process.env.BACKEND_HOST || 'api.activebharat.in';
  if (IS_STAGING) return process.env.BACKEND_HOST || 'staging-api.activebharat.in';
  return 'localhost';
};

const backendHost = getBackendHost();
const backendPort = IS_PROD || IS_STAGING ? '' : ':8082';
const protocol = IS_PROD || IS_STAGING ? 'https' : 'http';
const wsProtocol = IS_PROD || IS_STAGING ? 'wss' : 'ws';

export default {
  expo: {
    name: "ActiveBharat",
    slug: "activebharat",
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
      permissions: [
        "android.permission.CAMERA",
        "android.permission.INTERNET",
        "android.permission.VIBRATE"
      ],
      softwareKeyboardLayoutMode: "pan",
      usesCleartextTraffic: !IS_PROD && !IS_STAGING
    },
    plugins: [
      ["expo-camera", {
        cameraPermission: "ActiveBharat uses your camera for real-time AI form analysis during training sessions."
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

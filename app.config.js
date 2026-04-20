const IS_DEV = process.env.APP_VARIANT === "development";
const IS_PREVIEW = process.env.APP_VARIANT === "preview";

const getAppName = () => {
  if (IS_DEV) return "Bluma Dev";
  if (IS_PREVIEW) return "Bluma Preview";
  return "Bluma";
};

const getPackageName = () => {
  if (IS_DEV) return "health.bluma.dev";
  if (IS_PREVIEW) return "health.bluma.preview";
  return "health.bluma";
};

export default {
  expo: {
    name: getAppName(),
    slug: "bluma",
    version: "1.7.2",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "bluma",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
    },
    android: {
      versionCode: 12,
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#FFFFFF",
      },
      permissions: [
        "NOTIFICATIONS",
        "POST_NOTIFICATIONS",
        "USE_BIOMETRIC",
        "USE_FINGERPRINT",
        "USE_FACE_ID",
        "VIBRATE",
      ],
      package: getPackageName(),
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#FFFFFF",
        },
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/images/notification-icon.png",
          color: "#4B61C7",
        },
      ],
      "expo-sqlite",
      "expo-font",
      "expo-localization",
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "d97f3696-146b-411f-8de5-905014cb7622",
      },
    },
  },
};

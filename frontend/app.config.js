// Injects configured AdMob app IDs from environment variables.
module.exports = ({ config }) => {
  const isProduction = process.env.EAS_BUILD_PROFILE === "production" || process.env.NODE_ENV === "production";
  const configuredAndroidAppId = process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID;
  if (isProduction && !configuredAndroidAppId) {
    throw new Error("Set EXPO_PUBLIC_ADMOB_ANDROID_APP_ID before creating an Android production build.");
  }
  const androidAppId = configuredAndroidAppId || "ca-app-pub-3940256099942544~3347511713";
  config.plugins = config.plugins.map((p) =>
    Array.isArray(p) && p[0] === "react-native-google-mobile-ads"
      ? [p[0], { ...p[1], androidAppId }]
      : p,
  );
  return config;
};

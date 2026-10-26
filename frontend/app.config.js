// Injects configured AdMob app IDs from environment variables.
module.exports = ({ config }) => {
  const configuredAndroidAppId = process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID;
  // Kingdom Quest's AdMob app ID. EAS environment configuration can override it.
  const androidAppId = configuredAndroidAppId || "ca-app-pub-9761067758707256~5003208291";
  config.plugins = config.plugins.map((p) =>
    Array.isArray(p) && p[0] === "react-native-google-mobile-ads"
      ? [p[0], { ...p[1], androidAppId }]
      : p,
  );
  return config;
};

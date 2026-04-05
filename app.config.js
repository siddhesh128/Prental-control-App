module.exports = {
  expo: {
    name: 'Parental Control',
    slug: 'parental-control',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.parentalcontrol.app',
      googleServicesFile: './GoogleService-Info.plist',
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_IOS_API_KEY,
        googleSignIn: {
          reservedClientId: process.env.GOOGLE_IOS_CLIENT_ID,
        },
      },
    },
    android: {
      package: 'com.parentalcontrol.app',
      googleServicesFile: './google-services.json',
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY,
        },
      },
      permissions: [
        'INTERNET',
        'READ_CALL_LOG',
        'READ_CONTACTS',
        'READ_SMS',
        'ACCESS_COARSE_LOCATION',
        'ACCESS_FINE_LOCATION',
        'ACCESS_BACKGROUND_LOCATION',
      ],
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 220,
          resizeMode: 'contain',
          backgroundColor: '#0B1B36',
        },
      ],
      ...(process.env.EXPO_USE_DEV_CLIENT === 'true' ? ['expo-dev-client'] : []),
    ],
    scheme: 'parentalcontrol',
    extra: {
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.FIREBASE_APP_ID,
      googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID,
      googleIosClientId: process.env.GOOGLE_IOS_CLIENT_ID,
      googleAndroidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID,
      eas: {
        projectId: 'your-project-id',
      },
    },
    experiments: {
      tsconfigPaths: true,
    },
    newArchEnabled: true,
  },
};

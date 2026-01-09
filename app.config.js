module.exports = {
    expo: {
        name: "time-tracking",
        slug: "time-tracking",
        version: "1.0.0",
        orientation: "portrait",
        icon: "./assets/icon.png",
        userInterfaceStyle: "automatic",
        newArchEnabled: true,
        splash: {
            image: "./assets/splash-icon.png",
            resizeMode: "contain",
            backgroundColor: "#000000"
        },
        ios: {
            supportsTablet: true
        },
        android: {
            adaptiveIcon: {
                foregroundImage: "./assets/adaptive-icon.png",
                monochromeImage: "./assets/adaptive-icon.png"
            },
            edgeToEdgeEnabled: true,
            predictiveBackGestureEnabled: true,
            package: "de.killi199.timetracking",
            permissions: ["android.permission.NFC"],
            config: {
                googleMaps: {
                    apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
                }
            }
        },
        plugins: [
            "./plugins/withNfcIntent",
            "expo-sqlite",
            [
                "expo-location",
                {
                    isAndroidBackgroundLocationEnabled: true
                }
            ]
        ]
    }
};

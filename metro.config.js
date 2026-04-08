// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const isFOSS = process.env.EXPO_PUBLIC_FOSS_BUILD !== 'false';

if (isFOSS) {
    config.resolver.sourceExts = ['foss.ts', 'foss.tsx', ...config.resolver.sourceExts];
}

module.exports = config;

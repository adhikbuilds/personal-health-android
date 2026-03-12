// metro.config.js — minimal config (no custom middleware)
// The API proxy is handled by proxy-server.js (run separately: node proxy-server.js)
const { getDefaultConfig } = require('expo/metro-config');
module.exports = getDefaultConfig(__dirname);

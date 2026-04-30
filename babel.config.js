module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            // Required by react-native-vision-camera frame processors and
            // react-native-worklets-core. Must come before reanimated if
            // both are present.
            'react-native-worklets-core/plugin',
        ],
    };
};

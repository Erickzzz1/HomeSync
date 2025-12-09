module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module:react-native-dotenv', {
        moduleName: '@env',
        path: '.env',
        blacklist: null,
        whitelist: null,
        safe: false,
        allowUndefined: true,
        // Asegurar que las variables se incluyan en el build
        envName: 'APP_ENV',
        verbose: false
      }]
    ]
  };
};


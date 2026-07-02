const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);
config.resolver.alias = {
  ...(config.resolver.alias ?? {}),
  "@": path.resolve(__dirname)
};
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "zustand/middleware") {
    return {
      filePath: path.resolve(__dirname, "node_modules/zustand/middleware.js"),
      type: "sourceFile"
    };
  }

  return context.resolveRequest(context, moduleName, platform);
};
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  "@": path.resolve(__dirname)
};

module.exports = withNativeWind(config, { input: "./global.css" });

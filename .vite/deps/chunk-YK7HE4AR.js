import {
  AppKit,
  PACKAGE_VERSION
} from "./chunk-WE5HSB7U.js";
import {
  CoreHelperUtil
} from "./chunk-RMWTWYKC.js";

// node_modules/@reown/appkit/dist/esm/exports/index.js
function createAppKit(options) {
  return new AppKit({
    ...options,
    sdkVersion: CoreHelperUtil.generateSdkVersion(options.adapters ?? [], "html", PACKAGE_VERSION)
  });
}

export {
  createAppKit
};
//# sourceMappingURL=chunk-YK7HE4AR.js.map

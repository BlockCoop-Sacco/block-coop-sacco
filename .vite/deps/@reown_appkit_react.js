import "./chunk-Q7THQXID.js";
import {
  require_react
} from "./chunk-OKOAXSIJ.js";
import {
  AppKit,
  DEFAULT_METHODS,
  PACKAGE_VERSION,
  WcConstantsUtil,
  WcHelpersUtil
} from "./chunk-WE5HSB7U.js";
import "./chunk-UZMN552P.js";
import "./chunk-VOPCLWV4.js";
import "./chunk-GTWEFYSC.js";
import {
  ProviderUtil
} from "./chunk-XYQLHURO.js";
import {
  AccountController,
  AlertController,
  AssetController,
  AssetUtil,
  ChainController,
  ConnectionController,
  ConnectionControllerUtil,
  ConnectorController,
  ConstantsUtil,
  CoreHelperUtil,
  OptionsController,
  StorageUtil,
  a,
  p,
  snapshot,
  subscribe,
  w
} from "./chunk-RMWTWYKC.js";
import "./chunk-JLS7QRTL.js";
import "./chunk-H25E2Z3P.js";
import "./chunk-D2SILJEM.js";
import "./chunk-VTHNKRVG.js";
import "./chunk-366LDVMV.js";
import "./chunk-DLLXCMBA.js";
import "./chunk-D6VRBZP6.js";
import "./chunk-OMO2FGGE.js";
import "./chunk-IW7JHH32.js";
import "./chunk-OZTVGCGN.js";
import "./chunk-OFXHVVVC.js";
import "./chunk-F7YG2VMH.js";
import "./chunk-SM5OAV2N.js";
import "./chunk-5XBGTDLQ.js";
import "./chunk-Y5VHFJ5N.js";
import {
  __commonJS,
  __toESM
} from "./chunk-OS7ZSSJM.js";

// node_modules/use-sync-external-store/cjs/use-sync-external-store-shim.development.js
var require_use_sync_external_store_shim_development = __commonJS({
  "node_modules/use-sync-external-store/cjs/use-sync-external-store-shim.development.js"(exports) {
    "use strict";
    if (true) {
      (function() {
        "use strict";
        if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart === "function") {
          __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(new Error());
        }
        var React = require_react();
        var ReactSharedInternals = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
        function error(format) {
          {
            {
              for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
                args[_key2 - 1] = arguments[_key2];
              }
              printWarning("error", format, args);
            }
          }
        }
        function printWarning(level, format, args) {
          {
            var ReactDebugCurrentFrame = ReactSharedInternals.ReactDebugCurrentFrame;
            var stack = ReactDebugCurrentFrame.getStackAddendum();
            if (stack !== "") {
              format += "%s";
              args = args.concat([stack]);
            }
            var argsWithFormat = args.map(function(item) {
              return String(item);
            });
            argsWithFormat.unshift("Warning: " + format);
            Function.prototype.apply.call(console[level], console, argsWithFormat);
          }
        }
        function is(x, y) {
          return x === y && (x !== 0 || 1 / x === 1 / y) || x !== x && y !== y;
        }
        var objectIs = typeof Object.is === "function" ? Object.is : is;
        var useState2 = React.useState, useEffect3 = React.useEffect, useLayoutEffect = React.useLayoutEffect, useDebugValue2 = React.useDebugValue;
        var didWarnOld18Alpha = false;
        var didWarnUncachedGetSnapshot = false;
        function useSyncExternalStore3(subscribe2, getSnapshot, getServerSnapshot) {
          {
            if (!didWarnOld18Alpha) {
              if (React.startTransition !== void 0) {
                didWarnOld18Alpha = true;
                error("You are using an outdated, pre-release alpha of React 18 that does not support useSyncExternalStore. The use-sync-external-store shim will not work correctly. Upgrade to a newer pre-release.");
              }
            }
          }
          var value = getSnapshot();
          {
            if (!didWarnUncachedGetSnapshot) {
              var cachedValue = getSnapshot();
              if (!objectIs(value, cachedValue)) {
                error("The result of getSnapshot should be cached to avoid an infinite loop");
                didWarnUncachedGetSnapshot = true;
              }
            }
          }
          var _useState = useState2({
            inst: {
              value,
              getSnapshot
            }
          }), inst = _useState[0].inst, forceUpdate = _useState[1];
          useLayoutEffect(function() {
            inst.value = value;
            inst.getSnapshot = getSnapshot;
            if (checkIfSnapshotChanged(inst)) {
              forceUpdate({
                inst
              });
            }
          }, [subscribe2, value, getSnapshot]);
          useEffect3(function() {
            if (checkIfSnapshotChanged(inst)) {
              forceUpdate({
                inst
              });
            }
            var handleStoreChange = function() {
              if (checkIfSnapshotChanged(inst)) {
                forceUpdate({
                  inst
                });
              }
            };
            return subscribe2(handleStoreChange);
          }, [subscribe2]);
          useDebugValue2(value);
          return value;
        }
        function checkIfSnapshotChanged(inst) {
          var latestGetSnapshot = inst.getSnapshot;
          var prevValue = inst.value;
          try {
            var nextValue = latestGetSnapshot();
            return !objectIs(prevValue, nextValue);
          } catch (error2) {
            return true;
          }
        }
        function useSyncExternalStore$1(subscribe2, getSnapshot, getServerSnapshot) {
          return getSnapshot();
        }
        var canUseDOM = !!(typeof window !== "undefined" && typeof window.document !== "undefined" && typeof window.document.createElement !== "undefined");
        var isServerEnvironment = !canUseDOM;
        var shim = isServerEnvironment ? useSyncExternalStore$1 : useSyncExternalStore3;
        var useSyncExternalStore$2 = React.useSyncExternalStore !== void 0 ? React.useSyncExternalStore : shim;
        exports.useSyncExternalStore = useSyncExternalStore$2;
        if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop === "function") {
          __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(new Error());
        }
      })();
    }
  }
});

// node_modules/use-sync-external-store/shim/index.js
var require_shim = __commonJS({
  "node_modules/use-sync-external-store/shim/index.js"(exports, module) {
    "use strict";
    if (false) {
      module.exports = null;
    } else {
      module.exports = require_use_sync_external_store_shim_development();
    }
  }
});

// node_modules/@reown/appkit-controllers/dist/esm/exports/react.js
var import_react2 = __toESM(require_react());

// node_modules/valtio/esm/react.mjs
var import_react = __toESM(require_react(), 1);
var import_shim = __toESM(require_shim(), 1);
var { use } = import_react.default;
var { useSyncExternalStore } = import_shim.default;
var useAffectedDebugValue = (state, affected) => {
  const pathList = (0, import_react.useRef)();
  (0, import_react.useEffect)(() => {
    pathList.current = w(state, affected, true);
  });
  (0, import_react.useDebugValue)(pathList.current);
};
var targetCache = /* @__PURE__ */ new WeakMap();
function useSnapshot(proxyObject, options) {
  const notifyInSync = options == null ? void 0 : options.sync;
  const lastSnapshot = (0, import_react.useRef)();
  const lastAffected = (0, import_react.useRef)();
  let inRender = true;
  const currSnapshot = useSyncExternalStore(
    (0, import_react.useCallback)(
      (callback) => {
        const unsub = subscribe(proxyObject, callback, notifyInSync);
        callback();
        return unsub;
      },
      [proxyObject, notifyInSync]
    ),
    () => {
      const nextSnapshot = snapshot(proxyObject, use);
      try {
        if (!inRender && lastSnapshot.current && lastAffected.current && !p(
          lastSnapshot.current,
          nextSnapshot,
          lastAffected.current,
          /* @__PURE__ */ new WeakMap()
        )) {
          return lastSnapshot.current;
        }
      } catch (e) {
      }
      return nextSnapshot;
    },
    () => snapshot(proxyObject, use)
  );
  inRender = false;
  const currAffected = /* @__PURE__ */ new WeakMap();
  (0, import_react.useEffect)(() => {
    lastSnapshot.current = currSnapshot;
    lastAffected.current = currAffected;
  });
  if ((import.meta.env ? import.meta.env.MODE : void 0) !== "production") {
    useAffectedDebugValue(currSnapshot, currAffected);
  }
  const proxyCache = (0, import_react.useMemo)(() => /* @__PURE__ */ new WeakMap(), []);
  return a(
    currSnapshot,
    currAffected,
    proxyCache,
    targetCache
  );
}

// node_modules/@reown/appkit-controllers/dist/esm/exports/react.js
function useAppKitNetworkCore() {
  const { activeCaipNetwork } = useSnapshot(ChainController.state);
  return {
    caipNetwork: activeCaipNetwork,
    chainId: activeCaipNetwork == null ? void 0 : activeCaipNetwork.id,
    caipNetworkId: activeCaipNetwork == null ? void 0 : activeCaipNetwork.caipNetworkId
  };
}
function useAppKitAccount(options) {
  var _a;
  const state = useSnapshot(ChainController.state);
  const { activeConnectorIds } = useSnapshot(ConnectorController.state);
  const chainNamespace = (options == null ? void 0 : options.namespace) || state.activeChain;
  if (!chainNamespace) {
    return {
      allAccounts: [],
      address: void 0,
      caipAddress: void 0,
      status: void 0,
      isConnected: false,
      embeddedWalletInfo: void 0
    };
  }
  const chainAccountState = (_a = state.chains.get(chainNamespace)) == null ? void 0 : _a.accountState;
  const authConnector = ConnectorController.getAuthConnector(chainNamespace);
  const activeConnectorId = activeConnectorIds[chainNamespace];
  const connections = ConnectionController.getConnections(chainNamespace);
  const allAccounts = connections.flatMap((connection) => connection.accounts.map(({ address }) => CoreHelperUtil.createAccount(chainNamespace, address, "eoa")));
  return {
    allAccounts,
    caipAddress: chainAccountState == null ? void 0 : chainAccountState.caipAddress,
    address: CoreHelperUtil.getPlainAddress(chainAccountState == null ? void 0 : chainAccountState.caipAddress),
    isConnected: Boolean(chainAccountState == null ? void 0 : chainAccountState.caipAddress),
    status: chainAccountState == null ? void 0 : chainAccountState.status,
    embeddedWalletInfo: authConnector && activeConnectorId === ConstantsUtil.CONNECTOR_ID.AUTH ? {
      user: (chainAccountState == null ? void 0 : chainAccountState.user) ? {
        ...chainAccountState.user,
        /*
         * Getting the username from the chain controller works well for social logins,
         * but Farcaster uses a different connection flow and doesn’t emit the username via events.
         * Since the username is stored in local storage before the chain controller updates,
         * it’s safe to use the local storage value here.
         */
        username: StorageUtil.getConnectedSocialUsername()
      } : void 0,
      authProvider: (chainAccountState == null ? void 0 : chainAccountState.socialProvider) || "email",
      accountType: chainAccountState == null ? void 0 : chainAccountState.preferredAccountType,
      isSmartAccountDeployed: Boolean(chainAccountState == null ? void 0 : chainAccountState.smartAccountDeployed)
    } : void 0
  };
}
function useDisconnect() {
  async function disconnect(props) {
    await ConnectionController.disconnect(props);
  }
  return { disconnect };
}
function useAppKitConnections(namespace) {
  useSnapshot(ConnectionController.state);
  useSnapshot(ConnectorController.state);
  useSnapshot(AssetController.state);
  const { activeChain } = useSnapshot(ChainController.state);
  const { remoteFeatures } = useSnapshot(OptionsController.state);
  const chainNamespace = namespace ?? activeChain;
  const isMultiWalletEnabled = Boolean(remoteFeatures == null ? void 0 : remoteFeatures.multiWallet);
  if (!chainNamespace) {
    throw new Error("No namespace found");
  }
  if (!isMultiWalletEnabled) {
    AlertController.open(ConstantsUtil.REMOTE_FEATURES_ALERTS.MULTI_WALLET_NOT_ENABLED.CONNECTIONS_HOOK, "info");
    return {
      connections: [],
      recentConnections: []
    };
  }
  const { connections, recentConnections } = ConnectionControllerUtil.getConnectionsData(chainNamespace);
  const formatConnection = (0, import_react2.useCallback)((connection) => {
    const connector = ConnectorController.getConnectorById(connection.connectorId);
    const name = ConnectorController.getConnectorName(connector == null ? void 0 : connector.name);
    const icon = AssetUtil.getConnectorImage(connector);
    const networkImage = AssetUtil.getNetworkImage(connection.caipNetwork);
    return {
      name,
      icon,
      networkIcon: networkImage,
      ...connection
    };
  }, []);
  return {
    connections: connections.map(formatConnection),
    recentConnections: recentConnections.map(formatConnection)
  };
}
function useAppKitConnection({ namespace, onSuccess, onError }) {
  const { connections, isSwitchingConnection } = useSnapshot(ConnectionController.state);
  const { activeConnectorIds } = useSnapshot(ConnectorController.state);
  const { activeChain } = useSnapshot(ChainController.state);
  const { remoteFeatures } = useSnapshot(OptionsController.state);
  const chainNamespace = namespace ?? activeChain;
  if (!chainNamespace) {
    throw new Error("No namespace found");
  }
  const isMultiWalletEnabled = Boolean(remoteFeatures == null ? void 0 : remoteFeatures.multiWallet);
  if (!isMultiWalletEnabled) {
    AlertController.open(ConstantsUtil.REMOTE_FEATURES_ALERTS.MULTI_WALLET_NOT_ENABLED.CONNECTION_HOOK, "info");
    return {
      connection: void 0,
      isPending: false,
      switchConnection: () => Promise.resolve(void 0),
      deleteConnection: () => ({})
    };
  }
  const connectorId = activeConnectorIds[chainNamespace];
  const connList = connections.get(chainNamespace);
  const connection = connList == null ? void 0 : connList.find((c) => c.connectorId.toLowerCase() === (connectorId == null ? void 0 : connectorId.toLowerCase()));
  const switchConnection = (0, import_react2.useCallback)(async ({ connection: _connection, address }) => {
    try {
      ConnectionController.setIsSwitchingConnection(true);
      await ConnectionController.switchConnection({
        connection: _connection,
        address,
        namespace: chainNamespace,
        onChange({ address: newAddress, namespace: newNamespace, hasSwitchedAccount, hasSwitchedWallet }) {
          onSuccess == null ? void 0 : onSuccess({
            address: newAddress,
            namespace: newNamespace,
            hasSwitchedAccount,
            hasSwitchedWallet,
            hasDeletedWallet: false
          });
        }
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Something went wrong");
      onError == null ? void 0 : onError(error);
    } finally {
      ConnectionController.setIsSwitchingConnection(false);
    }
  }, [chainNamespace, onSuccess, onError]);
  const deleteConnection = (0, import_react2.useCallback)(({ address, connectorId: connectorId2 }) => {
    StorageUtil.deleteAddressFromConnection({ connectorId: connectorId2, address, namespace: chainNamespace });
    ConnectionController.syncStorageConnections();
    onSuccess == null ? void 0 : onSuccess({
      address,
      namespace: chainNamespace,
      hasSwitchedAccount: false,
      hasSwitchedWallet: false,
      hasDeletedWallet: true
    });
  }, [chainNamespace]);
  return {
    connection,
    isPending: isSwitchingConnection,
    switchConnection,
    deleteConnection
  };
}

// node_modules/@reown/appkit/dist/esm/src/library/react/index.js
var import_react3 = __toESM(require_react(), 1);
var modal = void 0;
function getAppKit(appKit) {
  if (appKit) {
    modal = appKit;
  }
}
function useAppKitProvider(chainNamespace) {
  const { providers, providerIds } = useSnapshot(ProviderUtil.state);
  const walletProvider = providers[chainNamespace];
  const walletProviderType = providerIds[chainNamespace];
  return {
    walletProvider,
    walletProviderType
  };
}
function useAppKitTheme() {
  if (!modal) {
    throw new Error('Please call "createAppKit" before using "useAppKitTheme" hook');
  }
  function setThemeMode(themeMode2) {
    if (themeMode2) {
      modal == null ? void 0 : modal.setThemeMode(themeMode2);
    }
  }
  function setThemeVariables(themeVariables2) {
    if (themeVariables2) {
      modal == null ? void 0 : modal.setThemeVariables(themeVariables2);
    }
  }
  const [themeMode, setInternalThemeMode] = (0, import_react3.useState)(modal.getThemeMode());
  const [themeVariables, setInternalThemeVariables] = (0, import_react3.useState)(modal.getThemeVariables());
  (0, import_react3.useEffect)(() => {
    const unsubscribe = modal == null ? void 0 : modal.subscribeTheme((state) => {
      setInternalThemeMode(state.themeMode);
      setInternalThemeVariables(state.themeVariables);
    });
    return () => {
      unsubscribe == null ? void 0 : unsubscribe();
    };
  }, []);
  return {
    themeMode,
    themeVariables,
    setThemeMode,
    setThemeVariables
  };
}
function useAppKit() {
  if (!modal) {
    throw new Error('Please call "createAppKit" before using "useAppKit" hook');
  }
  async function open(options) {
    await (modal == null ? void 0 : modal.open(options));
  }
  async function close() {
    await (modal == null ? void 0 : modal.close());
  }
  return { open, close };
}
function useWalletInfo(namespace) {
  if (!modal) {
    throw new Error('Please call "createAppKit" before using "useWalletInfo" hook');
  }
  const walletInfo = (0, import_react3.useSyncExternalStore)((callback) => {
    const unsubscribe = modal == null ? void 0 : modal.subscribeWalletInfo(callback, namespace);
    return () => unsubscribe == null ? void 0 : unsubscribe();
  }, () => modal == null ? void 0 : modal.getWalletInfo(namespace), () => modal == null ? void 0 : modal.getWalletInfo(namespace));
  return { walletInfo };
}
function useAppKitState() {
  if (!modal) {
    throw new Error('Please call "createAppKit" before using "useAppKitState" hook');
  }
  const [state, setState] = (0, import_react3.useState)({ ...modal.getState(), initialized: false });
  const [remoteFeatures, setRemoteFeatures] = (0, import_react3.useState)(modal.getRemoteFeatures());
  (0, import_react3.useEffect)(() => {
    if (modal) {
      setState({ ...modal.getState() });
      setRemoteFeatures(modal.getRemoteFeatures());
      const unsubscribe = modal == null ? void 0 : modal.subscribeState((newState) => {
        setState({ ...newState });
      });
      const unsubscribeRemoteFeatures = modal == null ? void 0 : modal.subscribeRemoteFeatures((newState) => {
        setRemoteFeatures(newState);
      });
      return () => {
        unsubscribe == null ? void 0 : unsubscribe();
        unsubscribeRemoteFeatures == null ? void 0 : unsubscribeRemoteFeatures();
      };
    }
    return () => null;
  }, []);
  return { ...state, ...remoteFeatures ?? {} };
}
function useAppKitEvents() {
  if (!modal) {
    throw new Error('Please call "createAppKit" before using "useAppKitEvents" hook');
  }
  const [event, setEvents] = (0, import_react3.useState)(modal.getEvent());
  (0, import_react3.useEffect)(() => {
    const unsubscribe = modal == null ? void 0 : modal.subscribeEvents((newEvent) => {
      setEvents({ ...newEvent });
    });
    return () => {
      unsubscribe == null ? void 0 : unsubscribe();
    };
  }, []);
  return event;
}

// node_modules/@reown/appkit/dist/esm/src/utils/BalanceUtil.js
async function _internalFetchBalance(appKit) {
  if (!appKit) {
    throw new Error("AppKit not initialized when  fetchBalance was called.");
  }
  return await updateBalance(appKit);
}
async function updateBalance(appKit) {
  var _a;
  const address = appKit.getAddress();
  const chainNamespace = appKit.getActiveChainNamespace();
  const chainId = (_a = appKit.getCaipNetwork()) == null ? void 0 : _a.id;
  if (!address || !chainNamespace || !chainId) {
    return {
      data: void 0,
      error: "Not able to retrieve balance",
      isSuccess: false,
      isError: true
    };
  }
  const balance = await appKit.updateNativeBalance(address, chainId, chainNamespace);
  return {
    data: balance,
    error: balance ? null : "No balance found",
    isSuccess: Boolean(balance),
    isError: !balance
  };
}

// node_modules/@reown/appkit/dist/esm/exports/react.js
var modal2 = void 0;
function createAppKit(options) {
  if (!modal2) {
    modal2 = new AppKit({
      ...options,
      sdkVersion: CoreHelperUtil.generateSdkVersion(options.adapters ?? [], "react", PACKAGE_VERSION)
    });
    getAppKit(modal2);
  }
  return modal2;
}
function useAppKitNetwork() {
  const { caipNetwork, caipNetworkId, chainId } = useAppKitNetworkCore();
  function switchNetwork(network) {
    modal2 == null ? void 0 : modal2.switchNetwork(network);
  }
  return {
    caipNetwork,
    caipNetworkId,
    chainId,
    switchNetwork
  };
}
function useAppKitBalance() {
  async function fetchBalance() {
    return await _internalFetchBalance(modal2);
  }
  return {
    fetchBalance
  };
}
export {
  AccountController,
  AppKit,
  CoreHelperUtil,
  DEFAULT_METHODS,
  WcConstantsUtil,
  WcHelpersUtil,
  createAppKit,
  getAppKit,
  modal2 as modal,
  useAppKit,
  useAppKitAccount,
  useAppKitBalance,
  useAppKitConnection,
  useAppKitConnections,
  useAppKitEvents,
  useAppKitNetwork,
  useAppKitNetworkCore,
  useAppKitProvider,
  useAppKitState,
  useAppKitTheme,
  useDisconnect,
  useWalletInfo
};
/*! Bundled license information:

use-sync-external-store/cjs/use-sync-external-store-shim.development.js:
  (**
   * @license React
   * use-sync-external-store-shim.development.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/
//# sourceMappingURL=@reown_appkit_react.js.map

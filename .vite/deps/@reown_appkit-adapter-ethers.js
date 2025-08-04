import {
  BrowserProvider,
  Contract,
  JsonRpcProvider,
  JsonRpcSigner,
  formatEther,
  formatUnits,
  hexlify,
  isHexString,
  parseUnits,
  toUtf8Bytes
} from "./chunk-M3Y67DRG.js";
import "./chunk-YK7HE4AR.js";
import {
  AdapterBlueprint,
  EthersHelpersUtil,
  WalletConnectConnector,
  WcConstantsUtil,
  WcHelpersUtil
} from "./chunk-WE5HSB7U.js";
import "./chunk-UZMN552P.js";
import "./chunk-VOPCLWV4.js";
import "./chunk-GTWEFYSC.js";
import {
  ConstantsUtil as ConstantsUtil2,
  HelpersUtil,
  PresetsUtil,
  ProviderUtil
} from "./chunk-XYQLHURO.js";
import {
  AccountController,
  ConstantsUtil,
  CoreHelperUtil,
  ParseUtil,
  SIWXUtil,
  StorageUtil,
  getPreferredAccountType
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
import "./chunk-OS7ZSSJM.js";

// node_modules/@reown/appkit-adapter-ethers/dist/esm/src/utils/EthersMethods.js
var EthersMethods = {
  signMessage: async (message, provider, address) => {
    if (!provider) {
      throw new Error("signMessage - provider is undefined");
    }
    const hexMessage = isHexString(message) ? message : hexlify(toUtf8Bytes(message));
    const signature = await provider.request({
      method: "personal_sign",
      params: [hexMessage, address]
    });
    return signature;
  },
  estimateGas: async (data, provider, address, networkId) => {
    if (!provider) {
      throw new Error("estimateGas - provider is undefined");
    }
    if (!address) {
      throw new Error("estimateGas - address is undefined");
    }
    if (data.chainNamespace && data.chainNamespace !== "eip155") {
      throw new Error("estimateGas - chainNamespace is not eip155");
    }
    const txParams = {
      from: data.address,
      to: data.to,
      data: data.data,
      type: 0
    };
    const browserProvider = new BrowserProvider(provider, networkId);
    const signer = new JsonRpcSigner(browserProvider, address);
    return await signer.estimateGas(txParams);
  },
  sendTransaction: async (data, provider, address, networkId) => {
    if (!provider) {
      throw new Error("sendTransaction - provider is undefined");
    }
    if (!address) {
      throw new Error("sendTransaction - address is undefined");
    }
    if (data.chainNamespace && data.chainNamespace !== "eip155") {
      throw new Error("sendTransaction - chainNamespace is not eip155");
    }
    const txParams = {
      to: data.to,
      value: data.value,
      gasLimit: data.gas,
      gasPrice: data.gasPrice,
      data: data.data,
      type: 0
    };
    const browserProvider = new BrowserProvider(provider, networkId);
    const signer = new JsonRpcSigner(browserProvider, address);
    const txResponse = await signer.sendTransaction(txParams);
    const txReceipt = await txResponse.wait();
    return (txReceipt == null ? void 0 : txReceipt.hash) || null;
  },
  writeContract: async (data, provider, address, chainId) => {
    if (!provider) {
      throw new Error("writeContract - provider is undefined");
    }
    if (!address) {
      throw new Error("writeContract - address is undefined");
    }
    const browserProvider = new BrowserProvider(provider, chainId);
    const signer = new JsonRpcSigner(browserProvider, address);
    const contract = new Contract(data.tokenAddress, data.abi, signer);
    if (!contract || !data.method) {
      throw new Error("Contract method is undefined");
    }
    const method = contract[data.method];
    if (method) {
      return await method(...data.args);
    }
    throw new Error("Contract method is undefined");
  },
  parseWalletCapabilities: (str) => {
    try {
      return JSON.parse(str);
    } catch (error) {
      throw new Error("Error parsing wallet capabilities");
    }
  },
  parseUnits,
  formatUnits
};

// node_modules/@reown/appkit-adapter-ethers/dist/esm/src/client.js
var EthersAdapter = class extends AdapterBlueprint {
  constructor() {
    super({
      adapterType: ConstantsUtil.ADAPTER_TYPES.ETHERS,
      namespace: ConstantsUtil.CHAIN.EVM
    });
    this.balancePromises = {};
  }
  async createEthersConfig(options) {
    if (!options.metadata) {
      return void 0;
    }
    let injectedProvider = void 0;
    function getInjectedProvider() {
      if (injectedProvider) {
        return injectedProvider;
      }
      if (typeof window === "undefined") {
        return void 0;
      }
      if (!window.ethereum) {
        return void 0;
      }
      injectedProvider = window.ethereum;
      return injectedProvider;
    }
    async function getSafeProvider() {
      const { SafeProvider } = await import("./SafeProvider-LGMNJNBL.js");
      const { default: SafeAppsSDK } = await import("./esm-FIYXVRQP.js");
      const appsSdk = new SafeAppsSDK();
      const info = await appsSdk.safe.getInfo();
      const provider = new SafeProvider(info, appsSdk);
      await provider.connect().catch((error) => {
        console.info("Failed to auto-connect to Safe:", error);
      });
      return provider;
    }
    async function getCoinbaseProvider() {
      var _a, _b, _c;
      try {
        const { createCoinbaseWalletSDK } = await import("./dist-HV5X3LOW.js");
        if (typeof window === "undefined") {
          return void 0;
        }
        const coinbaseSdk = createCoinbaseWalletSDK({
          appName: (_a = options == null ? void 0 : options.metadata) == null ? void 0 : _a.name,
          appLogoUrl: (_b = options == null ? void 0 : options.metadata) == null ? void 0 : _b.icons[0],
          appChainIds: ((_c = options.networks) == null ? void 0 : _c.map((caipNetwork) => caipNetwork.id)) || [1, 84532],
          preference: {
            options: options.coinbasePreference ?? "all"
          }
        });
        return coinbaseSdk.getProvider();
      } catch (error) {
        console.error("Failed to import Coinbase Wallet SDK:", error);
        return void 0;
      }
    }
    const providers = { metadata: options.metadata };
    if (options.enableInjected !== false) {
      providers.injected = getInjectedProvider();
    }
    if (options.enableCoinbase !== false) {
      const coinbaseProvider = await getCoinbaseProvider();
      if (coinbaseProvider) {
        providers.coinbase = coinbaseProvider;
      }
    }
    if (CoreHelperUtil.isSafeApp()) {
      const safeProvider = await getSafeProvider();
      if (safeProvider) {
        providers.safe = safeProvider;
      }
    }
    providers.EIP6963 = options.enableEIP6963 !== false;
    return providers;
  }
  async signMessage(params) {
    const { message, address, provider } = params;
    if (!provider) {
      throw new Error("Provider is undefined");
    }
    try {
      const signature = await EthersMethods.signMessage(message, provider, address);
      return { signature };
    } catch (error) {
      throw new Error("EthersAdapter:signMessage - Sign message failed");
    }
  }
  async sendTransaction(params) {
    var _a;
    if (!params.provider) {
      throw new Error("Provider is undefined");
    }
    const tx = await EthersMethods.sendTransaction({
      value: Number.isNaN(Number(params.value)) ? BigInt(0) : BigInt(params.value),
      to: params.to,
      data: params.data ? params.data : "0x",
      gas: params.gas ? BigInt(params.gas) : void 0,
      gasPrice: params.gasPrice ? BigInt(params.gasPrice) : void 0,
      address: AccountController.state.address
    }, params.provider, AccountController.state.address, Number((_a = params.caipNetwork) == null ? void 0 : _a.id));
    return { hash: tx };
  }
  async writeContract(params) {
    var _a;
    if (!params.provider) {
      throw new Error("Provider is undefined");
    }
    const { address } = ParseUtil.parseCaipAddress(params.caipAddress);
    const result = await EthersMethods.writeContract(params, params.provider, address, Number((_a = params.caipNetwork) == null ? void 0 : _a.id));
    return { hash: result };
  }
  async estimateGas(params) {
    const { provider, caipNetwork, address } = params;
    if (!provider) {
      throw new Error("Provider is undefined");
    }
    try {
      const result = await EthersMethods.estimateGas({
        data: params.data,
        to: params.to,
        address
      }, provider, address, Number(caipNetwork == null ? void 0 : caipNetwork.id));
      return { gas: result };
    } catch (error) {
      throw new Error("EthersAdapter:estimateGas - Estimate gas failed");
    }
  }
  parseUnits(params) {
    return EthersMethods.parseUnits(params.value, params.decimals);
  }
  formatUnits(params) {
    return EthersMethods.formatUnits(params.value, params.decimals);
  }
  async syncConnection(params) {
    const { id, chainId } = params;
    const connector = this.connectors.find((c) => c.id === id);
    const selectedProvider = connector == null ? void 0 : connector.provider;
    if (!selectedProvider) {
      throw new Error("Provider not found");
    }
    const accounts = await selectedProvider.request({
      method: "eth_requestAccounts"
    });
    const requestChainId = await selectedProvider.request({
      method: "eth_chainId"
    });
    this.listenProviderEvents(id, selectedProvider);
    if (!accounts[0]) {
      throw new Error("No accounts found");
    }
    if (!(connector == null ? void 0 : connector.type)) {
      throw new Error("Connector type not found");
    }
    return {
      address: accounts[0],
      chainId: Number(requestChainId) || Number(chainId),
      provider: selectedProvider,
      type: connector.type,
      id
    };
  }
  async syncConnectors(options) {
    var _a;
    this.ethersConfig = await this.createEthersConfig(options);
    if ((_a = this.ethersConfig) == null ? void 0 : _a.EIP6963) {
      this.listenInjectedConnector(true);
    }
    const connectors = Object.keys(this.ethersConfig || {}).filter((key) => key !== "metadata" && key !== "EIP6963");
    connectors.forEach((connector) => {
      var _a2, _b;
      const key = connector === "coinbase" ? "coinbaseWalletSDK" : connector;
      const isInjectedConnector = connector === ConstantsUtil.CONNECTOR_ID.INJECTED;
      if (this.namespace) {
        this.addConnector({
          id: key,
          explorerId: PresetsUtil.ConnectorExplorerIds[key],
          imageUrl: (_a2 = options == null ? void 0 : options.connectorImages) == null ? void 0 : _a2[key],
          name: PresetsUtil.ConnectorNamesMap[key] || "Unknown",
          imageId: PresetsUtil.ConnectorImageIds[key],
          type: PresetsUtil.ConnectorTypesMap[key] ?? "EXTERNAL",
          info: isInjectedConnector ? void 0 : { rdns: key },
          chain: this.namespace,
          chains: [],
          provider: (_b = this.ethersConfig) == null ? void 0 : _b[connector]
        });
      }
    });
  }
  async disconnectAll() {
    const connections = await Promise.all(this.connections.map(async (connection) => {
      const connector = this.connectors.find((c) => HelpersUtil.isLowerCaseMatch(c.id, connection.connectorId));
      if (!connector) {
        throw new Error("Connector not found");
      }
      await this.disconnect({
        id: connector.id
      });
      return connection;
    }));
    return { connections };
  }
  async syncConnections({ connectToFirstConnector, getConnectorStorageInfo }) {
    var _a;
    await ((_a = this.connectionManager) == null ? void 0 : _a.syncConnections({
      connectors: this.connectors,
      caipNetworks: this.getCaipNetworks(),
      universalProvider: this.universalProvider,
      onConnection: this.addConnection.bind(this),
      onListenProvider: this.listenProviderEvents.bind(this),
      getConnectionStatusInfo(connectorId) {
        return getConnectorStorageInfo(connectorId);
      }
    }));
    if (connectToFirstConnector) {
      this.emitFirstAvailableConnection();
    }
  }
  async setUniversalProvider(universalProvider) {
    this.universalProvider = universalProvider;
    const wcConnectorId = ConstantsUtil.CONNECTOR_ID.WALLET_CONNECT;
    WcHelpersUtil.listenWcProvider({
      universalProvider,
      namespace: ConstantsUtil.CHAIN.EVM,
      onConnect: (accounts) => this.onConnect(accounts, wcConnectorId),
      onDisconnect: () => this.onDisconnect(wcConnectorId),
      onAccountsChanged: (accounts) => this.onAccountsChanged(accounts, wcConnectorId, false),
      onChainChanged: (chainId) => this.onChainChanged(chainId, wcConnectorId)
    });
    this.addConnector(new WalletConnectConnector({
      provider: universalProvider,
      caipNetworks: this.getCaipNetworks(),
      namespace: ConstantsUtil.CHAIN.EVM
    }));
    return Promise.resolve();
  }
  eip6963EventHandler(event) {
    var _a;
    if (event.detail) {
      const { info, provider } = event.detail;
      const existingConnector = (_a = this.connectors) == null ? void 0 : _a.find((c) => c.name === (info == null ? void 0 : info.name));
      if (!existingConnector) {
        const type = PresetsUtil.ConnectorTypesMap[ConstantsUtil.CONNECTOR_ID.EIP6963];
        const id = (info == null ? void 0 : info.rdns) || (info == null ? void 0 : info.name) || (info == null ? void 0 : info.uuid);
        if (type && this.namespace && id) {
          this.addConnector({
            id,
            type,
            imageUrl: info == null ? void 0 : info.icon,
            name: (info == null ? void 0 : info.name) || "Unknown",
            provider,
            info,
            chain: this.namespace,
            chains: []
          });
        }
      }
    }
  }
  listenInjectedConnector(enableEIP6963) {
    if (typeof window !== "undefined" && enableEIP6963) {
      const handler = this.eip6963EventHandler.bind(this);
      window.addEventListener(ConstantsUtil2.EIP6963_ANNOUNCE_EVENT, handler);
      window.dispatchEvent(new Event(ConstantsUtil2.EIP6963_REQUEST_EVENT));
    }
  }
  async connect({ id, address, type, chainId, socialUri }) {
    var _a;
    const connector = this.connectors.find((c) => HelpersUtil.isLowerCaseMatch(c.id, id));
    if (!connector) {
      throw new Error("Connector not found");
    }
    const connection = (_a = this.connectionManager) == null ? void 0 : _a.getConnection({
      address,
      connectorId: id,
      connections: this.connections,
      connectors: this.connectors
    });
    if (connection) {
      const caipNetwork = connection.caipNetwork;
      if (!caipNetwork) {
        throw new Error("EthersAdapter:connect - could not find the caipNetwork to connect");
      }
      if (connection.account) {
        this.emit("accountChanged", {
          address: connection.account.address,
          chainId: caipNetwork.id,
          connector
        });
        return {
          address: connection.account.address,
          chainId: caipNetwork.id,
          provider: connector.provider,
          type: connector.type,
          id
        };
      }
    }
    const selectedProvider = connector == null ? void 0 : connector.provider;
    if (!selectedProvider) {
      throw new Error("Provider not found");
    }
    let accounts = [];
    let requestChainId = void 0;
    if (type === ConstantsUtil2.CONNECTOR_TYPE_AUTH) {
      const { address: _address, accounts: authAccounts } = await SIWXUtil.authConnectorAuthenticate({
        authConnector: selectedProvider,
        chainNamespace: ConstantsUtil.CHAIN.EVM,
        chainId,
        socialUri,
        preferredAccountType: getPreferredAccountType("eip155")
      });
      const caipNetwork = this.getCaipNetworks().find((n) => n.id.toString() === (chainId == null ? void 0 : chainId.toString()));
      accounts = [_address];
      this.addConnection({
        connectorId: id,
        accounts: authAccounts ? authAccounts.map((account) => ({ address: account.address })) : accounts.map((account) => ({ address: account })),
        caipNetwork,
        auth: {
          name: StorageUtil.getConnectedSocialProvider(),
          username: StorageUtil.getConnectedSocialUsername()
        }
      });
      this.emit("accountChanged", {
        address: accounts[0],
        chainId: Number(chainId),
        connector
      });
    } else {
      accounts = await selectedProvider.request({
        method: "eth_requestAccounts"
      });
      requestChainId = await selectedProvider.request({
        method: "eth_chainId"
      });
      const caipNetwork = this.getCaipNetworks().find((n) => n.id.toString() === (chainId == null ? void 0 : chainId.toString()));
      if (requestChainId !== chainId) {
        if (!caipNetwork) {
          throw new Error("EthersAdapter:connect - could not find the caipNetwork to switch");
        }
        try {
          await this.switchNetwork({
            caipNetwork,
            provider: selectedProvider,
            providerType: type
          });
        } catch (error) {
          throw new Error("EthersAdapter:connect - Switch network failed");
        }
      }
      this.emit("accountChanged", {
        address: accounts[0],
        chainId: Number(chainId),
        connector
      });
      this.addConnection({
        connectorId: id,
        accounts: accounts.map((account) => ({ address: account })),
        caipNetwork
      });
      if (connector.id !== ConstantsUtil.CONNECTOR_ID.WALLET_CONNECT) {
        this.listenProviderEvents(id, selectedProvider);
      }
    }
    return {
      address: accounts[0],
      chainId: Number(chainId),
      provider: selectedProvider,
      type,
      id
    };
  }
  async reconnect(params) {
    const { id, chainId } = params;
    const connector = this.connectors.find((c) => c.id === id);
    if (connector && connector.type === "AUTH" && chainId) {
      await SIWXUtil.authConnectorAuthenticate({
        authConnector: connector.provider,
        chainNamespace: ConstantsUtil.CHAIN.EVM,
        chainId,
        preferredAccountType: getPreferredAccountType("eip155")
      });
    }
  }
  async getAccounts(params) {
    var _a;
    const connector = this.connectors.find((c) => c.id === params.id);
    const selectedProvider = connector == null ? void 0 : connector.provider;
    if (!selectedProvider || !connector) {
      throw new Error("Provider not found");
    }
    const connection = (_a = this.connectionManager) == null ? void 0 : _a.getConnection({
      connectorId: params.id,
      connections: this.connections,
      connectors: this.connectors
    });
    if (connection) {
      return {
        accounts: connection.accounts.map(({ address }) => CoreHelperUtil.createAccount(ConstantsUtil.CHAIN.EVM, address, "eoa"))
      };
    }
    if (params.id === ConstantsUtil.CONNECTOR_ID.AUTH) {
      const provider = connector["provider"];
      if (!provider.user) {
        return { accounts: [] };
      }
      const { accounts: accounts2, address } = provider.user;
      return Promise.resolve({
        accounts: (accounts2 || [{ address, type: "eoa" }]).map((account) => CoreHelperUtil.createAccount(ConstantsUtil.CHAIN.EVM, account.address, account.type))
      });
    }
    const accounts = await selectedProvider.request({
      method: "eth_requestAccounts"
    });
    return {
      accounts: accounts.map((account) => CoreHelperUtil.createAccount(ConstantsUtil.CHAIN.EVM, account, "eoa"))
    };
  }
  async disconnect(params) {
    var _a, _b;
    if (params.id) {
      const connector = this.connectors.find((c) => HelpersUtil.isLowerCaseMatch(c.id, params.id));
      if (!connector) {
        throw new Error("Connector not found");
      }
      const connection = (_a = this.connectionManager) == null ? void 0 : _a.getConnection({
        connectorId: params.id,
        connections: this.connections,
        connectors: this.connectors
      });
      switch (connector.type) {
        case ConstantsUtil2.CONNECTOR_TYPE_WALLET_CONNECT:
          if (connector.provider.session) {
            ;
            connector.provider.disconnect();
          }
          break;
        case ConstantsUtil2.CONNECTOR_TYPE_AUTH:
          await ((_b = connector.provider) == null ? void 0 : _b.disconnect());
          break;
        case ConstantsUtil2.CONNECTOR_TYPE_ANNOUNCED:
        case ConstantsUtil2.CONNECTOR_TYPE_EXTERNAL:
          await this.revokeProviderPermissions(connector.provider);
          break;
        default:
          throw new Error("Unsupported provider type");
      }
      if (connector.id) {
        this.removeProviderListeners(connector.id);
        this.deleteConnection(connector.id);
      }
      if (this.connections.length === 0) {
        this.emit("disconnect");
      } else {
        this.emitFirstAvailableConnection();
      }
      return { connections: connection ? [connection] : [] };
    }
    return this.disconnectAll();
  }
  async getBalance(params) {
    const address = params.address;
    const caipNetwork = this.getCaipNetworks().find((network) => {
      var _a;
      return network.id.toString() === ((_a = params.chainId) == null ? void 0 : _a.toString());
    });
    if (!address) {
      return Promise.resolve({ balance: "0.00", symbol: "ETH" });
    }
    if (caipNetwork && caipNetwork.chainNamespace === ConstantsUtil.CHAIN.EVM) {
      const caipAddress = `${caipNetwork.caipNetworkId}:${address}`;
      const cachedPromise = this.balancePromises[caipAddress];
      if (cachedPromise) {
        return cachedPromise;
      }
      const cachedBalance = StorageUtil.getNativeBalanceCacheForCaipAddress(caipAddress);
      if (cachedBalance) {
        return { balance: cachedBalance.balance, symbol: cachedBalance.symbol };
      }
      const jsonRpcProvider = new JsonRpcProvider(caipNetwork.rpcUrls.default.http[0], {
        chainId: caipNetwork.id,
        name: caipNetwork.name
      });
      if (jsonRpcProvider) {
        try {
          this.balancePromises[caipAddress] = new Promise(async (resolve) => {
            try {
              const balance = await jsonRpcProvider.getBalance(address);
              const formattedBalance = formatEther(balance);
              StorageUtil.updateNativeBalanceCache({
                caipAddress,
                balance: formattedBalance,
                symbol: caipNetwork.nativeCurrency.symbol,
                timestamp: Date.now()
              });
              resolve({ balance: formattedBalance, symbol: caipNetwork.nativeCurrency.symbol });
            } catch (error) {
              resolve({ balance: "0.00", symbol: "ETH" });
            }
          }).finally(() => {
            delete this.balancePromises[caipAddress];
          });
          return this.balancePromises[caipAddress] || { balance: "0.00", symbol: "ETH" };
        } catch (error) {
          return { balance: "0.00", symbol: "ETH" };
        }
      }
    }
    return { balance: "0.00", symbol: "ETH" };
  }
  async switchNetwork(params) {
    var _a, _b;
    const { caipNetwork, provider, providerType } = params;
    if (providerType === "AUTH") {
      await super.switchNetwork(params);
      return;
    }
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: EthersHelpersUtil.numberToHexString(caipNetwork.id) }]
      });
    } catch (switchError) {
      if (switchError.code === WcConstantsUtil.ERROR_CODE_UNRECOGNIZED_CHAIN_ID || switchError.code === WcConstantsUtil.ERROR_INVALID_CHAIN_ID || switchError.code === WcConstantsUtil.ERROR_CODE_DEFAULT || ((_b = (_a = switchError == null ? void 0 : switchError.data) == null ? void 0 : _a.originalError) == null ? void 0 : _b.code) === WcConstantsUtil.ERROR_CODE_UNRECOGNIZED_CHAIN_ID) {
        await EthersHelpersUtil.addEthereumChain(provider, caipNetwork);
      } else if (providerType === "ANNOUNCED" || providerType === "EXTERNAL" || providerType === "INJECTED") {
        throw new Error("Chain is not supported");
      }
    }
  }
  getWalletConnectProvider() {
    var _a;
    return (_a = this.connectors.find((c) => c.type === "WALLET_CONNECT")) == null ? void 0 : _a.provider;
  }
  async revokeProviderPermissions(provider) {
    try {
      const permissions = await provider.request({
        method: "wallet_getPermissions"
      });
      const ethAccountsPermission = permissions.find((permission) => permission.parentCapability === "eth_accounts");
      if (ethAccountsPermission) {
        await provider.request({
          method: "wallet_revokePermissions",
          params: [{ eth_accounts: {} }]
        });
      }
    } catch (error) {
      console.info("Could not revoke permissions from wallet. Disconnecting...", error);
    }
  }
  async getCapabilities(params) {
    var _a, _b;
    const provider = ProviderUtil.getProvider(ConstantsUtil.CHAIN.EVM);
    if (!provider) {
      throw new Error("Provider is undefined");
    }
    const walletCapabilitiesString = (_b = (_a = provider.session) == null ? void 0 : _a.sessionProperties) == null ? void 0 : _b["capabilities"];
    if (walletCapabilitiesString) {
      const walletCapabilities = EthersMethods.parseWalletCapabilities(walletCapabilitiesString);
      const accountCapabilities = walletCapabilities[params];
      if (accountCapabilities) {
        return accountCapabilities;
      }
    }
    return await provider.request({ method: "wallet_getCapabilities", params: [params] });
  }
  async grantPermissions(params) {
    const provider = ProviderUtil.getProvider(ConstantsUtil.CHAIN.EVM);
    if (!provider) {
      throw new Error("Provider is undefined");
    }
    return await provider.request({ method: "wallet_grantPermissions", params });
  }
  async revokePermissions(params) {
    const provider = ProviderUtil.getProvider(ConstantsUtil.CHAIN.EVM);
    if (!provider) {
      throw new Error("Provider is undefined");
    }
    return await provider.request({ method: "wallet_revokePermissions", params: [params] });
  }
  async walletGetAssets(params) {
    const provider = ProviderUtil.getProvider(ConstantsUtil.CHAIN.EVM);
    if (!provider) {
      throw new Error("Provider is undefined");
    }
    return await provider.request({
      method: "wallet_getAssets",
      params: [params]
    });
  }
};
export {
  EthersAdapter,
  EthersHelpersUtil
};
//# sourceMappingURL=@reown_appkit-adapter-ethers.js.map

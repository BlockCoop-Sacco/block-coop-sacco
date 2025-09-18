import { ethers } from 'ethers';

/**
 * Gasless Transaction Service for Frontend
 * Handles signing and sending gasless transaction requests
 */
class GaslessTransactionService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.forwarderAddress = null;
    this.packageManagerAddress = null;
    this.apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
  }

  /**
   * Initialize the service with wallet connection
   */
  async initialize() {
    try {
      // Check if MetaMask is available
      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask is not installed');
      }

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      // Create provider and signer
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();

      // Get network info
      const network = await this.provider.getNetwork();
      console.log('Connected to network:', network.name);

      // Set contract addresses based on network
      this.setContractAddresses(network.chainId);

      return true;
    } catch (error) {
      console.error('Failed to initialize gasless service:', error);
      throw error;
    }
  }

  /**
   * Set contract addresses based on network
   */
  setContractAddresses(chainId) {
    // BSC Mainnet
    if (chainId === 56) {
      this.forwarderAddress = import.meta.env.VITE_FORWARDER_ADDRESS;
      this.packageManagerAddress = import.meta.env.VITE_GASLESS_PACKAGE_MANAGER_ADDRESS;
    }
    // BSC Testnet
    else if (chainId === 97) {
      this.forwarderAddress = import.meta.env.VITE_FORWARDER_ADDRESS_TESTNET;
      this.packageManagerAddress = import.meta.env.VITE_GASLESS_PACKAGE_MANAGER_ADDRESS_TESTNET;
    }
    else {
      throw new Error('Unsupported network. Please connect to BSC Mainnet or Testnet.');
    }

    if (!this.forwarderAddress || !this.packageManagerAddress) {
      throw new Error('Contract addresses not configured for this network');
    }
  }

  /**
   * Create a gasless package purchase request
   */
  async createPackagePurchaseRequest(packageId, usdtAmount, referrer = null) {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const userAddress = await this.signer.getAddress();
      const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes from now

      // Create the message to sign
      const message = ethers.solidityPackedKeccak256(
        ['uint256', 'uint256', 'address', 'uint256'],
        [packageId, usdtAmount, referrer || ethers.ZeroAddress, deadline]
      );

      // Sign the message
      const signature = await this.signer.signMessage(ethers.getBytes(message));

      // Create the purchase request
      const purchaseRequest = {
        userWalletAddress: userAddress,
        packageId,
        usdtAmount,
        referrer: referrer || ethers.ZeroAddress,
        deadline,
        signature
      };

      return purchaseRequest;
    } catch (error) {
      console.error('Failed to create purchase request:', error);
      throw error;
    }
  }

  /**
   * Send a gasless package purchase request to the backend
   */
  async sendPackagePurchaseRequest(purchaseRequest) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/gasless/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(purchaseRequest)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send purchase request');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to send purchase request:', error);
      throw error;
    }
  }

  /**
   * Create and send a gasless package purchase
   */
  async purchasePackage(packageId, usdtAmount, referrer = null) {
    try {
      // Create the purchase request
      const purchaseRequest = await this.createPackagePurchaseRequest(
        packageId,
        usdtAmount,
        referrer
      );

      // Send the request to the backend
      const result = await this.sendPackagePurchaseRequest(purchaseRequest);

      return result;
    } catch (error) {
      console.error('Failed to purchase package:', error);
      throw error;
    }
  }

  /**
   * Create a generic gasless transaction request
   */
  async createTransactionRequest(to, data, value = 0, gas = 500000) {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const from = await this.signer.getAddress();
      const nonce = await this.signer.getTransactionCount();
      const validUntil = Math.floor(Date.now() / 1000) + 300; // 5 minutes from now

      // Create the forward request
      const forwardRequest = {
        from,
        to,
        value,
        gas,
        nonce,
        data,
        validUntil
      };

      // Create the message to sign
      const message = this.createForwardRequestMessage(forwardRequest);

      // Sign the message
      const signature = await this.signer.signMessage(ethers.utils.arrayify(message));

      return {
        ...forwardRequest,
        signature
      };
    } catch (error) {
      console.error('Failed to create transaction request:', error);
      throw error;
    }
  }

  /**
   * Create the message hash for a forward request
   */
  createForwardRequestMessage(forwardRequest) {
    const domain = {
      name: 'MinimalForwarder',
      version: '0.0.1',
      chainId: await this.provider.getNetwork().then(n => n.chainId),
      verifyingContract: this.forwarderAddress
    };

    const types = {
      FrontendRequest: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'gas', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'data', type: 'bytes' },
        { name: 'validUntil', type: 'uint256' }
      ]
    };

    return ethers.TypedDataEncoder.hash(domain, types, forwardRequest);
  }

  /**
   * Send a generic gasless transaction request to the backend
   */
  async sendTransactionRequest(transactionRequest) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/gasless/relay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionRequest)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send transaction request');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to send transaction request:', error);
      throw error;
    }
  }

  /**
   * Get user's gasless transaction history
   */
  async getUserTransactions(userAddress, page = 1, limit = 10, status = null) {
    try {
      let url = `${this.apiBaseUrl}/gasless/transactions/${userAddress}?page=${page}&limit=${limit}`;
      if (status) {
        url += `&status=${status}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get user transactions');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to get user transactions:', error);
      throw error;
    }
  }

  /**
   * Get transaction details by hash
   */
  async getTransactionByHash(transactionHash) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/gasless/transaction/${transactionHash}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get transaction');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to get transaction:', error);
      throw error;
    }
  }

  /**
   * Retry a failed transaction
   */
  async retryTransaction(transactionId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/gasless/retry/${transactionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to retry transaction');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to retry transaction:', error);
      throw error;
    }
  }

  /**
   * Get gasless transaction statistics
   */
  async getTransactionStats() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/gasless/stats`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get transaction stats');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to get transaction stats:', error);
      throw error;
    }
  }

  /**
   * Get relayer status
   */
  async getRelayerStatus() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/gasless/status`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get relayer status');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to get relayer status:', error);
      throw error;
    }
  }

  /**
   * Check if wallet is connected
   */
  isWalletConnected() {
    return this.signer !== null;
  }

  /**
   * Get connected wallet address
   */
  async getWalletAddress() {
    if (!this.signer) {
      return null;
    }
    return await this.signer.getAddress();
  }

  /**
   * Disconnect wallet
   */
  disconnect() {
    this.provider = null;
    this.signer = null;
    this.forwarderAddress = null;
    this.packageManagerAddress = null;
  }
}

// Create singleton instance
const gaslessService = new GaslessTransactionService();

export default gaslessService;

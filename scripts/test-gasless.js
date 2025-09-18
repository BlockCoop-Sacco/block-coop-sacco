const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🧪 Testing Gasless Transaction System...");

  // Get the test accounts
  const [deployer, user1, user2] = await ethers.getSigners();
  console.log("📝 Testing with accounts:");
  console.log("  Deployer:", deployer.address);
  console.log("  User1:", user1.address);
  console.log("  User2:", user2.address);

  // Deploy contracts for testing
  console.log("\n📦 Deploying test contracts...");
  
  const MinimalForwarder = await ethers.getContractFactory("MinimalForwarder");
  const forwarder = await MinimalForwarder.deploy();
  await forwarder.deployed();
  console.log("✅ MinimalForwarder deployed to:", forwarder.address);

  // Deploy mock USDT for testing
  const MockTether = await ethers.getContractFactory("MockTether");
  const mockUSDT = await MockTether.deploy();
  await mockUSDT.deployed();
  console.log("✅ MockTether deployed to:", mockUSDT.address);

  // Deploy GaslessPackageManager with mock addresses
  const mockAddresses = {
    shareToken: ethers.constants.AddressZero,
    lpToken: ethers.constants.AddressZero,
    vestingVault: ethers.constants.AddressZero,
    router: ethers.constants.AddressZero,
    factory: ethers.constants.AddressZero,
    treasury: deployer.address,
    taxManager: ethers.constants.AddressZero,
    admin: deployer.address,
    initialGlobalTargetPrice: ethers.utils.parseEther("0.1")
  };

  const GaslessPackageManager = await ethers.getContractFactory("GaslessPackageManager");
  const gaslessPackageManager = await GaslessPackageManager.deploy(
    mockUSDT.address,
    mockAddresses.shareToken,
    mockAddresses.lpToken,
    mockAddresses.vestingVault,
    mockAddresses.router,
    mockAddresses.factory,
    mockAddresses.treasury,
    mockAddresses.taxManager,
    mockAddresses.admin,
    mockAddresses.initialGlobalTargetPrice
  );
  await gaslessPackageManager.deployed();
  console.log("✅ GaslessPackageManager deployed to:", gaslessPackageManager.address);

  // Test 1: Forwarder functionality
  console.log("\n🧪 Test 1: Testing MinimalForwarder...");
  
  const nonce = await forwarder.getNonce(user1.address);
  console.log("  User1 nonce:", nonce.toString());

  // Create a simple transaction request
  const forwardRequest = {
    from: user1.address,
    to: gaslessPackageManager.address,
    value: 0,
    gas: 100000,
    nonce: nonce,
    data: gaslessPackageManager.interface.encodeFunctionData("getUserNonce", [user1.address]),
    validUntil: 0
  };

  // Create the message hash
  const domain = {
    name: 'MinimalForwarder',
    version: '0.0.1',
    chainId: await user1.getChainId(),
    verifyingContract: forwarder.address
  };

  const types = {
    ForwardRequest: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'gas', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'data', type: 'bytes' },
      { name: 'validUntil', type: 'uint256' }
    ]
  };

        const messageHash = ethers.TypedDataEncoder.hash(domain, types, forwardRequest);
      const signature = await user1.signMessage(ethers.getBytes(messageHash));

  // Verify signature
  const isValid = await forwarder.verify(forwardRequest, signature);
  console.log("  Signature verification:", isValid ? "✅ PASSED" : "❌ FAILED");

  // Execute the transaction
  const tx = await forwarder.execute(forwardRequest, signature);
  const receipt = await tx.wait();
  console.log("  Transaction executed:", receipt.transactionHash);

  // Test 2: Gasless package purchase
  console.log("\n🧪 Test 2: Testing Gasless Package Purchase...");

  // Mint some USDT to user1
  const usdtAmount = ethers.utils.parseUnits("100", 18);
  await mockUSDT.mint(user1.address, usdtAmount);
  console.log("  Minted", ethers.utils.formatUnits(usdtAmount, 18), "USDT to User1");

  // Approve USDT spending
  await mockUSDT.connect(user1).approve(gaslessPackageManager.address, usdtAmount);
  console.log("  User1 approved USDT spending");

  // Create purchase request
  const packageId = 1;
  const purchaseAmount = ethers.utils.parseUnits("10", 18);
  const referrer = user2.address;
  const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes from now

  // Create the message to sign
        const purchaseMessage = ethers.solidityPackedKeccak256(
        ['uint256', 'uint256', 'address', 'uint256'],
        [packageId, purchaseAmount, referrer, deadline]
      );

      const purchaseSignature = await user1.signMessage(ethers.getBytes(purchaseMessage));
  console.log("  User1 signed purchase request");

  // Execute gasless purchase
  try {
    const purchaseTx = await gaslessPackageManager.executeGaslessPurchase(
      packageId,
      purchaseAmount,
      referrer,
      deadline,
      purchaseSignature
    );
    const purchaseReceipt = await purchaseTx.wait();
    console.log("  Gasless purchase executed:", purchaseReceipt.transactionHash);
    console.log("  ✅ Gasless purchase test PASSED");
  } catch (error) {
    console.log("  ❌ Gasless purchase test FAILED:", error.message);
  }

  // Test 3: Nonce management
  console.log("\n🧪 Test 3: Testing Nonce Management...");
  
  const newNonce = await forwarder.getNonce(user1.address);
  console.log("  User1 new nonce:", newNonce.toString());
  console.log("  Nonce incremented:", newNonce.gt(nonce) ? "✅ PASSED" : "❌ FAILED");

  // Test 4: Signature replay protection
  console.log("\n🧪 Test 4: Testing Signature Replay Protection...");
  
  try {
    const replayTx = await forwarder.execute(forwardRequest, signature);
    await replayTx.wait();
    console.log("  ❌ Replay protection FAILED - transaction should have failed");
  } catch (error) {
    console.log("  ✅ Replay protection PASSED - transaction correctly rejected");
  }

  // Test 5: Deadline validation
  console.log("\n🧪 Test 5: Testing Deadline Validation...");
  
  const expiredDeadline = Math.floor(Date.now() / 1000) - 60; // 1 minute ago
  const expiredRequest = {
    ...forwardRequest,
    validUntil: expiredDeadline
  };

        const expiredMessageHash = ethers.TypedDataEncoder.hash(domain, types, expiredRequest);
      const expiredSignature = await user1.signMessage(ethers.getBytes(expiredMessageHash));

  try {
    const expiredTx = await forwarder.execute(expiredRequest, expiredSignature);
    await expiredTx.wait();
    console.log("  ❌ Deadline validation FAILED - expired transaction should have failed");
  } catch (error) {
    console.log("  ✅ Deadline validation PASSED - expired transaction correctly rejected");
  }

  console.log("\n🎉 Gasless Transaction System Testing Complete!");
  console.log("\n📋 Test Summary:");
  console.log("  MinimalForwarder:", forwarder.address);
  console.log("  GaslessPackageManager:", gaslessPackageManager.address);
  console.log("  MockTether:", mockUSDT.address);
  
  console.log("\n💾 Save these addresses in your .env file:");
  console.log(`FORWARDER_ADDRESS=${forwarder.address}`);
  console.log(`GASLESS_PACKAGE_MANAGER_ADDRESS=${gaslessPackageManager.address}`);
  console.log(`USDT_ADDRESS=${mockUSDT.address}`);

  return {
    forwarder: forwarder.address,
    gaslessPackageManager: gaslessPackageManager.address,
    mockUSDT: mockUSDT.address
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Testing failed:", error);
    process.exit(1);
  });

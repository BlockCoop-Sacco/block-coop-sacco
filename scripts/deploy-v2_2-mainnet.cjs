const { ethers, network } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Mainnet deployment: PackageManagerV2_2 core stack (no packages)");
  console.log("Network:", network.name);

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Constants (BSC Mainnet Pancake V2)
  // Use lowercase addresses to bypass checksum issues in strict ethers v6 validation
  const ROUTER_ADDRESS = (process.env.ROUTER_ADDRESS || "0x10ed43c718714eb63d5aa57b78b54704e256024e").toLowerCase();
  const FACTORY_ADDRESS = (process.env.FACTORY_ADDRESS || "0xca143ce32fe78f1f7019d7d551a6402fc5350c73").toLowerCase();
  const USDT_ADDRESS = (process.env.MAINNET_USDT || "0x55d398326f99059ff775485246999027b3197955").toLowerCase(); // 18 decimals on BSC
  const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || deployer.address;

  console.log({ ROUTER_ADDRESS, FACTORY_ADDRESS, USDT_ADDRESS, TREASURY_ADDRESS });

  // 1) Deploy SwapTaxManager
  console.log("\n1️⃣ Deploying SwapTaxManager...");
  const TaxMgr = await ethers.getContractFactory("SwapTaxManager");
  const taxMgr = await TaxMgr.deploy(deployer.address);
  await taxMgr.waitForDeployment();
  const taxMgrAddr = await taxMgr.getAddress();
  console.log("✅ SwapTaxManager:", taxMgrAddr);

  // 2) Deploy BLOCKS token
  console.log("\n2️⃣ Deploying BLOCKS token...");
  const Blocks = await ethers.getContractFactory("BLOCKS");
  const blocks = await Blocks.deploy("BlockCoop Sacco Share Token", "BLOCKS", deployer.address, taxMgrAddr);
  await blocks.waitForDeployment();
  const blocksAddr = await blocks.getAddress();
  console.log("✅ BLOCKS:", blocksAddr);

  // 3) Deploy BLOCKS_LP token (synthetic LP voucher)
  console.log("\n3️⃣ Deploying BLOCKS_LP token...");
  const BlocksLP = await ethers.getContractFactory("BLOCKS_LP");
  const blocksLP = await BlocksLP.deploy("BlockCoop LP Token", "BLOCKS-LP", deployer.address);
  await blocksLP.waitForDeployment();
  const blocksLPAddr = await blocksLP.getAddress();
  console.log("✅ BLOCKS_LP:", blocksLPAddr);

  // 4) Deploy VestingVault
  console.log("\n4️⃣ Deploying VestingVault...");
  const VestingVault = await ethers.getContractFactory("VestingVault");
  const vault = await VestingVault.deploy(blocksAddr, deployer.address);
  await vault.waitForDeployment();
  const vaultAddr = await vault.getAddress();
  console.log("✅ VestingVault:", vaultAddr);

  // 5) Deploy PackageManagerV2_2
  console.log("\n5️⃣ Deploying PackageManagerV2_2...");
  const PM = await ethers.getContractFactory("PackageManagerV2_2");
  const initialTarget = ethers.parseUnits("2.0", 18); // 2 USDT per BLOCKS (fallback)
  const pm = await PM.deploy(
    USDT_ADDRESS,
    blocksAddr,
    blocksLPAddr,
    vaultAddr,
    ROUTER_ADDRESS,
    FACTORY_ADDRESS,
    TREASURY_ADDRESS,
    taxMgrAddr,
    deployer.address,
    initialTarget
  );
  await pm.waitForDeployment();
  const pmAddr = await pm.getAddress();
  console.log("✅ PackageManagerV2_2:", pmAddr);

  // 6) Grant roles
  console.log("\n6️⃣ Granting roles to PackageManagerV2_2...");
  await (await blocks.grantRole(await blocks.MINTER_ROLE(), pmAddr)).wait();
  await (await blocksLP.grantRole(await blocksLP.MINTER_ROLE(), pmAddr)).wait();
  await (await blocksLP.grantRole(await blocksLP.BURNER_ROLE(), pmAddr)).wait();
  await (await vault.grantRole(await vault.LOCKER_ROLE(), pmAddr)).wait();
  console.log("✅ Roles granted");

  // 7) One-time router allowances (optional gas save)
  console.log("\n7️⃣ Initializing router allowances...");
  await (await pm.initRouterAllowances()).wait();
  console.log("✅ Router allowances initialized");

  // 8) Optionally set purchase tax if env provided
  if (process.env.PURCHASE_TAX_BPS) {
    console.log("\n8️⃣ Setting purchase tax to", process.env.PURCHASE_TAX_BPS, "bps...");
    const purchaseKey = await pm.PURCHASE_TAX_KEY();
    const managerRole = await taxMgr.MANAGER_ROLE();
    await (await taxMgr.grantRole(managerRole, deployer.address)).wait();
    await (await taxMgr.setBucket(purchaseKey, parseInt(process.env.PURCHASE_TAX_BPS), TREASURY_ADDRESS)).wait();
    console.log("✅ Purchase tax configured");
  } else {
    console.log("\n8️⃣ Skipping tax config (will be set via admin panel later)");
  }

  // Save deployment addresses
  const out = {
    network: network.name,
    router: ROUTER_ADDRESS,
    factory: FACTORY_ADDRESS,
    usdt: USDT_ADDRESS,
    taxManager: taxMgrAddr,
    blocks: blocksAddr,
    blocksLP: blocksLPAddr,
    vestingVault: vaultAddr,
    packageManager: pmAddr,
    treasury: TREASURY_ADDRESS,
    timestamp: Date.now(),
  };
  fs.mkdirSync("deployments", { recursive: true });
  fs.writeFileSync("deployments/deployments-mainnet-v2_2.json", JSON.stringify(out, null, 2));
  console.log("\n📝 Saved deployments to deployments/deployments-mainnet-v2_2.json");

  console.log("\n🎉 Mainnet core stack deployed (no packages created). Use admin panel to add packages.");
  console.log(out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


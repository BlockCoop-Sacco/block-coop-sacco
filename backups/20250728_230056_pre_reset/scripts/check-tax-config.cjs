const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🔍 Checking Tax Configuration...");
  
  const [deployer] = await ethers.getSigners();
  console.log("👤 Account:", deployer.address);
  console.log("🌐 Network:", network.name);

  // Load deployment data
  const deployFile = path.resolve(__dirname, "../deployments/deployments-v3-blocks.json");
  const deployData = JSON.parse(fs.readFileSync(deployFile));
  
  const pmAddress = deployData.contracts.PackageManagerV2_1;
  const taxManagerAddress = deployData.contracts.SwapTaxManager;
  
  console.log("📍 PackageManagerV2_1:", pmAddress);
  console.log("📍 SwapTaxManager:", taxManagerAddress);
  
  // Get contract instances
  const pm = await ethers.getContractAt("PackageManagerV2_1", pmAddress);
  const taxManager = await ethers.getContractAt("SwapTaxManager", taxManagerAddress);

  console.log("\n🔍 Checking tax bucket configurations...");
  
  // Check purchase tax
  const purchaseTaxKey = ethers.keccak256(ethers.toUtf8Bytes("purchase"));
  const purchaseTax = await taxManager.buckets(purchaseTaxKey);
  console.log(`Purchase Tax (${purchaseTaxKey}):`);
  console.log(`   Rate: ${purchaseTax[0]} BPS (${Number(purchaseTax[0]) / 100}%)`);
  console.log(`   Recipient: ${purchaseTax[1]}`);
  
  // Check referral tax
  const referralTaxKey = ethers.keccak256(ethers.toUtf8Bytes("referral"));
  const referralTax = await taxManager.buckets(referralTaxKey);
  console.log(`Referral Tax (${referralTaxKey}):`);
  console.log(`   Rate: ${referralTax[0]} BPS (${Number(referralTax[0]) / 100}%)`);
  console.log(`   Recipient: ${referralTax[1]}`);
  
  // Check other common tax keys
  const commonKeys = ["buy", "sell", "transfer", "swap"];
  for (const key of commonKeys) {
    const taxKey = ethers.keccak256(ethers.toUtf8Bytes(key));
    const tax = await taxManager.buckets(taxKey);
    if (Number(tax[0]) > 0) {
      console.log(`${key.charAt(0).toUpperCase() + key.slice(1)} Tax (${taxKey}):`);
      console.log(`   Rate: ${tax[0]} BPS (${Number(tax[0]) / 100}%)`);
      console.log(`   Recipient: ${tax[1]}`);
    }
  }

  console.log("\n🔍 Testing tax calculation manually...");
  
  // Test with 100 USDT
  const testAmount = ethers.parseUnits("100", 6);
  console.log(`Test amount: ${ethers.formatUnits(testAmount, 6)} USDT`);
  
  if (Number(purchaseTax[0]) > 0 && purchaseTax[1] !== ethers.ZeroAddress) {
    const taxAmount = (testAmount * BigInt(purchaseTax[0])) / 10000n;
    const netAmount = testAmount - taxAmount;
    console.log(`Tax amount: ${ethers.formatUnits(taxAmount, 6)} USDT`);
    console.log(`Net amount: ${ethers.formatUnits(netAmount, 6)} USDT`);
    console.log(`Effective tax rate: ${(Number(taxAmount) / Number(testAmount) * 100).toFixed(2)}%`);
  } else {
    console.log("No purchase tax configured");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

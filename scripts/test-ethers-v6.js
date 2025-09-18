const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing Ethers v6 Integration...");

  try {
    // Test basic ethers v6 functionality
    console.log("\n📝 Testing basic ethers v6 functions...");
    
    // Test parseEther
    const amount = ethers.parseEther("1.5");
    console.log("  parseEther('1.5'):", amount.toString());
    
    // Test formatEther
    const formatted = ethers.formatEther(amount);
    console.log("  formatEther:", formatted);
    
    // Test solidityPackedKeccak256
    const hash = ethers.solidityPackedKeccak256(
      ['uint256', 'address'],
      [amount, ethers.ZeroAddress]
    );
    console.log("  solidityPackedKeccak256:", hash);
    
    // Test getBytes
    const bytes = ethers.getBytes(hash);
    console.log("  getBytes length:", bytes.length);
    
    // Test ZeroAddress
    console.log("  ZeroAddress:", ethers.ZeroAddress);
    
    // Test TypedDataEncoder
    const domain = {
      name: 'Test',
      version: '1.0.0',
      chainId: 1,
      verifyingContract: ethers.ZeroAddress
    };
    
    const types = {
      Test: [
        { name: 'value', type: 'uint256' }
      ]
    };
    
    const encoded = ethers.TypedDataEncoder.hash(domain, types, { value: amount });
    console.log("  TypedDataEncoder hash:", encoded);
    
    console.log("\n✅ All ethers v6 tests passed!");
    
  } catch (error) {
    console.error("❌ Ethers v6 test failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });









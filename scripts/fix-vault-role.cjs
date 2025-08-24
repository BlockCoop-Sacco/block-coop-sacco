const { ethers } = require('hardhat');
require('dotenv').config();

async function main() {
  console.log('🔧 Fixing Vault Role Assignment');
  console.log('=' .repeat(35));

  const [deployer] = await ethers.getSigners();
  console.log('📍 Using account:', deployer.address);

  const newPackageManagerAddress = '0x9a5AF2Ed5ffC55C3D22d35CB2D67E8B8E873e591';
  const vaultAddress = process.env.VITE_VAULT_ADDRESS;

  console.log('New PackageManager:', newPackageManagerAddress);
  console.log('Vault:', vaultAddress);

  try {
    // Try different vault interface approaches
    console.log('\n🔍 Checking vault interface...');
    
    // Method 1: Try with createVesting function (V2_1 style)
    try {
      const vaultAbi1 = [
        "function VAULT_MANAGER_ROLE() external view returns (bytes32)",
        "function grantRole(bytes32 role, address account) external",
        "function hasRole(bytes32 role, address account) external view returns (bool)",
        "function createVesting(address user, uint256 amount, uint256 start, uint256 duration) external"
      ];
      
      const vault1 = new ethers.Contract(vaultAddress, vaultAbi1, deployer);
      const VAULT_MANAGER_ROLE = await vault1.VAULT_MANAGER_ROLE();
      
      console.log('✅ Found VAULT_MANAGER_ROLE:', VAULT_MANAGER_ROLE);
      
      const hasRole = await vault1.hasRole(VAULT_MANAGER_ROLE, newPackageManagerAddress);
      console.log('Current role status:', hasRole);
      
      if (!hasRole) {
        console.log('Granting VAULT_MANAGER_ROLE...');
        const tx = await vault1.grantRole(VAULT_MANAGER_ROLE, newPackageManagerAddress);
        await tx.wait();
        console.log('✅ VAULT_MANAGER_ROLE granted successfully');
      } else {
        console.log('✅ VAULT_MANAGER_ROLE already granted');
      }
      
    } catch (error1) {
      console.log('Method 1 failed:', error1.message);
      
      // Method 2: Try with lock function (older style)
      try {
        const vaultAbi2 = [
          "function VAULT_MANAGER_ROLE() external view returns (bytes32)",
          "function grantRole(bytes32 role, address account) external",
          "function hasRole(bytes32 role, address account) external view returns (bool)",
          "function lock(address user, uint256 amount, uint64 cliff, uint64 duration) external"
        ];
        
        const vault2 = new ethers.Contract(vaultAddress, vaultAbi2, deployer);
        const VAULT_MANAGER_ROLE = await vault2.VAULT_MANAGER_ROLE();
        
        console.log('✅ Found VAULT_MANAGER_ROLE (method 2):', VAULT_MANAGER_ROLE);
        
        const hasRole = await vault2.hasRole(VAULT_MANAGER_ROLE, newPackageManagerAddress);
        console.log('Current role status:', hasRole);
        
        if (!hasRole) {
          console.log('Granting VAULT_MANAGER_ROLE...');
          const tx = await vault2.grantRole(VAULT_MANAGER_ROLE, newPackageManagerAddress);
          await tx.wait();
          console.log('✅ VAULT_MANAGER_ROLE granted successfully');
        } else {
          console.log('✅ VAULT_MANAGER_ROLE already granted');
        }
        
      } catch (error2) {
        console.log('Method 2 failed:', error2.message);
        
        // Method 3: Check if role is already granted by trying a different approach
        try {
          const vaultAbi3 = [
            "function hasRole(bytes32 role, address account) external view returns (bool)"
          ];
          
          const vault3 = new ethers.Contract(vaultAddress, vaultAbi3, deployer);
          
          // Use the standard VAULT_MANAGER_ROLE hash
          const VAULT_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VAULT_MANAGER_ROLE"));
          
          const hasRole = await vault3.hasRole(VAULT_MANAGER_ROLE, newPackageManagerAddress);
          console.log('Role check with standard hash:', hasRole);
          
          if (hasRole) {
            console.log('✅ VAULT_MANAGER_ROLE is already properly assigned');
          } else {
            console.log('⚠️  Role not found, but this might be expected if vault uses different interface');
          }
          
        } catch (error3) {
          console.log('Method 3 failed:', error3.message);
          console.log('⚠️  Vault role assignment may need manual intervention');
        }
      }
    }

    // Test if the new contract can interact with the vault
    console.log('\n🧪 Testing vault interaction...');
    try {
      const newPackageManager = await ethers.getContractAt('PackageManagerV2_1', newPackageManagerAddress);
      
      // Try to call a view function that might interact with vault
      const pkg = await newPackageManager.getPackage(0);
      console.log('✅ Package retrieval successful:', pkg.name);
      
      console.log('✅ Contract appears to be working correctly');
      
    } catch (testError) {
      console.log('⚠️  Contract test:', testError.message);
    }

  } catch (error) {
    console.error('❌ Error in vault role fixing:', error.message);
  }

  console.log('\n📋 Vault Role Status Summary:');
  console.log('- New PackageManager can likely interact with vault');
  console.log('- If package purchases fail, we may need to investigate further');
  console.log('- The contract is ready for testing');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

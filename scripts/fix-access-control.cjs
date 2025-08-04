const { ethers } = require('hardhat');
require('dotenv').config();

async function main() {
  console.log('🔧 Fixing Access Control Issues');
  console.log('=' .repeat(35));

  const [deployer] = await ethers.getSigners();
  console.log('📍 Using account:', deployer.address);

  const newContractAddress = '0x9a5AF2Ed5ffC55C3D22d35CB2D67E8B8E873e591';
  const vaultAddress = process.env.VITE_VAULT_ADDRESS;

  console.log('\n📋 Addresses:');
  console.log('New Contract:', newContractAddress);
  console.log('Vault:', vaultAddress);

  try {
    // Step 1: Identify the missing role
    console.log('\n🔍 1. Identifying Missing Role');
    console.log('=' .repeat(30));

    const missingRoleHash = '0xaf9a8bb3cbd6b84fbccefa71ff73e26e798553c6914585a84886212a46a90279';
    console.log('Missing Role Hash:', missingRoleHash);

    // Calculate known role hashes
    const VAULT_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VAULT_MANAGER_ROLE"));
    const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
    const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;

    console.log('VAULT_MANAGER_ROLE hash:', VAULT_MANAGER_ROLE);
    console.log('MINTER_ROLE hash:', MINTER_ROLE);
    console.log('DEFAULT_ADMIN_ROLE hash:', DEFAULT_ADMIN_ROLE);

    if (missingRoleHash === VAULT_MANAGER_ROLE) {
      console.log('✅ Missing role identified: VAULT_MANAGER_ROLE');
    } else if (missingRoleHash === MINTER_ROLE) {
      console.log('✅ Missing role identified: MINTER_ROLE');
    } else {
      console.log('⚠️  Unknown role hash');
    }

    // Step 2: Try different vault interfaces to grant the role
    console.log('\n🔧 2. Attempting to Grant VAULT_MANAGER_ROLE');
    console.log('=' .repeat(45));

    // Method 1: Try with standard AccessControl interface
    try {
      const vaultAbi1 = [
        "function grantRole(bytes32 role, address account) external",
        "function hasRole(bytes32 role, address account) external view returns (bool)",
        "function getRoleAdmin(bytes32 role) external view returns (bytes32)"
      ];

      const vault1 = new ethers.Contract(vaultAddress, vaultAbi1, deployer);
      
      console.log('Checking current role status...');
      const hasRole = await vault1.hasRole(VAULT_MANAGER_ROLE, newContractAddress);
      console.log('Current VAULT_MANAGER_ROLE status:', hasRole);

      if (!hasRole) {
        console.log('Attempting to grant VAULT_MANAGER_ROLE...');
        
        // Check if we have admin rights
        const roleAdmin = await vault1.getRoleAdmin(VAULT_MANAGER_ROLE);
        console.log('Role admin for VAULT_MANAGER_ROLE:', roleAdmin);
        
        const hasAdminRole = await vault1.hasRole(roleAdmin, deployer.address);
        console.log('Deployer has admin role:', hasAdminRole);

        if (hasAdminRole) {
          const tx = await vault1.grantRole(VAULT_MANAGER_ROLE, newContractAddress);
          await tx.wait();
          console.log('✅ VAULT_MANAGER_ROLE granted successfully');
        } else {
          console.log('❌ Deployer does not have admin rights to grant role');
        }
      } else {
        console.log('✅ VAULT_MANAGER_ROLE already granted');
      }

    } catch (error1) {
      console.log('Method 1 failed:', error1.message);

      // Method 2: Try with different vault interface
      try {
        const vaultAbi2 = [
          "function grantRole(bytes32 role, address account) external",
          "function hasRole(bytes32 role, address account) external view returns (bool)",
          "function DEFAULT_ADMIN_ROLE() external view returns (bytes32)"
        ];

        const vault2 = new ethers.Contract(vaultAddress, vaultAbi2, deployer);
        
        const hasRole = await vault2.hasRole(VAULT_MANAGER_ROLE, newContractAddress);
        console.log('Current VAULT_MANAGER_ROLE status (method 2):', hasRole);

        if (!hasRole) {
          const DEFAULT_ADMIN = await vault2.DEFAULT_ADMIN_ROLE();
          const hasAdminRole = await vault2.hasRole(DEFAULT_ADMIN, deployer.address);
          console.log('Deployer has DEFAULT_ADMIN_ROLE:', hasAdminRole);

          if (hasAdminRole) {
            const tx = await vault2.grantRole(VAULT_MANAGER_ROLE, newContractAddress);
            await tx.wait();
            console.log('✅ VAULT_MANAGER_ROLE granted successfully (method 2)');
          } else {
            console.log('❌ Deployer does not have admin rights (method 2)');
          }
        }

      } catch (error2) {
        console.log('Method 2 failed:', error2.message);

        // Method 3: Check if it's a different role issue
        console.log('\n🔍 3. Checking Other Potential Role Issues');
        console.log('=' .repeat(40));

        try {
          // Check if the contract itself needs a specific role
          const newContract = await ethers.getContractAt('PackageManagerV2_1', newContractAddress);
          
          // Check if the contract has the required admin role
          const DEFAULT_ADMIN_ROLE = await newContract.DEFAULT_ADMIN_ROLE();
          const hasAdminRole = await newContract.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
          console.log('Deployer has admin role on new contract:', hasAdminRole);

          // Check PACKAGE_MANAGER_ROLE if it exists
          try {
            const PACKAGE_MANAGER_ROLE = await newContract.PACKAGE_MANAGER_ROLE();
            const hasPackageManagerRole = await newContract.hasRole(PACKAGE_MANAGER_ROLE, deployer.address);
            console.log('PACKAGE_MANAGER_ROLE hash:', PACKAGE_MANAGER_ROLE);
            console.log('Deployer has PACKAGE_MANAGER_ROLE:', hasPackageManagerRole);

            if (PACKAGE_MANAGER_ROLE === missingRoleHash) {
              console.log('✅ Missing role is PACKAGE_MANAGER_ROLE');
              if (!hasPackageManagerRole) {
                console.log('Granting PACKAGE_MANAGER_ROLE to deployer...');
                const tx = await newContract.grantRole(PACKAGE_MANAGER_ROLE, deployer.address);
                await tx.wait();
                console.log('✅ PACKAGE_MANAGER_ROLE granted to deployer');
              }
            }
          } catch (pmError) {
            console.log('PACKAGE_MANAGER_ROLE not found or accessible');
          }

        } catch (error3) {
          console.log('Method 3 failed:', error3.message);
        }
      }
    }

    // Step 3: Test purchase function after role fix
    console.log('\n🧪 3. Testing Purchase Function After Fix');
    console.log('=' .repeat(40));

    try {
      const newContract = await ethers.getContractAt('PackageManagerV2_1', newContractAddress);
      
      console.log('Testing purchase simulation...');
      await newContract.purchase.staticCall(2, ethers.ZeroAddress);
      console.log('✅ Purchase simulation now works!');
      
    } catch (testError) {
      console.error('❌ Purchase still failing:', testError.message);
      
      if (testError.data) {
        try {
          const newContract = await ethers.getContractAt('PackageManagerV2_1', newContractAddress);
          const decodedError = newContract.interface.parseError(testError.data);
          console.error('Decoded error:', decodedError);
        } catch (decodeErr) {
          console.error('Could not decode error');
        }
      }
    }

  } catch (error) {
    console.error('❌ Critical error:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

const { ethers } = require('hardhat');
require('dotenv').config();

async function main() {
  console.log('🔧 Fixing Vesting Vault Role Issue');
  console.log('=' .repeat(35));

  const [deployer] = await ethers.getSigners();
  console.log('📍 Using account:', deployer.address);

  const newContractAddress = '0x9a5AF2Ed5ffC55C3D22d35CB2D67E8B8E873e591';
  const vaultAddress = process.env.VITE_VAULT_ADDRESS;
  const unknownRoleHash = '0xaf9a8bb3cbd6b84fbccefa71ff73e26e798553c6914585a84886212a46a90279';

  console.log('\n📋 Addresses:');
  console.log('New Contract:', newContractAddress);
  console.log('Vault:', vaultAddress);
  console.log('Unknown Role Hash:', unknownRoleHash);

  try {
    // Step 1: Check what roles the vault contract has
    console.log('\n🔍 1. Investigating Vault Contract Roles');
    console.log('=' .repeat(40));

    const vaultAbi = [
      "function hasRole(bytes32 role, address account) external view returns (bool)",
      "function grantRole(bytes32 role, address account) external",
      "function getRoleAdmin(bytes32 role) external view returns (bytes32)",
      "function DEFAULT_ADMIN_ROLE() external view returns (bytes32)",
      "function lock(address user, uint256 amount, uint64 cliff, uint64 duration) external",
      "function createVesting(address user, uint256 amount, uint256 start, uint256 duration) external"
    ];

    const vault = new ethers.Contract(vaultAddress, vaultAbi, deployer);

    // Check if the unknown role hash is the one we need for the vault
    console.log('Checking if new contract has unknown role on vault...');
    try {
      const hasUnknownRole = await vault.hasRole(unknownRoleHash, newContractAddress);
      console.log('New contract has unknown role on vault:', hasUnknownRole);

      if (!hasUnknownRole) {
        console.log('Attempting to grant unknown role to new contract...');
        
        // Check if deployer can grant this role
        const roleAdmin = await vault.getRoleAdmin(unknownRoleHash);
        console.log('Role admin for unknown role:', roleAdmin);
        
        const hasAdminRole = await vault.hasRole(roleAdmin, deployer.address);
        console.log('Deployer has admin role for unknown role:', hasAdminRole);

        if (hasAdminRole) {
          console.log('Granting unknown role to new contract...');
          const tx = await vault.grantRole(unknownRoleHash, newContractAddress);
          await tx.wait();
          console.log('✅ Unknown role granted to new contract');
        } else {
          console.log('❌ Deployer cannot grant this role');
        }
      } else {
        console.log('✅ New contract already has the unknown role');
      }
    } catch (roleError) {
      console.log('Error checking unknown role:', roleError.message);
    }

    // Step 2: Check if it's a different vault interface issue
    console.log('\n🔍 2. Checking Vault Interface Compatibility');
    console.log('=' .repeat(45));

    // Check if the vault uses 'lock' or 'createVesting'
    try {
      console.log('Testing vault.lock function...');
      // Try to call lock with static call to see if it works
      await vault.lock.staticCall(deployer.address, 1, 0, 86400);
      console.log('✅ vault.lock function is accessible');
    } catch (lockError) {
      console.log('❌ vault.lock failed:', lockError.message);
      
      // Try createVesting instead
      try {
        console.log('Testing vault.createVesting function...');
        await vault.createVesting.staticCall(deployer.address, 1, Math.floor(Date.now() / 1000), 86400);
        console.log('✅ vault.createVesting function is accessible');
        console.log('⚠️  Contract might need to use createVesting instead of lock');
      } catch (createError) {
        console.log('❌ vault.createVesting also failed:', createError.message);
      }
    }

    // Step 3: Check the old contract to see what role it has
    console.log('\n🔍 3. Checking Old Contract Vault Permissions');
    console.log('=' .repeat(45));

    const oldContractAddress = '0xF7075036dBd8d393B4DcF63071C3eF4abD8f31b9';
    
    try {
      const hasUnknownRoleOld = await vault.hasRole(unknownRoleHash, oldContractAddress);
      console.log('Old contract has unknown role:', hasUnknownRoleOld);

      if (hasUnknownRoleOld) {
        console.log('✅ Old contract has the role, need to grant to new contract');
        
        // Try to grant the role
        try {
          const roleAdmin = await vault.getRoleAdmin(unknownRoleHash);
          const hasAdminRole = await vault.hasRole(roleAdmin, deployer.address);
          
          if (hasAdminRole) {
            console.log('Granting role from old contract pattern...');
            const tx = await vault.grantRole(unknownRoleHash, newContractAddress);
            await tx.wait();
            console.log('✅ Role granted based on old contract pattern');
          }
        } catch (grantError) {
          console.log('Could not grant role:', grantError.message);
        }
      }
    } catch (oldRoleError) {
      console.log('Error checking old contract role:', oldRoleError.message);
    }

    // Step 4: Try to reverse engineer the role from the hash
    console.log('\n🔍 4. Reverse Engineering Role Name');
    console.log('=' .repeat(35));

    // Common vault-related role names
    const vaultRoles = [
      'VAULT_MANAGER_ROLE',
      'LOCKER_ROLE', 
      'VESTING_ROLE',
      'VESTING_MANAGER_ROLE',
      'LOCK_MANAGER_ROLE',
      'VAULT_OPERATOR_ROLE',
      'VAULT_ADMIN_ROLE',
      'VESTING_ADMIN_ROLE',
      'LOCK_ADMIN_ROLE'
    ];

    for (const roleName of vaultRoles) {
      const roleHash = ethers.keccak256(ethers.toUtf8Bytes(roleName));
      if (roleHash === unknownRoleHash) {
        console.log(`✅ FOUND: Unknown role is ${roleName}`);
        break;
      }
    }

    // Step 5: Final test
    console.log('\n🧪 5. Final Purchase Test');
    console.log('=' .repeat(25));

    const newContract = await ethers.getContractAt('PackageManagerV2_1', newContractAddress);
    
    try {
      await newContract.purchase.staticCall(2, ethers.ZeroAddress);
      console.log('✅ Purchase simulation now works!');
    } catch (finalError) {
      console.error('❌ Purchase still failing:', finalError.message);
      
      if (finalError.data) {
        try {
          const decodedError = newContract.interface.parseError(finalError.data);
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

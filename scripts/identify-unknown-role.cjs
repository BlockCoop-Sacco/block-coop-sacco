const { ethers } = require('hardhat');
require('dotenv').config();

async function main() {
  console.log('🔍 Identifying Unknown Role Hash');
  console.log('=' .repeat(35));

  const unknownRoleHash = '0xaf9a8bb3cbd6b84fbccefa71ff73e26e798553c6914585a84886212a46a90279';
  console.log('Unknown Role Hash:', unknownRoleHash);

  // List of possible role names to check
  const possibleRoles = [
    'VAULT_MANAGER_ROLE',
    'MINTER_ROLE', 
    'ADMIN_ROLE',
    'DEFAULT_ADMIN_ROLE',
    'PACKAGE_MANAGER_ROLE',
    'PAUSER_ROLE',
    'UPGRADER_ROLE',
    'OPERATOR_ROLE',
    'MANAGER_ROLE',
    'CONTROLLER_ROLE',
    'OWNER_ROLE',
    'TREASURY_ROLE',
    'TAX_MANAGER_ROLE',
    'LIQUIDITY_MANAGER_ROLE',
    'PURCHASE_MANAGER_ROLE',
    'VESTING_MANAGER_ROLE',
    'LP_MANAGER_ROLE',
    'ROUTER_ROLE',
    'FACTORY_ROLE'
  ];

  console.log('\n🔍 Checking Possible Role Names:');
  console.log('=' .repeat(35));

  for (const roleName of possibleRoles) {
    const roleHash = ethers.keccak256(ethers.toUtf8Bytes(roleName));
    console.log(`${roleName}: ${roleHash}`);
    
    if (roleHash === unknownRoleHash) {
      console.log(`✅ MATCH FOUND: ${roleName}`);
      break;
    }
  }

  // Check if it's a role from one of the external contracts
  console.log('\n🔍 Checking External Contract Roles:');
  console.log('=' .repeat(35));

  try {
    const [deployer] = await ethers.getSigners();
    const newContractAddress = '0x9a5AF2Ed5ffC55C3D22d35CB2D67E8B8E873e591';
    
    // Check the new contract for any role constants
    const newContract = await ethers.getContractAt('PackageManagerV2_1', newContractAddress);
    
    try {
      const PACKAGE_MANAGER_ROLE = await newContract.PACKAGE_MANAGER_ROLE();
      console.log('PACKAGE_MANAGER_ROLE from contract:', PACKAGE_MANAGER_ROLE);
      
      if (PACKAGE_MANAGER_ROLE === unknownRoleHash) {
        console.log('✅ MATCH: Unknown role is PACKAGE_MANAGER_ROLE');
        
        // Check if deployer has this role
        const hasRole = await newContract.hasRole(PACKAGE_MANAGER_ROLE, deployer.address);
        console.log('Deployer has PACKAGE_MANAGER_ROLE:', hasRole);
        
        if (!hasRole) {
          console.log('Granting PACKAGE_MANAGER_ROLE to deployer...');
          const tx = await newContract.grantRole(PACKAGE_MANAGER_ROLE, deployer.address);
          await tx.wait();
          console.log('✅ PACKAGE_MANAGER_ROLE granted to deployer');
        }
      }
    } catch (error) {
      console.log('PACKAGE_MANAGER_ROLE not accessible:', error.message);
    }

    // Check other external contracts
    const shareAddress = process.env.VITE_SHARE_ADDRESS;
    const lpAddress = process.env.VITE_LP_ADDRESS;
    const vaultAddress = process.env.VITE_VAULT_ADDRESS;

    console.log('\nChecking BLOCKS token roles...');
    try {
      const shareTokenAbi = [
        "function MINTER_ROLE() external view returns (bytes32)",
        "function PAUSER_ROLE() external view returns (bytes32)",
        "function hasRole(bytes32 role, address account) external view returns (bool)",
        "function grantRole(bytes32 role, address account) external"
      ];
      
      const shareToken = new ethers.Contract(shareAddress, shareTokenAbi, deployer);
      
      try {
        const PAUSER_ROLE = await shareToken.PAUSER_ROLE();
        console.log('BLOCKS PAUSER_ROLE:', PAUSER_ROLE);
        
        if (PAUSER_ROLE === unknownRoleHash) {
          console.log('✅ MATCH: Unknown role is PAUSER_ROLE on BLOCKS token');
          
          const hasRole = await shareToken.hasRole(PAUSER_ROLE, newContractAddress);
          console.log('New contract has PAUSER_ROLE:', hasRole);
          
          if (!hasRole) {
            console.log('Granting PAUSER_ROLE to new contract...');
            const tx = await shareToken.grantRole(PAUSER_ROLE, newContractAddress);
            await tx.wait();
            console.log('✅ PAUSER_ROLE granted to new contract');
          }
        }
      } catch (pauserError) {
        console.log('PAUSER_ROLE not found on BLOCKS token');
      }
      
    } catch (shareError) {
      console.log('Error checking BLOCKS token:', shareError.message);
    }

    // Check if it's a role from the old contract that we need to replicate
    console.log('\nChecking old contract for role patterns...');
    try {
      const oldContractAddress = '0xF7075036dBd8d393B4DcF63071C3eF4abD8f31b9';
      const oldContract = await ethers.getContractAt('PackageManagerV2_1', oldContractAddress);
      
      // Check if old contract has the same role
      try {
        const hasRoleInOld = await oldContract.hasRole(unknownRoleHash, oldContractAddress);
        console.log('Old contract has unknown role:', hasRoleInOld);
        
        if (hasRoleInOld) {
          console.log('✅ Role exists in old contract, need to grant to new contract');
          
          // Try to grant the role to new contract
          const hasAdminRole = await newContract.hasRole(await newContract.DEFAULT_ADMIN_ROLE(), deployer.address);
          if (hasAdminRole) {
            console.log('Attempting to grant unknown role to new contract...');
            const tx = await newContract.grantRole(unknownRoleHash, newContractAddress);
            await tx.wait();
            console.log('✅ Unknown role granted to new contract');
          }
        }
      } catch (oldRoleError) {
        console.log('Could not check role in old contract:', oldRoleError.message);
      }
      
    } catch (oldContractError) {
      console.log('Error accessing old contract:', oldContractError.message);
    }

    // Final test
    console.log('\n🧪 Final Purchase Test:');
    console.log('=' .repeat(25));
    
    try {
      await newContract.purchase.staticCall(2, ethers.ZeroAddress);
      console.log('✅ Purchase simulation now works!');
    } catch (finalError) {
      console.error('❌ Purchase still failing:', finalError.message);
      
      if (finalError.data) {
        try {
          const decodedError = newContract.interface.parseError(finalError.data);
          console.error('Final decoded error:', decodedError);
        } catch (decodeErr) {
          console.error('Could not decode final error');
        }
      }
    }

  } catch (error) {
    console.error('❌ Error during role identification:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

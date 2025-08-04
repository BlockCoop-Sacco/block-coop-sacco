const fs = require('fs');
const path = require('path');

async function main() {
    console.log('📋 Extracting ABIs for BlockCoop V2 Fixed System');
    console.log('=' .repeat(50));

    // Contract names and their corresponding artifact paths
    const contracts = {
        'BLOCKS': 'contracts/BlockCoopV2.sol/BLOCKS.json',
        'BLOCKS_LP': 'contracts/BlockCoopV2.sol/BLOCKS_LP.json',
        'VestingVault': 'contracts/BlockCoopV2.sol/VestingVault.json',
        'SwapTaxManager': 'contracts/BlockCoopV2.sol/SwapTaxManager.json',
        'PackageManagerV2_Fixed': 'contracts/PackageManagerV2_Fixed.sol/PackageManagerV2_Fixed.json',
        'DividendDistributor': 'contracts/DividendDistributor.sol/DividendDistributor.json',
        'SecondaryMarket': 'contracts/SecondaryMarket.sol/SecondaryMarket.json'
    };

    // Frontend ABI file mappings
    const abiMappings = {
        'BLOCKS': 'src/abi/BLOCKS.json',
        'BLOCKS_LP': 'src/abi/BLOCKS_LP.json',
        'VestingVault': 'src/abi/VestingVault.json',
        'SwapTaxManager': 'src/abi/SwapTaxManager.json',
        'PackageManagerV2_Fixed': 'src/abi/PackageManager.json', // Map to existing PackageManager.json
        'DividendDistributor': 'src/abi/DividendDistributor.json',
        'SecondaryMarket': 'src/abi/SecondaryMarket.json'
    };

    const artifactsDir = path.join(__dirname, '..', 'artifacts');
    const abiDir = path.join(__dirname, '..', 'src', 'abi');

    // Ensure ABI directory exists
    if (!fs.existsSync(abiDir)) {
        fs.mkdirSync(abiDir, { recursive: true });
    }

    let extractedCount = 0;
    let errors = [];

    for (const [contractName, artifactPath] of Object.entries(contracts)) {
        try {
            const fullArtifactPath = path.join(artifactsDir, artifactPath);
            
            if (!fs.existsSync(fullArtifactPath)) {
                errors.push(`❌ Artifact not found: ${artifactPath}`);
                continue;
            }

            // Read the artifact file
            const artifactContent = fs.readFileSync(fullArtifactPath, 'utf8');
            const artifact = JSON.parse(artifactContent);

            if (!artifact.abi) {
                errors.push(`❌ No ABI found in artifact: ${contractName}`);
                continue;
            }

            // Create ABI file content
            const abiContent = {
                abi: artifact.abi
            };

            // Write to frontend ABI file
            const frontendAbiPath = path.join(__dirname, '..', abiMappings[contractName]);
            fs.writeFileSync(frontendAbiPath, JSON.stringify(abiContent, null, 2));

            console.log(`✅ ${contractName} ABI extracted to ${abiMappings[contractName]}`);
            extractedCount++;

        } catch (error) {
            errors.push(`❌ Error extracting ${contractName}: ${error.message}`);
        }
    }

    console.log('\n📊 Extraction Summary:');
    console.log(`✅ Successfully extracted: ${extractedCount} ABIs`);
    console.log(`❌ Errors: ${errors.length}`);

    if (errors.length > 0) {
        console.log('\n🚨 Errors encountered:');
        errors.forEach(error => console.log(error));
    }

    // Also extract USDT ABI if available (from existing deployment)
    try {
        const usdtArtifactPath = path.join(artifactsDir, 'contracts/BlockCoopV2.sol/USDTTestToken.json');
        if (fs.existsSync(usdtArtifactPath)) {
            const usdtArtifact = JSON.parse(fs.readFileSync(usdtArtifactPath, 'utf8'));
            const usdtAbiContent = { abi: usdtArtifact.abi };
            const usdtAbiPath = path.join(abiDir, 'USDTTestToken.json');
            fs.writeFileSync(usdtAbiPath, JSON.stringify(usdtAbiContent, null, 2));
            console.log(`✅ USDTTestToken ABI extracted to src/abi/USDTTestToken.json`);
            extractedCount++;
        }
    } catch (error) {
        console.log(`⚠️  Could not extract USDT ABI: ${error.message}`);
    }

    console.log('\n🎉 ABI extraction complete!');
    console.log(`📁 Total ABIs available: ${extractedCount}`);
    
    return extractedCount;
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('❌ ABI extraction failed:', error);
            process.exit(1);
        });
}

module.exports = main;

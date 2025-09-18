"""
Blockchain Data Service for BlockCoop Admin Dashboard
Provides real-time data from BSC smart contracts
"""

import asyncio
import aiohttp
from web3 import Web3
from web3.middleware import geth_poa_middleware
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

class BlockchainDataService:
    def __init__(self):
        # BSC Mainnet configuration
        self.rpc_url = os.environ.get('BSC_RPC_URL', 'https://bsc-dataseed.binance.org/')
        self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))
        
        # Add PoA middleware for BSC
        self.w3.middleware_onion.inject(geth_poa_middleware, layer=0)
        
        # Contract addresses (BSC Mainnet)
        self.contracts = {
            'packageManager': '0x50a837529B045c3f679cd14De2252515dF803F7e',
            'blocksToken': '0x292E1B8CBE91623E71D6532e6BE6B881Cc0a9c31',
            'usdt': '0x55d398326f99059ff775485246999027b3197955',
            'vestingVault': '0x662c77598491e91174506a4C1e7990825c3d7abA',
            'secondaryMarket': '0x02D855F16695f7937da07aA8E4bAB7298548650E',
            'treasury': '0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4'
        }
        
        # Load contract ABIs
        self.abis = self._load_abis()
        
        # Initialize contract instances
        self.contract_instances = self._initialize_contracts()
    
    def _load_abis(self) -> Dict[str, List]:
        """Load contract ABIs from JSON files"""
        abi_dir = os.path.join(os.path.dirname(__file__), '..', 'abis')
        abis = {}
        
        # Contract ABI mappings
        abi_files = {
            'packageManager': 'PackageManager.json',
            'blocksToken': 'ShareToken.json',
            'usdt': 'ERC20.json',
            'vestingVault': 'VestingVault.json'
        }
        
        for contract_name, filename in abi_files.items():
            try:
                abi_path = os.path.join(abi_dir, filename)
                if os.path.exists(abi_path):
                    with open(abi_path, 'r') as f:
                        abis[contract_name] = json.load(f)
                else:
                    # Fallback to minimal ERC20 ABI for basic functionality
                    abis[contract_name] = self._get_minimal_erc20_abi()
            except Exception as e:
                print(f"Warning: Could not load ABI for {contract_name}: {e}")
                abis[contract_name] = self._get_minimal_erc20_abi()
        
        return abis
    
    def _get_minimal_erc20_abi(self) -> List:
        """Minimal ERC20 ABI for basic token operations"""
        return [
            {
                "constant": True,
                "inputs": [{"name": "_owner", "type": "address"}],
                "name": "balanceOf",
                "outputs": [{"name": "balance", "type": "uint256"}],
                "type": "function"
            },
            {
                "constant": True,
                "inputs": [],
                "name": "totalSupply",
                "outputs": [{"name": "", "type": "uint256"}],
                "type": "function"
            },
            {
                "constant": True,
                "inputs": [],
                "name": "decimals",
                "outputs": [{"name": "", "type": "uint8"}],
                "type": "function"
            },
            {
                "constant": True,
                "inputs": [],
                "name": "symbol",
                "outputs": [{"name": "", "type": "string"}],
                "type": "function"
            }
        ]
    
    def _initialize_contracts(self) -> Dict[str, Any]:
        """Initialize Web3 contract instances"""
        contracts = {}
        
        for contract_name, address in self.contracts.items():
            try:
                if contract_name in self.abis:
                    contracts[contract_name] = self.w3.eth.contract(
                        address=Web3.to_checksum_address(address),
                        abi=self.abis[contract_name]
                    )
            except Exception as e:
                print(f"Warning: Could not initialize contract {contract_name}: {e}")
        
        return contracts
    
    def is_connected(self) -> bool:
        """Check if Web3 connection is active"""
        try:
            return self.w3.is_connected()
        except:
            return False
    
    def get_latest_block(self) -> Optional[int]:
        """Get the latest block number"""
        try:
            return self.w3.eth.block_number
        except:
            return None
    
    def get_token_info(self, token_address: str) -> Dict[str, Any]:
        """Get basic token information"""
        try:
            contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(token_address),
                abi=self._get_minimal_erc20_abi()
            )
            
            return {
                'address': token_address,
                'symbol': contract.functions.symbol().call(),
                'decimals': contract.functions.decimals().call(),
                'totalSupply': contract.functions.totalSupply().call()
            }
        except Exception as e:
            return {'error': str(e)}
    
    def get_blocks_token_stats(self) -> Dict[str, Any]:
        """Get BLOCKS token statistics"""
        try:
            if 'blocksToken' not in self.contract_instances:
                return {'error': 'BLOCKS token contract not available'}
            
            contract = self.contract_instances['blocksToken']
            
            return {
                'address': self.contracts['blocksToken'],
                'totalSupply': contract.functions.totalSupply().call(),
                'decimals': contract.functions.decimals().call(),
                'symbol': contract.functions.symbol().call()
            }
        except Exception as e:
            return {'error': str(e)}
    
    def get_usdt_stats(self) -> Dict[str, Any]:
        """Get USDT token statistics"""
        try:
            if 'usdt' not in self.contract_instances:
                return {'error': 'USDT contract not available'}
            
            contract = self.contract_instances['usdt']
            
            return {
                'address': self.contracts['usdt'],
                'totalSupply': contract.functions.totalSupply().call(),
                'decimals': contract.functions.decimals().call(),
                'symbol': contract.functions.symbol().call()
            }
        except Exception as e:
            return {'error': str(e)}
    
    def get_treasury_balance(self) -> Dict[str, Any]:
        """Get treasury wallet balances"""
        try:
            treasury_address = self.contracts['treasury']
            
            balances = {}
            
            # Get BLOCKS balance
            if 'blocksToken' in self.contract_instances:
                blocks_balance = self.contract_instances['blocksToken'].functions.balanceOf(treasury_address).call()
                balances['blocks'] = blocks_balance
            
            # Get USDT balance
            if 'usdt' in self.contract_instances:
                usdt_balance = self.contract_instances['usdt'].functions.balanceOf(treasury_address).call()
                balances['usdt'] = usdt_balance
            
            # Get BNB balance
            bnb_balance = self.w3.eth.get_balance(treasury_address)
            balances['bnb'] = bnb_balance
            
            return {
                'address': treasury_address,
                'balances': balances
            }
        except Exception as e:
            return {'error': str(e)}
    
    def get_network_info(self) -> Dict[str, Any]:
        """Get BSC network information"""
        try:
            return {
                'chainId': self.w3.eth.chain_id,
                'networkName': 'BSC Mainnet',
                'latestBlock': self.w3.eth.block_number,
                'gasPrice': self.w3.eth.gas_price,
                'isConnected': self.w3.is_connected()
            }
        except Exception as e:
            return {'error': str(e)}
    
    async def get_comprehensive_stats(self) -> Dict[str, Any]:
        """Get comprehensive blockchain statistics"""
        try:
            stats = {
                'network': self.get_network_info(),
                'blocksToken': self.get_blocks_token_stats(),
                'usdt': self.get_usdt_stats(),
                'treasury': self.get_treasury_balance(),
                'timestamp': datetime.utcnow().isoformat()
            }
            
            return stats
        except Exception as e:
            return {'error': str(e)}

# Global instance
blockchain_service = BlockchainDataService()

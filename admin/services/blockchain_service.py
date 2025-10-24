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
        self.contracts = self._load_contract_addresses()
        
        # Load contract ABIs
        self.abis = self._load_abis()
        
        # Initialize contract instances
        self.contract_instances = self._initialize_contracts()

    def _load_contract_addresses(self) -> Dict[str, str]:
        """Prefer env overrides, then deployments JSON, then hardcoded fallback."""
        # Hardcoded fallback
        defaults = {
            'packageManager': '0x50a837529B045c3f679cd14De2252515dF803F7e',
            'blocksToken': '0x292E1B8CBE91623E71D6532e6BE6B881Cc0a9c31',
            'usdt': '0x55d398326f99059ff775485246999027b3197955',
            'vestingVault': '0x662c77598491e91174506a4C1e7990825c3d7abA',
            'secondaryMarket': '0x02D855F16695f7937da07aA8E4bAB7298548650E',
            'treasury': '0xD04edC3225cEF6e82e50Dc559d38733180743b94',
            'factory': '0xca143ce32fe78f1f7019d7d551a6402fc5350c73'
        }
        # Try deployments JSON
        try:
            root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
            deployments_path = os.path.join(root, 'deployments', 'deployments-mainnet-v2_2.json')
            if os.path.exists(deployments_path):
                with open(deployments_path, 'r') as f:
                    data = json.load(f)
                mapping = {
                    'packageManager': data.get('packageManager'),
                    'blocksToken': data.get('blocks'),
                    'usdt': data.get('usdt'),
                    'vestingVault': data.get('vestingVault'),
                    'secondaryMarket': data.get('secondaryMarket'),
                    'treasury': data.get('treasury'),
                    'factory': data.get('factory'),
                }
                for k, v in mapping.items():
                    if v:
                        defaults[k] = v
        except Exception:
            pass
        # Env overrides
        for key in list(defaults.keys()):
            env_key = f"{key.upper()}_ADDRESS"
            if os.environ.get(env_key):
                defaults[key] = os.environ.get(env_key)
        return defaults
    
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
                        content = json.load(f)
                        # Support Hardhat/Truffle artifact format { abi: [...], ... }
                        if isinstance(content, dict) and 'abi' in content:
                            abis[contract_name] = content['abi']
                        elif isinstance(content, list):
                            abis[contract_name] = content
                        else:
                            raise ValueError('Invalid ABI format')
                else:
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

    def _get_blocks_usdt_price(self) -> Optional[float]:
        """Estimate BLOCKS price in USD using Pancake pair reserves.
        If BLOCKS_USDT_PAIR is not provided, auto-derive from factory using deployed token addresses.
        """
        try:
            pair_address = os.environ.get('BLOCKS_USDT_PAIR')
            if not pair_address:
                # Try factory.getPair(blocks, usdt)
                factory_addr = self.contracts.get('factory')
                blocks_addr = Web3.to_checksum_address(self.contracts['blocksToken'])
                usdt_addr = Web3.to_checksum_address(self.contracts['usdt'])
                if factory_addr:
                    factory_abi = [
                        {"constant": True, "inputs": [{"name": "tokenA", "type": "address"}, {"name": "tokenB", "type": "address"}], "name": "getPair", "outputs": [{"name": "pair", "type": "address"}], "type": "function"}
                    ]
                    factory = self.w3.eth.contract(address=Web3.to_checksum_address(factory_addr), abi=factory_abi)
                    pair_address = factory.functions.getPair(blocks_addr, usdt_addr).call()
                    if int(pair_address, 16) == 0:
                        return None
            # Minimal ABI for UniswapV2-like pair
            pair_abi = [
                {"constant":True,"inputs":[],"name":"getReserves","outputs":[{"name":"_reserve0","type":"uint112"},{"name":"_reserve1","type":"uint112"},{"name":"_blockTimestampLast","type":"uint32"}],"type":"function"},
                {"constant":True,"inputs":[],"name":"token0","outputs":[{"name":"","type":"address"}],"type":"function"},
                {"constant":True,"inputs":[],"name":"token1","outputs":[{"name":"","type":"address"}],"type":"function"}
            ]
            pair = self.w3.eth.contract(address=Web3.to_checksum_address(pair_address), abi=pair_abi)
            token0 = pair.functions.token0().call()
            token1 = pair.functions.token1().call()
            reserves = pair.functions.getReserves().call()
            reserve0, reserve1 = reserves[0], reserves[1]

            blocks_addr = Web3.to_checksum_address(self.contracts['blocksToken'])
            usdt_addr = Web3.to_checksum_address(self.contracts['usdt'])

            # Determine orientation: price = reserveUSDT / reserveBLOCKS adjusted by decimals
            # Fetch decimals
            erc20 = self._get_minimal_erc20_abi()
            token0c = self.w3.eth.contract(address=Web3.to_checksum_address(token0), abi=erc20)
            token1c = self.w3.eth.contract(address=Web3.to_checksum_address(token1), abi=erc20)
            dec0 = token0c.functions.decimals().call()
            dec1 = token1c.functions.decimals().call()

            if Web3.to_checksum_address(token0) == blocks_addr and Web3.to_checksum_address(token1) == usdt_addr:
                blocks = reserve0 / (10 ** dec0)
                usdt = reserve1 / (10 ** dec1)
                return usdt / blocks if blocks > 0 else None
            elif Web3.to_checksum_address(token1) == blocks_addr and Web3.to_checksum_address(token0) == usdt_addr:
                blocks = reserve1 / (10 ** dec1)
                usdt = reserve0 / (10 ** dec0)
                return usdt / blocks if blocks > 0 else None
            return None
        except Exception:
            return None
    
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
    
    def _get_pair_abi(self) -> List[Dict[str, Any]]:
        """Minimal ABI for UniswapV2-like pair contract"""
        return [
            {"constant": True, "inputs": [], "name": "getReserves", "outputs": [
                {"name": "_reserve0", "type": "uint112"},
                {"name": "_reserve1", "type": "uint112"},
                {"name": "_blockTimestampLast", "type": "uint32"}
            ], "type": "function"},
            {"constant": True, "inputs": [], "name": "token0", "outputs": [{"name": "", "type": "address"}], "type": "function"},
            {"constant": True, "inputs": [], "name": "token1", "outputs": [{"name": "", "type": "address"}], "type": "function"}
        ]

    def _normalize_amount(self, amount: int, decimals: int) -> float:
        try:
            return float(amount) / float(10 ** decimals)
        except Exception:
            return 0.0

    def _get_token_meta(self, address: str) -> Dict[str, Any]:
        try:
            erc20 = self._get_minimal_erc20_abi()
            c = self.w3.eth.contract(address=Web3.to_checksum_address(address), abi=erc20)
            return {
                'address': Web3.to_checksum_address(address),
                'symbol': c.functions.symbol().call(),
                'decimals': c.functions.decimals().call()
            }
        except Exception as e:
            return {'address': address, 'symbol': '?', 'decimals': 18, 'error': str(e)}

    def get_liquidity_stats(self) -> Dict[str, Any]:
        """Fetch liquidity stats for configured BLOCKS pools and 24h volume (if possible)."""
        try:
            pair_usdt = os.environ.get('BLOCKS_USDT_PAIR')
            pair_bnb = os.environ.get('BLOCKS_BNB_PAIR')

            pools: List[Dict[str, Any]] = []
            total_liquidity_usd = 0.0
            daily_volume_usd = 0.0

            latest_block = self.w3.eth.block_number if self.is_connected() else None
            # Approximate 24h blocks on BSC (~3s block time)
            blocks_24h = 28800
            from_block = max(0, (latest_block or 0) - blocks_24h) if latest_block is not None else 0
            to_block = latest_block or 'latest'

            def compute_pool_stats(pair_address: str, label: str) -> Dict[str, Any]:
                pair = self.w3.eth.contract(address=Web3.to_checksum_address(pair_address), abi=self._get_pair_abi())
                token0_addr = pair.functions.token0().call()
                token1_addr = pair.functions.token1().call()
                reserves = pair.functions.getReserves().call()
                reserve0, reserve1 = int(reserves[0]), int(reserves[1])

                t0 = self._get_token_meta(token0_addr)
                t1 = self._get_token_meta(token1_addr)

                norm0 = self._normalize_amount(reserve0, t0.get('decimals', 18))
                norm1 = self._normalize_amount(reserve1, t1.get('decimals', 18))

                # TVL estimation in USD: if USDT in pair, TVL ≈ 2 * USDT reserve
                tvl_usd = 0.0
                if t0.get('symbol') == 'USDT':
                    tvl_usd = 2.0 * norm0
                elif t1.get('symbol') == 'USDT':
                    tvl_usd = 2.0 * norm1

                # 24h volume (USD) for USDT pair: sum of USDT amounts in Swap events
                vol_usd = 0.0
                try:
                    swap_topic = self.w3.keccak(text='Swap(address,uint256,uint256,uint256,uint256,address)').hex()
                    logs = self.w3.eth.get_logs({
                        'fromBlock': from_block,
                        'toBlock': to_block,
                        'address': Web3.to_checksum_address(pair_address),
                        'topics': [swap_topic]
                    }) if latest_block is not None else []
                    # Decode data (5 x 32-byte uints): amount0In, amount1In, amount0Out, amount1Out, (padding)
                    for lg in logs:
                        data = lg.get('data', '0x')
                        if not data or data == '0x':
                            continue
                        # Remove 0x and split into 32-byte chunks
                        hex_data = data[2:]
                        chunks = [int(hex_data[i:i+64], 16) for i in range(0, min(len(hex_data), 64*4), 64)]
                        if len(chunks) < 4:
                            continue
                        a0_in, a1_in, a0_out, a1_out = chunks[0], chunks[1], chunks[2], chunks[3]
                        usdt_in = 0
                        usdt_out = 0
                        if t0.get('symbol') == 'USDT':
                            usdt_in += a0_in
                            usdt_out += a0_out
                        if t1.get('symbol') == 'USDT':
                            usdt_in += a1_in
                            usdt_out += a1_out
                        usdt_decimals = t0.get('decimals') if t0.get('symbol') == 'USDT' else (t1.get('decimals') if t1.get('symbol') == 'USDT' else 18)
                        vol_usd += self._normalize_amount(usdt_in + usdt_out, usdt_decimals)
                except Exception:
                    vol_usd = 0.0

                return {
                    'label': label,
                    'address': Web3.to_checksum_address(pair_address),
                    'token0': {'symbol': t0.get('symbol'), 'address': t0.get('address'), 'decimals': t0.get('decimals'), 'reserve': norm0},
                    'token1': {'symbol': t1.get('symbol'), 'address': t1.get('address'), 'decimals': t1.get('decimals'), 'reserve': norm1},
                    'tvl_usd': tvl_usd,
                    'volume24h_usd': vol_usd
                }

            # Auto-resolve USDT pair if not provided
            if not pair_usdt:
                try:
                    factory_addr = self.contracts.get('factory')
                    if factory_addr:
                        factory_abi = [
                            {"constant": True, "inputs": [{"name": "tokenA", "type": "address"}, {"name": "tokenB", "type": "address"}], "name": "getPair", "outputs": [{"name": "pair", "type": "address"}], "type": "function"}
                        ]
                        factory = self.w3.eth.contract(address=Web3.to_checksum_address(factory_addr), abi=factory_abi)
                        blocks_addr = Web3.to_checksum_address(self.contracts['blocksToken'])
                        usdt_addr = Web3.to_checksum_address(self.contracts['usdt'])
                        derived_pair = factory.functions.getPair(blocks_addr, usdt_addr).call()
                        if int(derived_pair, 16) != 0:
                            pair_usdt = derived_pair
                except Exception:
                    pair_usdt = None

            if pair_usdt:
                try:
                    info = compute_pool_stats(pair_usdt, 'BLOCKS/USDT')
                    pools.append(info)
                    total_liquidity_usd += info.get('tvl_usd', 0.0)
                    daily_volume_usd += info.get('volume24h_usd', 0.0)
                except Exception:
                    pass

            # Optional BNB pair if provided
            if pair_bnb:
                try:
                    info = compute_pool_stats(pair_bnb, 'BLOCKS/BNB')
                    pools.append(info)
                    # Without BUSD/BNB price, skip adding to total_liquidity_usd; still show per-pool
                except Exception:
                    pass

            return {
                'total_liquidity_usd': total_liquidity_usd,
                'active_pools': len(pools),
                'daily_volume_usd': daily_volume_usd,
                'pools': pools,
                'from_block': from_block,
                'to_block': latest_block
            }
        except Exception as e:
            return {'error': str(e)}

    def get_all_packages(self, active_only: bool = True) -> List[Dict[str, Any]]:
        """Read packages from PackageManager. Prefer getActivePackageIds; fallback to [0..nextPackageId)."""
        try:
            pm_addr = self.contracts.get('packageManager')
            if not pm_addr:
                return []
            # Minimal ABI for the required calls
            pm_abi = [
                {"name": "getActivePackageIds", "outputs": [{"type": "uint256[]"}], "inputs": [], "stateMutability": "view", "type": "function"},
                {"name": "nextPackageId", "outputs": [{"type": "uint256"}], "inputs": [], "stateMutability": "view", "type": "function"},
                {"name": "getPackage", "outputs": [{"components": [
                    {"internalType": "uint256", "name": "entryUSDT", "type": "uint256"},
                    {"internalType": "uint256", "name": "exchangeRate", "type": "uint256"},
                    {"internalType": "uint64", "name": "cliff", "type": "uint64"},
                    {"internalType": "uint64", "name": "duration", "type": "uint64"},
                    {"internalType": "uint16", "name": "vestBps", "type": "uint16"},
                    {"internalType": "uint16", "name": "referralBps", "type": "uint16"},
                    {"internalType": "bool", "name": "active", "type": "bool"},
                    {"internalType": "bool", "name": "exists", "type": "bool"},
                    {"internalType": "string", "name": "name", "type": "string"}
                ], "type": "tuple"}], "inputs": [{"name": "packageId", "type": "uint256"}], "stateMutability": "view", "type": "function"}
            ]
            pm = self.w3.eth.contract(address=Web3.to_checksum_address(pm_addr), abi=pm_abi)
            results: List[Dict[str, Any]] = []
            ids: List[int] = []
            # Try preferred method first
            try:
                ids = [int(x) for x in pm.functions.getActivePackageIds().call()]
            except Exception:
                ids = []
            # Fallback to scanning range if empty
            if not ids:
                try:
                    next_id = pm.functions.nextPackageId().call()
                    ids = list(range(0, int(next_id)))
                except Exception:
                    ids = []

            for pid in ids:
                try:
                    pkg = pm.functions.getPackage(pid).call()
                    pkg_dict = {
                        'packageId': pid,
                        'entryUSDT': int(pkg[0]),
                        'exchangeRate': int(pkg[1]),
                        'cliff': int(pkg[2]),
                        'duration': int(pkg[3]),
                        'vestBps': int(pkg[4]),
                        'referralBps': int(pkg[5]),
                        'active': bool(pkg[6]),
                        'exists': bool(pkg[7]),
                        'name': pkg[8] if isinstance(pkg[8], str) else ''
                    }
                    if not pkg_dict['exists']:
                        continue
                    if active_only and not pkg_dict['active']:
                        continue
                    results.append(pkg_dict)
                except Exception:
                    continue
            return results
        except Exception:
            return []

    def get_packages_stats(self, from_block: Optional[int] = None, to_block: Optional[int] = None) -> List[Dict[str, Any]]:
        """Aggregate purchases per package from Purchased events within a bounded block range."""
        try:
            pm_addr = self.contracts.get('packageManager')
            if not pm_addr:
                return []
            latest = self.w3.eth.block_number if self.is_connected() else None
            if to_block is None:
                to_block = latest
            if from_block is None:
                # default ~500k blocks (~2-3 weeks on BSC)
                from_block = max(0, (to_block or 0) - 500_000)

            # Fetch packages first
            # Include inactive as well so historical packages show up
            package_list = self.get_all_packages(active_only=False)
            packages = {p['packageId']: p for p in package_list}

            # Query Purchased events
            # Purchased(address buyer, uint256 packageId, uint256 usdtAmount, uint256 totalTokens, uint256 vestTokens, uint256 poolTokens, uint256 lpTokens, address referrer, uint256 referralReward)
            topic_purchased = self.w3.keccak(text='Purchased(address,uint256,uint256,uint256,uint256,uint256,uint256,address,uint256)').hex()
            logs = self.w3.eth.get_logs({
                'fromBlock': from_block,
                'toBlock': to_block,
                'address': Web3.to_checksum_address(pm_addr),
                'topics': [topic_purchased]
            })

            usdt_dec = 18
            try:
                usdt_dec = self.contract_instances['usdt'].functions.decimals().call()
            except Exception:
                pass

            # Aggregate
            agg: Dict[int, Dict[str, Any]] = {pid: {'total_purchases': 0, 'successful_purchases': 0, 'total_usd': 0.0} for pid in packages.keys()}
            for lg in logs:
                tpcs = lg.get('topics', [])
                if len(tpcs) < 3:
                    continue
                # topics layout: [signature, buyer, packageId]
                pkg_id = int(tpcs[2].hex(), 16)
                if pkg_id not in agg:
                    # Create entry dynamically if not found from getPackage
                    agg[pkg_id] = {'total_purchases': 0, 'successful_purchases': 0, 'total_usd': 0.0}
                data_hex = lg.get('data', '0x')
                # data layout: usdtAmount (32), totalTokens (32), vestTokens (32), poolTokens (32), lpTokens (32), referrer (32), referralReward (32)
                if not data_hex or data_hex == '0x':
                    continue
                try:
                    # first 32 bytes after 0x
                    usdt_amount_raw = int(data_hex[2:66], 16)
                except Exception:
                    usdt_amount_raw = 0
                agg[pkg_id]['total_purchases'] += 1
                agg[pkg_id]['successful_purchases'] += 1
                agg[pkg_id]['total_usd'] += (usdt_amount_raw / float(10 ** usdt_dec))

            # If no logs found in default window, try a wider backfill (~2.5M blocks ~ 3 months)
            if len(logs) == 0 and (to_block is not None):
                try:
                    fb = max(0, to_block - 2_500_000)
                    logs2 = self.w3.eth.get_logs({
                        'fromBlock': fb,
                        'toBlock': to_block,
                        'address': Web3.to_checksum_address(pm_addr),
                        'topics': [topic_purchased]
                    })
                    for lg in logs2:
                        tpcs = lg.get('topics', [])
                        if len(tpcs) < 3:
                            continue
                        pkg_id = int(tpcs[2].hex(), 16)
                        if pkg_id not in agg:
                            agg[pkg_id] = {'total_purchases': 0, 'successful_purchases': 0, 'total_usd': 0.0}
                        data_hex = lg.get('data', '0x')
                        if not data_hex or data_hex == '0x':
                            continue
                        try:
                            usdt_amount_raw = int(data_hex[2:66], 16)
                        except Exception:
                            usdt_amount_raw = 0
                        agg[pkg_id]['total_purchases'] += 1
                        agg[pkg_id]['successful_purchases'] += 1
                        agg[pkg_id]['total_usd'] += (usdt_amount_raw / float(10 ** usdt_dec))
                except Exception:
                    pass

            # Build output list for template (include dynamic-only packages as well)
            out: List[Dict[str, Any]] = []
            all_pids = set(list(packages.keys()) + list(agg.keys()))
            for pid in sorted(all_pids):
                pkg = packages.get(pid, {'packageId': pid})
                totals = agg.get(pid) or {'total_purchases': 0, 'successful_purchases': 0, 'total_usd': 0.0}
                total_purchases = totals['total_purchases']
                avg_amount = (totals['total_usd'] / total_purchases) if total_purchases > 0 else 0.0
                out.append({
                    'packageId': pid,
                    'total_purchases': total_purchases,
                    'successful_purchases': totals['successful_purchases'],
                    'total_usd': totals['total_usd'],
                    'total_kes': 0,
                    'avg_amount': avg_amount
                })
            # Sort by total_purchases desc
            out.sort(key=lambda x: x['total_purchases'], reverse=True)
            return out
        except Exception:
            return []

    async def get_comprehensive_stats(self) -> Dict[str, Any]:
        """Get comprehensive blockchain statistics"""
        try:
            price = self._get_blocks_usdt_price()
            stats = {
                'network': self.get_network_info(),
                'blocksToken': self.get_blocks_token_stats(),
                'usdt': self.get_usdt_stats(),
                'treasury': self.get_treasury_balance(),
                'market': {
                    'blocksPriceUsd': price,
                    'volume24hUsd': None
                },
                'timestamp': datetime.utcnow().isoformat()
            }
            
            return stats
        except Exception as e:
            return {'error': str(e)}

    def _topic(self, signature: str) -> str:
        return self.w3.keccak(text=signature).hex()

    def _topic_address(self, address: str) -> str:
        try:
            checksummed = Web3.to_checksum_address(address)
            raw = Web3.to_bytes(hexstr=checksummed)
        except Exception:
            raw = Web3.to_bytes(hexstr=address)
        return Web3.to_hex(raw.rjust(32, b'\0'))

    def get_referral_payments(self, from_block: int, to_block: int) -> Dict[str, Any]:
        """Read ReferralPaid(referrer, buyer, reward) events from PackageManager and aggregate by referrer."""
        try:
            pkg_addr = self.contracts.get('packageManager')
            if not pkg_addr:
                return {'total': 0.0, 'events': [], 'byReferrer': {}}
            topic = self._topic('ReferralPaid(address,address,uint256)')
            logs = self.w3.eth.get_logs({
                'fromBlock': from_block,
                'toBlock': to_block,
                'address': Web3.to_checksum_address(pkg_addr),
                'topics': [topic]
            })
            events: List[Dict[str, Any]] = []
            by_ref: Dict[str, Dict[str, Any]] = {}
            for lg in logs:
                topics = lg.get('topics', [])
                if len(topics) < 3:
                    continue
                ref_addr = '0x' + topics[1].hex()[-40:]
                buyer_addr = '0x' + topics[2].hex()[-40:]
                data_hex = lg.get('data', '0x')
                amount = int(data_hex[2:66], 16) if data_hex and data_hex != '0x' else 0
                # Reward is in BLOCKS tokens (18 decimals typically). Do not normalize here; return raw and normalized separately.
                events.append({'referrer': Web3.to_checksum_address(ref_addr), 'buyer': Web3.to_checksum_address(buyer_addr), 'reward': amount, 'blockNumber': lg.get('blockNumber')})
                key = Web3.to_checksum_address(ref_addr)
                agg = by_ref.get(key) or {'reward': 0, 'count': 0}
                agg['reward'] += amount
                agg['count'] += 1
                by_ref[key] = agg
            # Determine BLOCKS decimals
            blocks_dec = 18
            try:
                blocks_dec = self.contract_instances['blocksToken'].functions.decimals().call()
            except Exception:
                pass
            total_norm = sum([ev['reward'] for ev in events]) / float(10 ** blocks_dec) if events else 0.0
            # Normalize rewards in aggregates
            by_ref_norm = {k: {'reward': v['reward'] / float(10 ** blocks_dec), 'count': v['count']} for k, v in by_ref.items()}
            return {'total': total_norm, 'events': events, 'byReferrer': by_ref_norm, 'decimals': blocks_dec}
        except Exception as e:
            return {'error': str(e)}

    def get_taxes_collected(self, from_block: int, to_block: int) -> Dict[str, Any]:
        """Sum TaxApplied events amount (USDT units)."""
        try:
            pkg_addr = self.contracts.get('packageManager')
            if not pkg_addr:
                return {'total_usdt': 0.0, 'events': []}
            topic = self._topic('TaxApplied(bytes32,uint256,address)')
            logs = self.w3.eth.get_logs({
                'fromBlock': from_block,
                'toBlock': to_block,
                'address': Web3.to_checksum_address(pkg_addr),
                'topics': [topic]
            })
            usdt_dec = 18
            try:
                usdt_dec = self.contract_instances['usdt'].functions.decimals().call()
            except Exception:
                pass
            events: List[Dict[str, Any]] = []
            total_raw = 0
            for lg in logs:
                topics = lg.get('topics', [])
                recipient = '0x' + topics[2].hex()[-40:] if len(topics) > 2 else None
                data_hex = lg.get('data', '0x')
                amount = int(data_hex[2:66], 16) if data_hex and data_hex != '0x' else 0
                total_raw += amount
                events.append({'recipient': Web3.to_checksum_address(recipient) if recipient else None, 'amount': amount, 'blockNumber': lg.get('blockNumber')})
            return {
                'total_usdt': total_raw / float(10 ** usdt_dec),
                'events': events,
                'decimals': usdt_dec
            }
        except Exception as e:
            return {'error': str(e)}

    def get_treasury_usdt_inflows(self, from_block: int, to_block: int) -> Dict[str, Any]:
        """Sum USDT Transfer events with from=PackageManager and to=treasury."""
        try:
            usdt_addr = self.contracts.get('usdt')
            pkg_addr = self.contracts.get('packageManager')
            treasury = self.contracts.get('treasury')
            if not usdt_addr or not pkg_addr or not treasury:
                return {'total_usdt': 0.0, 'events': []}
            topic = self._topic('Transfer(address,address,uint256)')
            from_topic = self._topic_address(pkg_addr)
            to_topic = self._topic_address(treasury)
            logs = self.w3.eth.get_logs({
                'fromBlock': from_block,
                'toBlock': to_block,
                'address': Web3.to_checksum_address(usdt_addr),
                'topics': [topic, from_topic, to_topic]
            })
            usdt_dec = 18
            try:
                usdt_dec = self.contract_instances['usdt'].functions.decimals().call()
            except Exception:
                pass
            total_raw = 0
            events: List[Dict[str, Any]] = []
            for lg in logs:
                data_hex = lg.get('data', '0x')
                amount = int(data_hex[2:66], 16) if data_hex and data_hex != '0x' else 0
                total_raw += amount
                events.append({'amount': amount, 'blockNumber': lg.get('blockNumber')})
            return {
                'total_usdt': total_raw / float(10 ** usdt_dec),
                'events': events,
                'decimals': usdt_dec
            }
        except Exception as e:
            return {'error': str(e)}

    def get_blocks_transfers(self, from_block: int, to_block: int, holder: Optional[str] = None) -> Dict[str, Any]:
        """Fetch BLOCKS token Transfer events; optionally filter by holder address (as sender or recipient)."""
        try:
            token_addr = self.contracts.get('blocksToken')
            if not token_addr:
                return {'events': []}
            topic = self._topic('Transfer(address,address,uint256)')
            topics = [topic]
            if holder:
                addr_topic = self._topic_address(holder)
                # We cannot OR both indexed topics in a single filter; fallback to fetching by contract and filter client-side
                logs = self.w3.eth.get_logs({
                    'fromBlock': from_block,
                    'toBlock': to_block,
                    'address': Web3.to_checksum_address(token_addr),
                    'topics': [topic]
                })
            else:
                logs = self.w3.eth.get_logs({
                    'fromBlock': from_block,
                    'toBlock': to_block,
                    'address': Web3.to_checksum_address(token_addr),
                    'topics': topics
                })
            dec = 18
            try:
                dec = self.contract_instances['blocksToken'].functions.decimals().call()
            except Exception:
                pass
            events: List[Dict[str, Any]] = []
            for lg in logs:
                tpcs = lg.get('topics', [])
                if len(tpcs) < 3:
                    continue
                from_addr = '0x' + tpcs[1].hex()[-40:]
                to_addr = '0x' + tpcs[2].hex()[-40:]
                if holder:
                    h = Web3.to_checksum_address(holder)
                    if Web3.to_checksum_address(from_addr) != h and Web3.to_checksum_address(to_addr) != h:
                        continue
                data_hex = lg.get('data', '0x')
                amount = int(data_hex[2:66], 16) if data_hex and data_hex != '0x' else 0
                events.append({
                    'from': Web3.to_checksum_address(from_addr),
                    'to': Web3.to_checksum_address(to_addr),
                    'amount': amount,
                    'amount_norm': amount / float(10 ** dec),
                    'blockNumber': lg.get('blockNumber')
                })
            return {'events': events, 'decimals': dec}
        except Exception as e:
            return {'error': str(e)}

    def get_vesting_for_wallets(self, wallets: List[str]) -> List[Dict[str, Any]]:
        """Query VestingVault for given wallets and return schedule and balances."""
        results: List[Dict[str, Any]] = []
        try:
            vault = self.contract_instances.get('vestingVault')
            if not vault:
                return results
            for w in wallets:
                try:
                    schedule = vault.functions.userSchedule(Web3.to_checksum_address(w)).call()
                    total_locked = vault.functions.totalLocked(Web3.to_checksum_address(w)).call()
                    released = vault.functions.released(Web3.to_checksum_address(w)).call()
                    results.append({
                        'wallet': Web3.to_checksum_address(w),
                        'cliff': int(schedule[0]),
                        'duration': int(schedule[1]),
                        'start': int(schedule[2]),
                        'totalLocked': int(total_locked),
                        'released': int(released)
                    })
                except Exception:
                    continue
            return results
        except Exception:
            return results

    def get_gas_spend(self, addresses: List[str], from_block: int, to_block: int, max_blocks: int = 2000) -> Dict[str, Any]:
        """Approximate gas spend by scanning transactions in recent blocks and summing receipts for specified senders."""
        try:
            if to_block is None:
                to_block = self.w3.eth.block_number
            if from_block is None:
                from_block = max(0, to_block - max_blocks)
            addr_set = {Web3.to_checksum_address(a) for a in addresses if a}
            totals_by_addr: Dict[str, Dict[str, float]] = {a: {'gasWei': 0, 'txCount': 0} for a in addr_set}
            scanned_blocks = 0
            for bn in range(max(from_block, to_block - max_blocks), to_block + 1):
                block = self.w3.eth.get_block(bn, full_transactions=True)
                scanned_blocks += 1
                for tx in block.get('transactions', []):
                    frm = tx.get('from')
                    if not frm:
                        continue
                    frm_cs = Web3.to_checksum_address(frm)
                    if frm_cs in addr_set:
                        # Get receipt to compute gasUsed * effectiveGasPrice (or gasPrice as fallback)
                        receipt = self.w3.eth.get_transaction_receipt(tx['hash'])
                        gas_used = int(receipt.get('gasUsed', 0))
                        eff = receipt.get('effectiveGasPrice', None)
                        gas_price = int(eff if eff is not None else tx.get('gasPrice', 0))
                        totals_by_addr[frm_cs]['gasWei'] += gas_used * gas_price
                        totals_by_addr[frm_cs]['txCount'] += 1
            # Convert to BNB and approximate USD via blocks price if available
            gas_price_bnb = 1.0 / float(10 ** 18)
            totals = []
            for addr, v in totals_by_addr.items():
                gas_bnb = v['gasWei'] * gas_price_bnb
                totals.append({'address': addr, 'gasBNB': gas_bnb, 'txCount': v['txCount']})
            return {'byAddress': totals, 'from_block': from_block, 'to_block': to_block, 'scannedBlocks': scanned_blocks}
        except Exception as e:
            return {'error': str(e)}

    def get_reports_summary(self, from_block: Optional[int] = None, to_block: Optional[int] = None) -> Dict[str, Any]:
        try:
            latest = self.w3.eth.block_number if self.is_connected() else None
            if to_block is None:
                to_block = latest
            if from_block is None:
                # default to last ~1 day
                approx_24h = 28800
                from_block = max(0, (to_block or 0) - approx_24h)
            revenue_treasury = self.get_treasury_usdt_inflows(from_block, to_block)
            revenue_taxes = self.get_taxes_collected(from_block, to_block)
            referrals = self.get_referral_payments(from_block, to_block)
            return {
                'range': {'from': from_block, 'to': to_block},
                'revenue': {
                    'treasury_usd': revenue_treasury.get('total_usdt', 0.0),
                    'taxes_usd': revenue_taxes.get('total_usdt', 0.0)
                },
                'referrals': referrals
            }
        except Exception as e:
            return {'error': str(e)}

# Global instance
blockchain_service = BlockchainDataService()

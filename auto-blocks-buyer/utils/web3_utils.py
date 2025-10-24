import json
import os
import time
from decimal import Decimal
from typing import Tuple

from dotenv import load_dotenv
from web3 import Web3
try:
    # web3.py v6
    from web3.middleware import ExtraDataToPOAMiddleware as _POA_MIDDLEWARE
except ImportError:  # pragma: no cover - fallback for older web3
    try:
        # web3.py v5
        from web3.middleware import geth_poa_middleware as _POA_MIDDLEWARE
    except ImportError:
        _POA_MIDDLEWARE = None


load_dotenv()


def _load_json(path: str):
    with open(path, "r") as f:
        return json.load(f)


# Load environment
BSC_RPC = os.getenv("BSC_RPC", "https://bsc-dataseed.binance.org")
PRIVATE_KEY = os.getenv("PRIVATE_KEY", "")
WALLET_ADDRESS = Web3.to_checksum_address(os.getenv("WALLET_ADDRESS", "0x0000000000000000000000000000000000000000"))
ROUTER_ADDRESS = Web3.to_checksum_address(os.getenv("ROUTER_ADDRESS", "0x10ED43C718714eb63d5aA57B78B54704E256024E"))
USDT_ADDRESS = Web3.to_checksum_address(os.getenv("USDT_ADDRESS", "0x55d398326f99059fF775485246999027B3197955"))
BLOCKS_ADDRESS = Web3.to_checksum_address(os.getenv("BLOCKS_ADDRESS", "0xfd3f86d951bcddd209241884c021636c2a60e195"))
CHAIN_ID = int(os.getenv("CHAIN_ID", "56"))
SLIPPAGE_BPS = int(os.getenv("SLIPPAGE_BPS", "200"))
TX_DEADLINE_SECONDS = int(os.getenv("TX_DEADLINE_SECONDS", "1200"))
GAS_PRICE_MULTIPLIER = Decimal(os.getenv("GAS_PRICE_MULTIPLIER", "1.15"))


# Initialize web3
w3 = Web3(Web3.HTTPProvider(BSC_RPC, request_kwargs={"timeout": 30}))
# Some BSC nodes may require POA middleware; handle both v5/v6 gracefully
if _POA_MIDDLEWARE is not None:
    try:
        w3.middleware_onion.inject(_POA_MIDDLEWARE, layer=0)
    except Exception:
        pass


ABI_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "abi")
ROUTER_ABI = _load_json(os.path.join(ABI_DIR, "pancakeswap_router_abi.json"))
ERC20_ABI = _load_json(os.path.join(ABI_DIR, "erc20_abi.json"))

router = w3.eth.contract(address=ROUTER_ADDRESS, abi=ROUTER_ABI)
usdt = w3.eth.contract(address=USDT_ADDRESS, abi=ERC20_ABI)
blocks = w3.eth.contract(address=BLOCKS_ADDRESS, abi=ERC20_ABI)


def ensure_connected() -> bool:
    return w3.is_connected()


def get_next_nonce(address: str | None = None) -> int:
    addr = Web3.to_checksum_address(address or WALLET_ADDRESS)
    # Use 'pending' to account for in-flight txs and avoid "nonce too low"
    return w3.eth.get_transaction_count(addr, "pending")


def get_token_decimals(token_addr: str) -> int:
    token = w3.eth.contract(address=Web3.to_checksum_address(token_addr), abi=ERC20_ABI)
    return token.functions.decimals().call()


def get_usdt_balance(address: str) -> Decimal:
    address = Web3.to_checksum_address(address)
    decimals = usdt.functions.decimals().call()
    raw = usdt.functions.balanceOf(address).call()
    return Decimal(raw) / Decimal(10 ** decimals)


def get_allowance(token_addr: str, owner: str, spender: str) -> int:
    token = w3.eth.contract(address=Web3.to_checksum_address(token_addr), abi=ERC20_ABI)
    return token.functions.allowance(Web3.to_checksum_address(owner), Web3.to_checksum_address(spender)).call()


def _build_and_send(tx) -> str:
    signed = w3.eth.account.sign_transaction(tx, private_key=PRIVATE_KEY)
    raw = getattr(signed, 'rawTransaction', None)
    if raw is None:
        raw = getattr(signed, 'raw_transaction', None)
    tx_hash = w3.eth.send_raw_transaction(raw)
    return tx_hash.hex()


def estimate_gas_price_wei(multiplier: Decimal = GAS_PRICE_MULTIPLIER) -> int:
    base = w3.eth.gas_price
    adj = Decimal(base) * multiplier
    return int(adj)


def ensure_allowance(token_addr: str, owner: str, spender: str, needed_wei: int, gas_price_wei: int | None = None) -> str | None:
    current = get_allowance(token_addr, owner, spender)
    if current >= needed_wei:
        return None
    token = w3.eth.contract(address=Web3.to_checksum_address(token_addr), abi=ERC20_ABI)
    nonce = get_next_nonce(WALLET_ADDRESS)
    gas_price = gas_price_wei or estimate_gas_price_wei()
    # Approve a bit more than needed to reduce approvals
    amount = max(needed_wei, 10 ** 27)  # ~1e27 as generous allowance
    tx = token.functions.approve(Web3.to_checksum_address(spender), amount).build_transaction({
        'from': WALLET_ADDRESS,
        'nonce': nonce,
        'gasPrice': gas_price,
        'chainId': CHAIN_ID,
    })
    # Estimate gas limit
    gas_limit = w3.eth.estimate_gas(tx)
    tx['gas'] = int(gas_limit * 1.2)
    return _build_and_send(tx)


def get_quote_usdt_to_blocks(usdt_amount_wei: int) -> int:
    path = [USDT_ADDRESS, BLOCKS_ADDRESS]
    amounts = router.functions.getAmountsOut(usdt_amount_wei, path).call()
    return int(amounts[-1])


def compute_amount_out_min(usdt_amount_wei: int) -> Tuple[int, int]:
    out = get_quote_usdt_to_blocks(usdt_amount_wei)
    amount_out_min = int(out * (10_000 - SLIPPAGE_BPS) / 10_000)
    return out, amount_out_min


def swap_usdt_for_blocks(usdt_amount_wei: int, amount_out_min_wei: int, gas_price_wei: int | None = None) -> str:
    gas_price = gas_price_wei or estimate_gas_price_wei()
    nonce = get_next_nonce(WALLET_ADDRESS)
    deadline = int(time.time()) + TX_DEADLINE_SECONDS
    path = [USDT_ADDRESS, BLOCKS_ADDRESS]

    tx = router.functions.swapExactTokensForTokensSupportingFeeOnTransferTokens(
        usdt_amount_wei,
        amount_out_min_wei,
        path,
        WALLET_ADDRESS,
        deadline,
    ).build_transaction({
        'from': WALLET_ADDRESS,
        'nonce': nonce,
        'gasPrice': gas_price,
        'chainId': CHAIN_ID,
    })

    gas_limit = w3.eth.estimate_gas(tx)
    tx['gas'] = int(gas_limit * 1.2)
    return _build_and_send(tx)


def wait_for_receipt(tx_hash: str, timeout: int = 600):
    return w3.eth.wait_for_transaction_receipt(tx_hash, timeout=timeout)


def to_wei_token(amount: Decimal, decimals: int) -> int:
    return int(amount * (10 ** decimals))


def from_wei_token(amount_wei: int, decimals: int) -> Decimal:
    return Decimal(amount_wei) / Decimal(10 ** decimals)



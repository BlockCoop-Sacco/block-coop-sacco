import os
import time
from datetime import datetime, timezone
from decimal import Decimal

from dotenv import load_dotenv

from utils.logger_utils import get_bot_logger, log_tx
from utils.scheduler_utils import random_delay_seconds, random_trade_amount_usdt, next_backoff_seconds
from utils.telegram_utils import send_message, format_success, format_failure
from utils.web3_utils import (
    ensure_connected,
    estimate_gas_price_wei,
    ensure_allowance,
    get_usdt_balance,
    compute_amount_out_min,
    swap_usdt_for_blocks,
    wait_for_receipt,
    to_wei_token,
    from_wei_token,
    usdt,
    w3,
)


load_dotenv()


def main():
    logger = get_bot_logger()

    if not ensure_connected():
        logger.error("Web3 not connected. Check BSC_RPC.")
        send_message(format_failure("Web3 not connected. Check BSC_RPC."))
        return

    wallet = os.getenv("WALLET_ADDRESS", "").strip()
    private_key = os.getenv("PRIVATE_KEY", "").strip()
    if not wallet or not private_key:
        logger.error("Missing WALLET_ADDRESS or PRIVATE_KEY in environment.")
        return

    logger.info("BLOCKS buyer bot started. Wallet: %s", wallet)

    # Pre-fetch decimals
    usdt_decimals = usdt.functions.decimals().call()

    # Run loop
    backoff = 0
    while True:
        try:
            # Choose random USDT spend
            usdt_spend = random_trade_amount_usdt()
            # Check balance
            balance_usdt = get_usdt_balance(wallet)
            if balance_usdt < usdt_spend:
                logger.warning("Balance %.2f USDT < spend %.2f USDT. Skipping.", balance_usdt, usdt_spend)
                time.sleep(random_delay_seconds())
                continue

            # Prepare amounts
            amount_in_wei = to_wei_token(Decimal(usdt_spend), usdt_decimals)
            quoted_out, amount_out_min = compute_amount_out_min(amount_in_wei)

            # Ensure allowance
            gas_price = estimate_gas_price_wei()
            approve_tx = ensure_allowance(usdt.address, wallet, os.getenv("ROUTER_ADDRESS"), amount_in_wei, gas_price)
            if approve_tx:
                logger.info("Approval tx submitted: %s", approve_tx)
                # wait for approval to confirm before swap to avoid nonce conflicts
                wait_for_receipt(approve_tx)

            # Execute swap
            tx_hash = swap_usdt_for_blocks(amount_in_wei, amount_out_min, gas_price)
            logger.info("Swap submitted: %s", tx_hash)

            receipt = wait_for_receipt(tx_hash)
            status = receipt.status
            # Estimate blocks received from logs not trivial; use quoted as approximation for notification
            blocks_received = float(from_wei_token(quoted_out, 18))  # common default; may differ

            # Gas cost in BNB
            gas_used = receipt.gasUsed
            gas_price_used = receipt.effectiveGasPrice if hasattr(receipt, 'effectiveGasPrice') else gas_price
            gas_cost_bnb = float(Decimal(gas_used * gas_price_used) / Decimal(10 ** 18))

            if status == 1:
                msg = format_success(blocks_received, float(usdt_spend), tx_hash)
                send_message(msg)
                log_tx(datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S %Z"), float(usdt_spend), blocks_received, gas_cost_bnb, tx_hash, "success")
                backoff = 0
                time.sleep(random_delay_seconds())
            else:
                err_text = f"Receipt status {status}"
                logger.error(err_text)
                send_message(format_failure(err_text))
                log_tx(datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S %Z"), float(usdt_spend), 0.0, gas_cost_bnb, tx_hash, "failed")
                backoff = next_backoff_seconds(backoff)
                time.sleep(backoff)

        except Exception as e:
            logger.exception("Error during buy cycle: %s", e)
            send_message(format_failure(str(e)))
            backoff = next_backoff_seconds(backoff)
            time.sleep(backoff)


if __name__ == "__main__":
    main()




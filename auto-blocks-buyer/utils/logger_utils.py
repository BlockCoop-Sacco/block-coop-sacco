import json
import logging
import os
from datetime import datetime, timezone
from typing import Optional


LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)))
BOT_LOG_PATH = os.path.join(LOG_DIR, "bot.log")
TX_LOG_PATH = os.path.join(LOG_DIR, "transactions.log")


def _ensure_handlers():
    bot_logger = logging.getLogger("bot")
    if not bot_logger.handlers:
        bot_logger.setLevel(logging.INFO)
        fmt = logging.Formatter("%(asctime)s %(levelname)s %(message)s")
        fh = logging.FileHandler(BOT_LOG_PATH)
        fh.setFormatter(fmt)
        sh = logging.StreamHandler()
        sh.setFormatter(fmt)
        bot_logger.addHandler(fh)
        bot_logger.addHandler(sh)
    return bot_logger


def get_bot_logger() -> logging.Logger:
    return _ensure_handlers()


def log_tx(
    timestamp_utc: Optional[str],
    usdt_spent: float,
    blocks_received: float,
    gas_bnb: float,
    tx_hash: str,
    status: str,
):
    ts = timestamp_utc or datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S %Z")
    record = {
        "time": ts,
        "usdt_spent": usdt_spent,
        "blocks_received": blocks_received,
        "gas_bnb": gas_bnb,
        "tx_hash": tx_hash,
        "status": status,
    }
    with open(TX_LOG_PATH, "a") as f:
        f.write(json.dumps(record) + "\n")




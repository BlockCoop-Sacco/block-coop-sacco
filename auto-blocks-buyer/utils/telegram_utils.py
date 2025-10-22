import os
import requests
from datetime import datetime, timezone

from dotenv import load_dotenv


load_dotenv()


TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")


def send_message(text: str) -> None:
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": text,
        "disable_web_page_preview": True,
    }
    try:
        requests.post(url, json=payload, timeout=10)
    except Exception:
        # Best-effort notification; do not raise
        pass


def format_success(blocks_amount: float, usdt_spent: float, tx_hash: str) -> str:
    utc_time = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    return (
        f"✅ Bought {blocks_amount:.4f} BLOCKS for {usdt_spent:.2f} USDT\n"
        f"TX: https://bscscan.com/tx/{tx_hash}\n"
        f"Time: {utc_time}"
    )


def format_failure(error_message: str) -> str:
    utc_time = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    return (
        f"❌ BLOCKS Buy Failed\n"
        f"Error: {error_message}\n"
        f"Time: {utc_time}"
    )




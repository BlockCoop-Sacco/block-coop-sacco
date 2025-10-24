import os
import random
from decimal import Decimal

from dotenv import load_dotenv


load_dotenv()


MIN_DELAY_MINUTES = int(os.getenv("MIN_DELAY_MINUTES", "15"))
MAX_DELAY_MINUTES = int(os.getenv("MAX_DELAY_MINUTES", "90"))
MIN_BUY_USDT = Decimal(os.getenv("MIN_BUY_USDT", "1"))
MAX_BUY_USDT = Decimal(os.getenv("MAX_BUY_USDT", "10"))


def random_trade_amount_usdt(min_usdt: Decimal | None = None, max_usdt: Decimal | None = None) -> Decimal:
    low = min_usdt if min_usdt is not None else MIN_BUY_USDT
    high = max_usdt if max_usdt is not None else MAX_BUY_USDT
    value = Decimal(str(random.uniform(float(low), float(high))))
    return value.quantize(Decimal("0.01"))


def random_delay_seconds(min_minutes: int | None = None, max_minutes: int | None = None) -> int:
    low = min_minutes if min_minutes is not None else MIN_DELAY_MINUTES
    high = max_minutes if max_minutes is not None else MAX_DELAY_MINUTES
    return int(random.uniform(low, high) * 60)


def next_backoff_seconds(prev_backoff: int | None = None) -> int:
    # Base 5-10 minutes random; exponential with cap at 60 minutes
    if prev_backoff is None or prev_backoff <= 0:
        return int(random.uniform(5, 10) * 60)
    next_val = min(prev_backoff * 2, 60 * 60)
    # add ±10% jitter
    jitter = random.uniform(0.9, 1.1)
    return int(next_val * jitter)



## Autonomous BLOCKS/USDT Buyer Bot (BSC)

An autonomous bot that buys `BLOCKS` using `USDT` on BSC via PancakeSwap v2 at random intervals, with Telegram notifications, robust logging, and failure backoff.

### Features
- Randomized buy intervals (configurable)
- Randomized USDT spend per trade (configurable)
- Dynamic gas price estimation
- Exponential backoff on failures
- Telegram notifications (success/failure)
- Local transaction logging

### Setup
1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Copy `.env.example` to `.env` and fill values.
3. Ensure the wallet has USDT and BNB for gas.

### Run
```bash
python bot.py
```

### Run 24/7 (PM2)
```bash
pm2 start bot.py --interpreter=python3
pm2 logs bot.py
```

### Environment Variables
See `.env.example` for all configuration options and defaults.

### Notes
- Uses `swapExactTokensForTokensSupportingFeeOnTransferTokens` for fee/tax tokens.
- Slippage, gas multiplier, and deadlines are configurable.

### Disclaimer
This software is provided "as is" without warranty. Use at your own risk.



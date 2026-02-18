#!/bin/bash
while true; do
  log="enrich-$(date +%Y%m%d-%H%M%S).log"
  echo "Starting run at $(date) -> $log"

  TMPDIR=/tmp npx tsx scripts/enrich-products-hybrid.ts \
    --live \
    --model openai \
    --batch-size 25 \
    --concurrency 6 \
    --max-duration 30 \
    --resume \
    2>&1 | tee "$log"

  if grep -q "No products to process!" "$log"; then
    echo "All products processed. Exiting."
    break
  fi

  echo "Run finished at $(date); resuming after short pause..."
  sleep 30
done

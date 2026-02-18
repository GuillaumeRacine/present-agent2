#!/bin/bash
# Batched Interest Taxonomy Rebuild
# Processes all products in 1000-product batches with automatic checkpointing

set -e  # Exit on error

TOTAL_PRODUCTS=41686
BATCH_SIZE=1000
CURRENT_BATCH=0

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║        🔄 Batched Interest Taxonomy Rebuild - Phase C          ║"
echo "║                                                                ║"
echo "║  Processing $TOTAL_PRODUCTS products in batches of $BATCH_SIZE            ║"
echo "║  Checkpoints saved every 100 products                          ║"
echo "║  Can be interrupted and resumed at any time                    ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check if we should resume from checkpoint
if [ -f "data/interest-rebuild-state.json" ]; then
  PROCESSED=$(cat data/interest-rebuild-state.json | python3 -c "import json,sys; print(json.load(sys.stdin).get('processedProducts', 0))")
  echo "📂 Found checkpoint: $PROCESSED products already processed"
  echo "   Resuming from where we left off..."
  echo ""
  CURRENT_BATCH=$((PROCESSED / BATCH_SIZE))
fi

# Calculate number of batches
NUM_BATCHES=$(((TOTAL_PRODUCTS + BATCH_SIZE - 1) / BATCH_SIZE))

echo "📊 Batch Plan:"
echo "   Total Products: $TOTAL_PRODUCTS"
echo "   Batch Size: $BATCH_SIZE products"
echo "   Total Batches: $NUM_BATCHES"
echo "   Starting from Batch: $((CURRENT_BATCH + 1))"
echo ""
echo "⏱️  Estimated time: ~$((NUM_BATCHES - CURRENT_BATCH)) hours"
echo "💰 Estimated cost: ~\$0.50 per batch (\$22-25 total)"
echo ""
echo "Press Ctrl+C at any time to pause. Run this script again to resume."
echo ""
sleep 3

# Process in batches
for ((batch=$CURRENT_BATCH; batch<$NUM_BATCHES; batch++)); do
  LIMIT=$(((batch + 1) * BATCH_SIZE))
  BATCH_NUM=$((batch + 1))

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📦 Processing Batch $BATCH_NUM/$NUM_BATCHES"
  echo "   Target: $LIMIT products"
  echo "   Started: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # Run rebuild (will only process new products due to checkpoint)
  if npx tsx scripts/rebuild-interests.ts --limit $LIMIT 2>&1 | tee -a "data/rebuild-batch-$BATCH_NUM.log"; then
    echo ""
    echo "✅ Batch $BATCH_NUM completed successfully"
    echo "   Finished: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""

    # Show progress
    if [ -f "data/interest-rebuild-state.json" ]; then
      PROCESSED=$(cat data/interest-rebuild-state.json | python3 -c "import json,sys; print(json.load(sys.stdin).get('processedProducts', 0))")
      PROGRESS=$((PROCESSED * 100 / TOTAL_PRODUCTS))
      echo "📈 Overall Progress: $PROCESSED/$TOTAL_PRODUCTS products ($PROGRESS%)"
      echo ""
    fi

    # Pause between batches to avoid rate limits
    if [ $BATCH_NUM -lt $NUM_BATCHES ]; then
      echo "⏸️  Pausing 30 seconds before next batch..."
      sleep 30
    fi
  else
    echo ""
    echo "❌ Batch $BATCH_NUM failed!"
    echo "   Check logs: data/rebuild-batch-$BATCH_NUM.log"
    echo "   Run this script again to retry from checkpoint"
    exit 1
  fi
done

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║                  🎉 REBUILD COMPLETE! 🎉                       ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Final Statistics:"
cat data/interest-stats.json | python3 -c "import json,sys; d=json.load(sys.stdin)['summary']; print(f\"   Total Products: {d['totalProducts']}\"); print(f\"   Processed: {d['processedProducts']}\"); print(f\"   Failed: {d['failedProducts']}\"); print(f\"   Unique Interests: {d['uniqueInterests']}\")"
echo ""
echo "📁 Output Files:"
echo "   - data/interest-stats.json (detailed statistics)"
echo "   - data/rebuild-batch-*.log (batch logs)"
echo "   - data/interest-rebuild-state.json (final state)"
echo ""
echo "✅ Phase C deployment complete!"

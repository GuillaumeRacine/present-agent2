# Monitoring Guide

**Last Updated**: October 29, 2025

---

## Quick Reference

### Phase C Deployment Monitoring

```bash
# Check if process is running
ps aux | grep rebuild-interests-batched

# View live progress
tail -f data/rebuild-batch-*.log

# Check current progress
cat data/interest-rebuild-state.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'Progress: {d.get(\"processedProducts\", 0)}/41686 ({d.get(\"processedProducts\", 0)*100//41686}%)')"

# View interest statistics
cat data/interest-stats.json | python3 -c "import json,sys; d=json.load(sys.stdin)['summary']; print(f'Unique Interests: {d[\"uniqueInterests\"]}')"
```

---

## System Monitoring

### Health Check

**API Endpoint**:
```bash
curl http://localhost:3000/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-10-29T17:45:00Z"
}
```

### Server Status

**Check if running**:
```bash
# Backend
curl http://localhost:3000/health

# Frontend
curl http://localhost:3001
```

**Process check**:
```bash
# Find backend process
ps aux | grep "tsx src/server.ts"

# Find frontend process
ps aux | grep "next dev"
```

---

## Deployment Monitoring

### Phase C Progress

**Real-time monitoring**:
```bash
# In one terminal
tail -f data/rebuild-batch-*.log

# In another terminal
watch -n 60 'cat data/interest-rebuild-state.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(f\"Batch: {d.get(\\\"currentBatch\\\", 0)}/42\\nProcessed: {d.get(\\\"processedProducts\\\", 0)}\\nProgress: {d.get(\\\"processedProducts\\\", 0)*100//41686}%\")"'
```

**Check for errors**:
```bash
# Recent errors
tail -100 data/rebuild-batch-*.log | grep -i error

# Failed products
cat data/interest-rebuild-state.json | python3 -c "import json,sys; print(len(json.load(sys.stdin).get('failedProducts', [])))"
```

**Progress summary**:
```bash
#!/bin/bash
# save as: scripts/check-phase-c-progress.sh

STATE_FILE="data/interest-rebuild-state.json"

if [ ! -f "$STATE_FILE" ]; then
  echo "No deployment in progress"
  exit 0
fi

python3 << EOF
import json
with open('$STATE_FILE') as f:
    d = json.load(f)

total = 41686
processed = d.get('processedProducts', 0)
failed = len(d.get('failedProducts', []))
batch = d.get('currentBatch', 0)
progress = (processed * 100) / total

print(f"╔══════════════════════════════════════╗")
print(f"║   Phase C Deployment Progress       ║")
print(f"╠══════════════════════════════════════╣")
print(f"║  Batch:      {batch:2d}/42                 ║")
print(f"║  Processed:  {processed:5d}/{total}         ║")
print(f"║  Failed:     {failed:5d}                   ║")
print(f"║  Progress:   {progress:5.1f}%               ║")
print(f"╚══════════════════════════════════════╝")
EOF
```

---

## Log Monitoring

### Log Locations

| Log File | Purpose | Retention |
|----------|---------|-----------|
| `logs/combined.log` | All system logs | Rotating, 14 days |
| `logs/error.log` | Errors only | Rotating, 30 days |
| `data/rebuild-batch-[N].log` | Batch deployment logs | Manual cleanup |
| `data/rebuild-full-batched.log` | Full deployment log | Manual cleanup |

### Watching Logs

**Tail all logs**:
```bash
# Combined
tail -f logs/combined.log

# Errors only
tail -f logs/error.log

# Current batch
tail -f data/rebuild-batch-*.log
```

**Search logs**:
```bash
# Find errors
grep -i error logs/combined.log | tail -20

# Find warnings
grep -i warn logs/combined.log | tail -20

# Find specific text
grep "wine" logs/combined.log
```

**Filter by timestamp**:
```bash
# Last hour
grep "$(date -u -d '1 hour ago' '+%Y-%m-%d %H')" logs/combined.log

# Today
grep "$(date -u '+%Y-%m-%d')" logs/combined.log
```

---

## Performance Monitoring

### Response Time Tracking

**Test recommendation endpoint**:
```bash
time curl -X POST http://localhost:3000/api/recommend \
  -H 'Content-Type: application/json' \
  -d '{"userQuery":"gift for wine lover"}'
```

**Expected**: 25-35 seconds

**Extract timing from response**:
```bash
curl -X POST http://localhost:3000/api/recommend \
  -H 'Content-Type: application/json' \
  -d '{"userQuery":"gift for wine lover"}' | \
  jq '.processingTime'
```

### Agent Performance

**From logs**:
```bash
grep "Agent execution time" logs/combined.log | tail -10
```

**Expected times**:
- Listener: 3-5s
- Memory: 5-6s
- Relationship: 4-5s
- Meaning: 5-6s
- Explorer: 5-7s
- Storyteller: 6-8s
- Presenter: 2-3s

---

## Database Monitoring

### Neo4j Health

**Connection test**:
```bash
npm run test:connection
```

**Query Neo4j directly**:
```cypher
// In Neo4j Browser

// Node counts
MATCH (n:Product) RETURN count(n) as products;
MATCH (n:Interest) RETURN count(n) as interests;
MATCH (n:Recipient) RETURN count(n) as recipients;

// Relationship counts
MATCH (:Product)-[r:MATCHES_INTEREST]->(:Interest)
RETURN count(r) as interest_relationships;

// Database size
CALL apoc.meta.stats() YIELD nodeCount, relCount, labels
RETURN nodeCount, relCount, labels;
```

### Index Performance

**Check index usage**:
```cypher
// Vector index stats
SHOW INDEX YIELD name, type, entityType, state
WHERE type = "VECTOR"
RETURN name, state;

// Property index stats
SHOW INDEX YIELD name, type, entityType, state
WHERE type = "RANGE"
RETURN name, state;
```

---

## Cost Monitoring

### API Usage Tracking

**OpenAI costs**:
```bash
# Check usage in OpenAI dashboard
# Or track in application logs

grep "OpenAI API call" logs/combined.log | \
  grep "cost:" | \
  awk '{sum += $NF} END {print "Total cost: $" sum}'
```

**Phase C deployment cost**:
```bash
cat data/interest-stats.json | python3 -c "
import json, sys
d = json.load(sys.stdin)['summary']
processed = d['processedProducts']
cost_per_product = 0.00054
total = processed * cost_per_product
print(f'Processed: {processed}')
print(f'Cost to date: ${total:.2f}')
print(f'Estimated total: $22-25')
"
```

---

## Alerting

### Critical Conditions

Monitor for these conditions:

1. **Server Down**
   ```bash
   curl http://localhost:3000/health || echo "ALERT: Server down!"
   ```

2. **Database Disconnected**
   ```bash
   curl http://localhost:3000/health | grep "database.*disconnected" && echo "ALERT: DB down!"
   ```

3. **High Error Rate**
   ```bash
   ERROR_COUNT=$(grep -c "ERROR" logs/error.log)
   if [ $ERROR_COUNT -gt 100 ]; then
     echo "ALERT: High error rate ($ERROR_COUNT errors)"
   fi
   ```

4. **Deployment Stalled**
   ```bash
   # If no checkpoint update in 2+ hours
   LAST_UPDATE=$(stat -f %m data/interest-rebuild-state.json)
   NOW=$(date +%s)
   DIFF=$((NOW - LAST_UPDATE))
   if [ $DIFF -gt 7200 ]; then
     echo "ALERT: Deployment stalled (no update in 2+ hours)"
   fi
   ```

### Monitoring Script

**Create**: `scripts/monitor-system.sh`
```bash
#!/bin/bash
# System monitoring script

echo "╔══════════════════════════════════════╗"
echo "║   System Health Check                ║"
echo "╚══════════════════════════════════════╝"

# Backend health
if curl -s http://localhost:3000/health > /dev/null; then
  echo "✅ Backend: Healthy"
else
  echo "❌ Backend: Down"
fi

# Frontend health
if curl -s http://localhost:3001 > /dev/null; then
  echo "✅ Frontend: Healthy"
else
  echo "❌ Frontend: Down"
fi

# Database health
if grep -q "connected" <(curl -s http://localhost:3000/health); then
  echo "✅ Database: Connected"
else
  echo "❌ Database: Disconnected"
fi

# Recent errors
ERROR_COUNT=$(grep -c "ERROR" logs/error.log 2>/dev/null || echo 0)
if [ $ERROR_COUNT -gt 10 ]; then
  echo "⚠️  Errors: $ERROR_COUNT (high)"
else
  echo "✅ Errors: $ERROR_COUNT (normal)"
fi

# Phase C deployment
if [ -f "data/interest-rebuild-state.json" ]; then
  PROCESSED=$(cat data/interest-rebuild-state.json | python3 -c "import json,sys; print(json.load(sys.stdin).get('processedProducts', 0))" 2>/dev/null || echo 0)
  echo "🚀 Phase C: $PROCESSED/41686 products"
else
  echo "⏹️  Phase C: Not running"
fi

echo "╚══════════════════════════════════════╝"
```

**Run periodically**:
```bash
# Every 5 minutes
watch -n 300 ./scripts/monitor-system.sh

# Or in cron
*/5 * * * * /path/to/scripts/monitor-system.sh >> /var/log/system-monitor.log
```

---

## Metrics Dashboard (Future)

### Recommended Metrics

**System Health**:
- API response time
- Error rate
- Database connection status
- Server uptime

**Phase C Deployment**:
- Products processed
- Current batch
- Progress percentage
- Estimated completion
- Cost to date
- Unique interests found

**Recommendation Quality**:
- Average confidence score
- Average graph score
- Graph vs fallback ratio
- User satisfaction (if feedback implemented)

### Visualization Tools

**Options**:
1. Grafana + Prometheus
2. Datadog
3. New Relic
4. Custom dashboard (React + recharts)

---

## Troubleshooting

### Common Issues

**1. High memory usage**
```bash
# Check memory
free -h

# Find memory-heavy processes
ps aux --sort=-%mem | head -10
```

**2. Slow responses**
```bash
# Check database query times
grep "Query took" logs/combined.log | tail -20

# Check agent times
grep "Agent execution time" logs/combined.log | tail -20
```

**3. Failed requests**
```bash
# Count failures
grep -c "failed" logs/error.log

# View details
grep "failed" logs/error.log | tail -20
```

---

## Best Practices

### Regular Checks

**Daily**:
- [ ] Check error log for new issues
- [ ] Verify server health
- [ ] Monitor Phase C progress (if running)

**Weekly**:
- [ ] Review performance metrics
- [ ] Check disk space
- [ ] Rotate old logs

**Monthly**:
- [ ] Review API costs
- [ ] Analyze query patterns
- [ ] Update monitoring scripts

### Automated Monitoring

**Set up cron jobs**:
```bash
# Health check every 5 minutes
*/5 * * * * /path/to/scripts/monitor-system.sh

# Daily report
0 9 * * * /path/to/scripts/daily-report.sh | mail -s "Daily Report" admin@example.com

# Weekly cleanup
0 0 * * 0 find /path/to/logs -name "*.log" -mtime +14 -delete
```

---

## Summary

**Essential Monitoring**:
✅ Server health (API endpoint)
✅ Error logs (tail -f logs/error.log)
✅ Phase C progress (if deploying)
✅ Database connectivity

**Nice-to-Have**:
📊 Performance metrics dashboard
📧 Email alerts for critical issues
📈 Historical trend analysis
🔔 Slack/Discord notifications

---

**Last Updated**: October 29, 2025
**See Also**: [Batched Deployment Guide](BATCHED_DEPLOYMENT.md)

# Conversation Persistence System

Complete documentation for the conversation history storage and retrieval system in Present-Agent2.

## Overview

The conversation persistence system automatically stores every user interaction in Neo4j, including queries, recommendations, agent performance metrics, and context extraction. This enables historical analysis, learning from past conversations, and debugging.

## Architecture

### Graph Schema

```
(User)-[:HAD_CONVERSATION]->(Conversation)-[:INCLUDES_RECOMMENDATION]->(Recommendation)-[:RECOMMENDS_PRODUCT]->(Product)
(Conversation)-[:EXTRACTED_CONTEXT]->(ConversationContext)
```

**Node Types**:

1. **User**: Represents a user across multiple conversations
   - Properties: `userId`, `createdAt`

2. **Conversation**: Stores conversation metadata and results
   - Properties:
     - `sessionId` (string): Unique session identifier
     - `timestamp` (datetime): When conversation occurred
     - `query` (string): Original user query
     - `success` (boolean): Whether recommendation succeeded
     - `executionTimeMs` (number): Total execution time
     - `recommendationCount` (number): Number of recommendations
     - `conversationalIntro` (string): Intro message
     - `conversationalOutro` (string): Outro message
     - `agentTimings` (JSON string): Individual agent execution times
     - `error` (string, nullable): Error message if failed

3. **ConversationContext**: Stores extracted context data
   - Properties:
     - `sessionId` (string): Links to conversation
     - `data` (JSON string): Full context extraction result

4. **Recommendation**: Individual product recommendations
   - Properties:
     - `sessionId` (string): Links to conversation
     - `productId` (string): Product identifier
     - `rank` (number): Recommendation rank (1-5)
     - `reasoning` (string): Why this was recommended
     - `confidenceScore` (number): Confidence 0-1
     - `tags` (array): Tags like ["practical", "thoughtful"]
     - `timestamp` (datetime): When recommended

## Implementation

### Core Service

Located in `src/services/conversation-persister.ts`

**Main Functions**:

1. **persistConversation()**
   ```typescript
   persistConversation(
     result: OrchestratorResult,
     userQuery: string,
     userId: string,
     sessionId: string
   ): Promise<void>
   ```
   - Stores complete conversation to Neo4j
   - Creates User node if doesn't exist
   - Creates Conversation node with all metadata
   - Creates Recommendation nodes linked to products
   - Stores context extraction data
   - Runs asynchronously (non-blocking)

2. **getConversationHistory()**
   ```typescript
   getConversationHistory(
     query: ConversationQuery
   ): Promise<ConversationRecord[]>
   ```
   - Retrieves conversation list with filters
   - Supports filtering by:
     - userId
     - sessionId
     - success status
     - date range
     - pagination (limit/offset)
   - Returns sorted by timestamp (newest first)

3. **getConversationDetails()**
   ```typescript
   getConversationDetails(
     sessionId: string
   ): Promise<ConversationRecord | null>
   ```
   - Gets full conversation with recommendations
   - Includes context extraction
   - Returns null if not found

4. **getConversationStats()**
   ```typescript
   getConversationStats(
     userId?: string
   ): Promise<ConversationStats>
   ```
   - Returns aggregate statistics
   - Total/successful conversations
   - Total recommendations
   - Average execution time

### Integration

**Backend Server** (`src/server.ts`):

The `/api/recommend` endpoint automatically persists conversations:

```typescript
const result = await orchestrator.execute({
  userQuery,
  userId: finalUserId,
  sessionId: finalSessionId,
});

// Persist asynchronously (non-blocking)
persistConversation(result, userQuery, finalUserId, finalSessionId).catch(
  (err) => {
    logger.error('Failed to persist conversation', { error: err });
  }
);

res.json(result); // Response sent immediately
```

**Key Features**:
- Non-blocking: Response sent immediately, persistence happens async
- Error handling: Failures don't affect API response
- Automatic: No manual intervention needed

## Data Captured

### Per Conversation

**Metadata**:
- Session ID and User ID
- Timestamp
- Original query text
- Success/failure status
- Total execution time (ms)
- Number of recommendations

**Performance Metrics**:
```json
{
  "agentTimings": {
    "listener": 4705,
    "memory": 5264,
    "relationship": 5253,
    "constraints": 0,
    "meaning": 5435,
    "explorer": 5621,
    "validator": 1,
    "storyteller": 6438,
    "presenter": 3188
  }
}
```

**Context Extraction**:
- Recipient information
- Occasion details
- Budget constraints
- Preferences and requirements
- Relationship analysis

**Recommendations**:
- Product details (ID, name, price, vendor)
- Rank (1-5)
- Personal reasoning
- Confidence score
- Tags

**Conversation Flow**:
- Intro message
- Outro message
- Error details (if any)

## API Usage

### Get User's Conversation History

```bash
curl http://localhost:3000/api/conversations?userId=user-123&limit=10
```

### Get Specific Conversation

```bash
curl http://localhost:3000/api/conversations/session-abc-456
```

### Get User Statistics

```bash
curl http://localhost:3000/api/conversations/stats?userId=user-123
```

### Filter by Success

```bash
curl 'http://localhost:3000/api/conversations?success=true&limit=50'
```

### Date Range Query

```bash
curl 'http://localhost:3000/api/conversations?startDate=2025-10-01&endDate=2025-10-31'
```

## Frontend Integration

The frontend logs page (`/logs`) automatically displays persisted conversations.

**API Routes**:
- `/api/logs` - Lists conversations (proxies to backend)
- `/api/logs/[sessionId]` - Shows conversation details

**Features**:
- Filter by success/error
- View agent timing breakdowns
- See full recommendation reasoning
- Search conversations

## Cypher Queries

### Find User's Conversations

```cypher
MATCH (u:User {userId: $userId})-[:HAD_CONVERSATION]->(c:Conversation)
RETURN c
ORDER BY c.timestamp DESC
LIMIT 50
```

### Get Conversation with Recommendations

```cypher
MATCH (c:Conversation {sessionId: $sessionId})-[:INCLUDES_RECOMMENDATION]->(r:Recommendation)
MATCH (r)-[:RECOMMENDS_PRODUCT]->(p:Product)
RETURN c, collect(r) as recommendations, collect(p) as products
```

### Conversation Statistics

```cypher
MATCH (u:User)-[:HAD_CONVERSATION]->(c:Conversation)
WHERE u.userId = $userId
RETURN
  count(c) as totalConversations,
  sum(CASE WHEN c.success THEN 1 ELSE 0 END) as successfulConversations,
  sum(c.recommendationCount) as totalRecommendations,
  avg(c.executionTimeMs) as avgExecutionTime
```

### Most Recommended Products

```cypher
MATCH (r:Recommendation)-[:RECOMMENDS_PRODUCT]->(p:Product)
RETURN p.product_id, p.name, count(r) as recommendationCount
ORDER BY recommendationCount DESC
LIMIT 10
```

## Performance Considerations

### Non-Blocking Persistence

Persistence happens asynchronously after sending the API response:
- User gets recommendations immediately
- Persistence failures don't affect user experience
- Errors logged for monitoring

### Neo4j Optimization

**Indexes** (should be created):
```cypher
CREATE INDEX conversation_session IF NOT EXISTS
FOR (c:Conversation) ON (c.sessionId)

CREATE INDEX conversation_timestamp IF NOT EXISTS
FOR (c:Conversation) ON (c.timestamp)

CREATE INDEX user_id IF NOT EXISTS
FOR (u:User) ON (u.userId)
```

**Constraints**:
```cypher
CREATE CONSTRAINT conversation_session_unique IF NOT EXISTS
FOR (c:Conversation) REQUIRE c.sessionId IS UNIQUE
```

### Query Optimization

- Use pagination (limit/offset) for large result sets
- Filter by indexed properties (userId, sessionId, timestamp)
- Avoid full table scans

## Analytics Use Cases

### User Behavior Analysis

- Track what types of gifts users search for
- Identify common recipient relationships
- Analyze budget patterns
- Understand seasonal trends

### System Performance

- Monitor agent execution times
- Identify bottlenecks
- Track success/failure rates
- Optimize slow agents

### Recommendation Quality

- Compare recommended vs. actual products
- Track confidence score accuracy
- Analyze tag effectiveness
- Improve recommendation algorithms

### Learning and Improvement

- Build recipient preference models
- Learn from successful recommendations
- Identify product gaps
- Improve context extraction

## Future Enhancements

1. **User Feedback Storage**
   - Store user reactions to recommendations
   - Track which products were purchased
   - Learn from positive/negative feedback

2. **Recommendation Analytics**
   - Track click-through rates
   - Monitor conversion rates
   - A/B test different approaches

3. **Pattern Recognition**
   - Identify common gift scenarios
   - Build templates for frequent queries
   - Suggest proactive recommendations

4. **Export Functionality**
   - Export conversation history
   - Generate reports
   - Data visualization

5. **Privacy Features**
   - Anonymize user data
   - Implement data retention policies
   - GDPR compliance features

## Troubleshooting

### Conversations Not Being Saved

1. Check backend logs for errors
2. Verify Neo4j connection
3. Check `persistConversation()` is being called
4. Verify schema/indexes exist

### Slow Queries

1. Add missing indexes
2. Limit result sets
3. Use appropriate filters
4. Consider caching frequently accessed data

### Data Inconsistencies

1. Verify conversation completion before persistence
2. Check for concurrent write issues
3. Validate data before storing
4. Implement data validation

---

**Last Updated**: October 29, 2025
**Status**: Production Ready

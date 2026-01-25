
# Implementation Plan: Real Backend for Webhook, S3, and Database Connectors

This plan implements fully functional backend edge functions for three incomplete connectors: Webhook endpoint, Amazon S3 integration, and real database query execution.

---

## Current State Analysis

| Connector | Frontend | Backend | Status |
|-----------|----------|---------|--------|
| Webhook | Form UI exists | No endpoint | Placeholder |
| Amazon S3 | Form UI exists | No handler | Placeholder |
| Database | Full UI + NL-to-SQL | Query returns demo data | Partial |

---

## 1. Webhook Endpoint Edge Function

**Goal**: Create a real webhook endpoint that receives POST data, stores it, and makes it available for analysis.

### A. New Edge Function: `webhook-receiver`

```text
New File: supabase/functions/webhook-receiver/index.ts

Features:
- Unique webhook URL per user/connection
- POST data validation and parsing
- JSON and form-urlencoded support
- Rate limiting per webhook
- Data storage in Supabase
- Real-time notification capability
```

### B. Database Table for Webhook Data

```sql
CREATE TABLE webhook_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  headers JSONB,
  source_ip TEXT,
  received_at TIMESTAMPTZ DEFAULT now(),
  processed BOOLEAN DEFAULT false
);

CREATE INDEX idx_webhook_data_webhook_id ON webhook_data(webhook_id);
CREATE INDEX idx_webhook_data_user_id ON webhook_data(user_id);

ALTER TABLE webhook_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their webhook data"
  ON webhook_data FOR SELECT
  USING (auth.uid() = user_id);
```

### C. Implementation Details

```typescript
// Key implementation pattern
serve(async (req) => {
  // Extract webhook ID from URL path
  const url = new URL(req.url);
  const webhookId = url.pathname.split('/').pop();
  
  // Validate webhook exists and get user
  const webhook = await getWebhookConfig(webhookId);
  
  // Parse incoming data (JSON or form)
  const contentType = req.headers.get('content-type');
  let payload;
  if (contentType?.includes('application/json')) {
    payload = await req.json();
  } else if (contentType?.includes('form')) {
    const formData = await req.formData();
    payload = Object.fromEntries(formData);
  }
  
  // Store in database
  await supabase.from('webhook_data').insert({
    webhook_id: webhookId,
    user_id: webhook.user_id,
    payload,
    headers: Object.fromEntries(req.headers),
    source_ip: req.headers.get('x-forwarded-for')
  });
  
  return new Response(JSON.stringify({ received: true }));
});
```

### D. Update fetch-connector-data Function

Add webhook type handler to retrieve stored webhook data:

```typescript
case 'webhook':
  return await fetchWebhookData(config);

async function fetchWebhookData(config: Record<string, string>) {
  const { webhookId, limit } = config;
  
  const { data } = await supabase
    .from('webhook_data')
    .select('payload, received_at')
    .eq('webhook_id', webhookId)
    .order('received_at', { ascending: false })
    .limit(parseInt(limit) || 100);
  
  return data?.map(row => ({
    ...row.payload,
    _received_at: row.received_at
  })) || [];
}
```

---

## 2. Amazon S3 Connector Edge Function

**Goal**: Connect to S3 buckets and fetch CSV/JSON files using AWS SDK.

### A. Update fetch-connector-data Function

Add S3 handler using AWS SDK v3 for Deno:

```typescript
// Import AWS SDK (works in Deno via npm: specifier)
import { S3Client, GetObjectCommand, ListObjectsV2Command } from "npm:@aws-sdk/client-s3@3";

case 's3':
  return await fetchS3Data(config);

async function fetchS3Data(config: Record<string, string>) {
  const { bucket, region, accessKey, secretKey, prefix, fileKey } = config;
  
  // Create S3 client
  const s3 = new S3Client({
    region,
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    }
  });
  
  // If specific file requested
  if (fileKey) {
    return await fetchS3File(s3, bucket, fileKey);
  }
  
  // List files in prefix and fetch latest CSV/JSON
  const listCommand = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
    MaxKeys: 100
  });
  
  const listResult = await s3.send(listCommand);
  const files = (listResult.Contents || [])
    .filter(f => f.Key?.endsWith('.csv') || f.Key?.endsWith('.json'))
    .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0));
  
  if (files.length === 0) {
    throw new Error('No CSV or JSON files found in bucket/prefix');
  }
  
  return await fetchS3File(s3, bucket, files[0].Key!);
}

async function fetchS3File(s3: S3Client, bucket: string, key: string) {
  const getCommand = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3.send(getCommand);
  
  const body = await response.Body?.transformToString();
  if (!body) throw new Error('Empty file');
  
  if (key.endsWith('.json')) {
    const parsed = JSON.parse(body);
    return Array.isArray(parsed) ? parsed : [parsed];
  } else {
    // CSV parsing
    return parseCSV(body, true);
  }
}
```

### B. Security Considerations

- AWS credentials passed per-request (not stored as secrets)
- User provides credentials in connector config
- Optional: Store encrypted credentials in database like database connections

---

## 3. Real Database Query Execution

**Goal**: Enable actual SQL execution against connected PostgreSQL/MySQL databases.

### A. PostgreSQL Support via Deno postgres Driver

```typescript
// Import Deno postgres driver
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

async function executePostgresQuery(
  connection: DatabaseConnection,
  sql: string,
  encryptionKey: string
): Promise<{ results: Record<string, unknown>[]; rowCount: number }> {
  const password = decryptPassword(connection.encrypted_password, encryptionKey);
  
  const client = new Client({
    hostname: connection.host,
    port: connection.port,
    database: connection.database_name,
    user: connection.username,
    password: password,
    tls: connection.ssl_enabled ? { enabled: true } : undefined,
  });
  
  try {
    await client.connect();
    
    const result = await client.queryObject<Record<string, unknown>>(sql);
    
    return {
      results: result.rows,
      rowCount: result.rowCount || 0
    };
  } finally {
    await client.end();
  }
}
```

### B. MySQL Support via mysql2 npm Package

```typescript
import { createConnection } from "npm:mysql2/promise";

async function executeMySQLQuery(
  connection: DatabaseConnection,
  sql: string,
  encryptionKey: string
): Promise<{ results: Record<string, unknown>[]; rowCount: number }> {
  const password = decryptPassword(connection.encrypted_password, encryptionKey);
  
  const conn = await createConnection({
    host: connection.host,
    port: connection.port,
    database: connection.database_name,
    user: connection.username,
    password: password,
    ssl: connection.ssl_enabled ? {} : undefined,
  });
  
  try {
    const [rows] = await conn.query(sql);
    return {
      results: rows as Record<string, unknown>[],
      rowCount: Array.isArray(rows) ? rows.length : 0
    };
  } finally {
    await conn.end();
  }
}
```

### C. Update db-connect Query Handler

Replace the demo response with real execution:

```typescript
case 'query': {
  if (!body.sql) {
    return errorResponse('SQL query required');
  }

  // Validate SQL (already implemented)
  const validation = validateSqlQuery(body.sql);
  if (!validation.valid) {
    return errorResponse(validation.reason);
  }

  // Get connection details
  const { data: connection } = await supabase
    .from('database_connections')
    .select('*')
    .eq('id', body.connectionId)
    .eq('user_id', userId)
    .single();

  if (!connection) {
    return errorResponse('Connection not found', 404);
  }

  // Add LIMIT if not present
  let sql = body.sql;
  if (!sql.toUpperCase().includes('LIMIT')) {
    sql = sql.replace(/;?\s*$/, ' LIMIT 1000;');
  }

  // Execute based on database type
  let result;
  switch (connection.db_type) {
    case 'postgresql':
      result = await executePostgresQuery(connection, sql, encryptionKey);
      break;
    case 'mysql':
      result = await executeMySQLQuery(connection, sql, encryptionKey);
      break;
    default:
      return errorResponse(`Query execution not supported for ${connection.db_type}`);
  }

  // Update last_connected_at
  await supabase
    .from('database_connections')
    .update({ last_connected_at: new Date().toISOString() })
    .eq('id', body.connectionId);

  return successResponse({
    success: true,
    sql: body.sql,
    results: result.results,
    rowCount: result.rowCount,
    columns: result.results.length > 0 ? Object.keys(result.results[0]) : []
  });
}
```

### D. Real Table Listing

```typescript
case 'list-tables': {
  const { data: connection } = await supabase
    .from('database_connections')
    .select('*')
    .eq('id', body.connectionId)
    .eq('user_id', userId)
    .single();

  if (!connection) {
    return errorResponse('Connection not found', 404);
  }

  let sql;
  switch (connection.db_type) {
    case 'postgresql':
      sql = `SELECT table_name FROM information_schema.tables 
             WHERE table_schema = 'public' ORDER BY table_name`;
      break;
    case 'mysql':
      sql = `SELECT table_name FROM information_schema.tables 
             WHERE table_schema = DATABASE() ORDER BY table_name`;
      break;
    default:
      return errorResponse(`Table listing not supported for ${connection.db_type}`);
  }

  const result = await executeQuery(connection, sql, encryptionKey);
  const tables = result.results.map(row => 
    Object.values(row)[0] as string
  );

  return successResponse({ success: true, tables });
}
```

### E. Real Schema Retrieval

```typescript
case 'get-schema': {
  const { data: connection } = await supabase
    .from('database_connections')
    .select('*')
    .eq('id', body.connectionId)
    .eq('user_id', userId)
    .single();

  let sql;
  switch (connection.db_type) {
    case 'postgresql':
      sql = `SELECT column_name, data_type, is_nullable, column_default
             FROM information_schema.columns 
             WHERE table_name = '${body.tableName}' 
             AND table_schema = 'public'
             ORDER BY ordinal_position`;
      break;
    case 'mysql':
      sql = `SELECT column_name, data_type, is_nullable, column_default
             FROM information_schema.columns 
             WHERE table_name = '${body.tableName}'
             AND table_schema = DATABASE()
             ORDER BY ordinal_position`;
      break;
  }

  const result = await executeQuery(connection, sql, encryptionKey);
  
  return successResponse({
    success: true,
    schema: {
      tableName: body.tableName,
      columns: result.results.map(col => ({
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable === 'YES',
        default: col.column_default
      }))
    }
  });
}
```

---

## 4. Frontend Updates

### A. Update WorkflowBuilder.tsx

Update the webhook form to show the real webhook URL:

```typescript
webhook: (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Connection Name</Label>
      <Input ... />
    </div>
    <div className="p-4 rounded-lg bg-muted/50 border">
      <p className="text-sm font-medium mb-2">Your Webhook URL</p>
      <code className="text-xs bg-background px-2 py-1 rounded break-all">
        {`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-receiver/${webhookId}`}
      </code>
      <Button size="sm" variant="outline" onClick={copyToClipboard}>
        Copy URL
      </Button>
    </div>
  </div>
)
```

### B. Add Webhook and S3 to Supported Types

```typescript
const supportedTypes = [
  'google_sheets', 'csv_url', 'json_api', 
  'airtable', 'notion', 'webhook', 's3'  // Add these
];
```

---

## File Changes Summary

### New Files (2 files)
```
supabase/functions/webhook-receiver/index.ts
```

### Modified Files (3 files)
```
supabase/functions/fetch-connector-data/index.ts (add webhook + S3 handlers)
supabase/functions/db-connect/index.ts (real query execution)
src/components/data-agent/WorkflowBuilder.tsx (update frontend)
```

### Database Migration (1 migration)
```
Create webhook_data table with RLS policies
```

### Config Update
```
supabase/config.toml (add webhook-receiver function)
```

---

## Technical Considerations

### Security
- SQL injection prevented by allowing only SELECT statements
- AWS credentials passed per-request, not stored as global secrets
- Webhook data isolated per-user via RLS
- Rate limiting on webhook endpoints (10 req/min default)

### Performance
- Query results limited to 1000 rows max
- S3 file size limited to 50MB
- Connection pooling not available in edge functions (new connection per request)
- Timeout: 60 seconds for database queries

### Limitations
- MongoDB not supported (would require additional driver)
- SQLite not supported (file-based, can't connect remotely)
- Large S3 files may timeout (recommend streaming for files >10MB)

---

## Implementation Order

1. **Database Migration** - Create webhook_data table
2. **Webhook Receiver** - New edge function for receiving data
3. **S3 Handler** - Add to fetch-connector-data
4. **Database Query Execution** - Update db-connect
5. **Frontend Updates** - Wire up new functionality

---

## Testing Plan

After implementation, test with:

1. **Webhook**: Send POST to webhook URL with curl
   ```bash
   curl -X POST https://[project].supabase.co/functions/v1/webhook-receiver/test-123 \
     -H "Content-Type: application/json" \
     -d '{"event": "test", "data": {"value": 42}}'
   ```

2. **S3**: Connect to a test bucket with CSV file

3. **Database**: Connect to a test PostgreSQL instance and run a query

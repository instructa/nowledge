# MCP Server Usage Guide

## Running the Server

### HTTP Mode (Best for Testing)
```bash
# Start with HTTP transport on port 3000
node bin/cli.mjs --http --port 3000

# Or use the development script with inspector
pnpm run dev-http
```

### STDIO Mode (For MCP Clients)
```bash
# Start with STDIO transport (default)
node bin/cli.mjs

# Or
node bin/cli.mjs --stdio
```

### SSE Mode
```bash
# Start with Server-Sent Events transport
node bin/cli.mjs --sse --port 3001

# Or use the development script
pnpm run dev-sse
```

## Available Tools

### 1. `markdown_ingest`
Ingests markdown files into a vector database for semantic search.

**Parameters:**
- `directory` (string): Directory containing markdown files to ingest
- `pattern` (string, optional): File pattern to match (default: "*.md")

**Example HTTP Request:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "markdown_ingest",
      "arguments": {
        "directory": "./docs",
        "pattern": "*.md"
      }
    }
  }'
```

### 2. `markdown_search`
Searches ingested markdown files using semantic similarity.

**Parameters:**
- `query` (string): Search query
- `limit` (number, optional): Maximum results to return (default: 5)

**Example HTTP Request:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "markdown_search",
      "arguments": {
        "query": "How to troubleshoot database issues?",
        "limit": 3
      }
    }
  }'
```

### 3. `deepwiki`
Fetches content from deepwiki.com repositories.

**Parameters:**
- `url` (string): Repository URL or name (e.g., "vercel/ai", "vercel ai", or full URL)
- `maxDepth` (number, optional): Fetch depth (0 for single site, 1 for multiple sites)
- `mode` (string, optional): "aggregate" or "pages" mode

**Example HTTP Request:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "deepwiki",
      "arguments": {
        "url": "vercel/ai",
        "maxDepth": 1,
        "mode": "aggregate"
      }
    }
  }'
```

## Complete Workflow Example

### 1. Start the Server
```bash
node bin/cli.mjs --http --port 3000
```

### 2. Ingest Documents
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "markdown_ingest",
      "arguments": {
        "directory": "./test-docs"
      }
    }
  }'
```

### 3. Search Documents
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "markdown_search",
      "arguments": {
        "query": "vector search setup"
      }
    }
  }'
```

## Using with MCP Clients

For use with Claude Desktop or other MCP clients, add to your MCP configuration:

```json
{
  "mcpServers": {
    "nowledge": {
      "command": "node",
      "args": ["/path/to/nowledge/bin/cli.mjs"]
    }
  }
}
```

## Development Mode

For development with the MCP Inspector:

```bash
# Start development server with inspector
pnpm run dev-http

# This will:
# 1. Start the server on port 4200
# 2. Open the MCP Inspector in your browser
# 3. Allow you to test tools interactively
```

## Troubleshooting

- Ensure the virtual environment is activated: `source venv/bin/activate`
- Check that sqlite-vec and the model are downloaded: `./scripts/setup-sqlite-vec.sh`
- Verify the server is running: `curl http://localhost:3000/mcp`
- Check logs for any Python or embedding model errors

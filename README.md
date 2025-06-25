# Nowledge - MCP Server for Knowledge Management

A Model Context Protocol (MCP) server that combines web content fetching from deepwiki.com repositories with local markdown ingestion and semantic search. Nowledge provides a comprehensive knowledge management system with both external and local document capabilities.

## Features

- **Web Content Fetching**: Retrieve and convert documentation from deepwiki.com repositories
- **Local Document Ingestion**: Process markdown files into a searchable vector database
- **Semantic Search**: Fast similarity-based search across ingested documents
- **STDIO Transport**: Optimized for MCP client integration
- **Lightweight**: SQLite + sqlite-vec for efficient storage and search
- **Docker-ready**: Runs in containerized environments

## Quick Start

### 1. Installation and Setup

```bash
# Install dependencies
pnpm install

# Build the project
pnpm build

# Create and activate Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Setup sqlite-vec and embedding models
./scripts/setup-sqlite-vec.sh
```

### 2. Running the Server

```bash
# STDIO mode (for MCP clients like Claude Desktop)
node bin/cli.mjs --stdio

# Or simply (stdio is default)
node bin/cli.mjs
```

### 3. Using with MCP Clients

Nowledge is designed to work with MCP clients via STDIO transport. The tools are called through the MCP protocol by clients like Claude Desktop, not via direct HTTP requests.

## Available Tools

### `nowledge_fetch`
Fetches content from deepwiki.com repositories and converts it to markdown.

**Parameters:**
- `url` (required): Repository URL, owner/repo name (e.g. "vercel/ai"), or library keyword
- `maxDepth` (optional): 0 for single site, 1 for multiple sites (default: 1)
- `mode` (optional): "aggregate" or "pages" (default: "aggregate")
- `verbose` (optional): Enable verbose output (default: false)

### `markdown_ingest`
Ingests markdown files from a directory into the vector database for semantic search.

**Parameters:**
- `directory` (required): Directory containing markdown files to ingest
- `pattern` (optional): File pattern to match (default: "*.md")

### `markdown_search`
Searches ingested markdown files using semantic similarity.

**Parameters:**
- `query` (required): Search query text
- `limit` (optional): Maximum results to return (default: 5)

### `markdown_list`
Lists all ingested markdown documents in the database.

**Parameters:**
- None required

## Integration with MCP Clients

### Claude Desktop Configuration
Add to your MCP configuration file:

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

### Other MCP Clients
Use the STDIO transport for integration with any MCP-compatible client. All tools are available through the standard MCP protocol.

## Development

```bash
# Build the project
pnpm build

# Run tests
pnpm test

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

**Note**: Always activate the virtual environment (`source venv/bin/activate`) before working with Python dependencies.

## Docker Deployment

```bash
# Build the image
docker build -t nowledge .

# Run with stdio transport
docker run -v ./docs:/app/docs nowledge

# Or use docker-compose
docker-compose up
```

## Architecture

- **Storage**: SQLite with sqlite-vec extension for vector operations
- **Embeddings**: Nomic-embed-text-v1.5 for semantic search
- **Web Fetching**: HTTP crawler for deepwiki.com content
- **Runtime**: Node.js with Python bridge for embeddings
- **Transport**: STDIO transport for MCP client integration

## Performance

- **Web Fetching**: Efficient crawling with depth control
- **Ingestion**: Optimized for batch processing of markdown files
- **Search**: Fast vector similarity search with configurable result limits
- **Memory**: Efficient resource usage with lazy loading

## License

MIT

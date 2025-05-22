# MCP Server with Tiny Markdown Search

A Model Context Protocol (MCP) server with an ultra-lightweight markdown ingestion and vector search system. Total footprint: ~58MB including embeddings model.

## Features

- **Tiny footprint**: SQLite + sqlite-vec (~1.3MB) for storage and vector search
- **Single model**: Nomic-embed-text-v1.5 (35MB) for both embeddings and extractive summaries
- **Fast search**: Native K-NN search without external dependencies
- **Docker-ready**: Runs in a minimal Alpine container

## Quick Start

### 1. Build and run with Docker

```bash
# Build the image
docker build -t mcp-markdown .

# Run with HTTP transport
docker run -p 3000:3000 -v ./markdown:/app/markdown mcp-markdown --http

# Or with docker-compose
docker-compose up
```

### 2. Ingest markdown files

```bash
# Using the MCP tool
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "markdown_ingest",
    "params": {
      "directory": "/app/markdown"
    }
  }'
```

### 3. Search your documents

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "markdown_search",
    "params": {
      "query": "how to setup foo",
      "limit": 5
    }
  }'
```

## Architecture

- **Storage**: SQLite with sqlite-vec extension for native vector operations
- **Embeddings**: Nomic-embed-text-v1.5 128-dimensional Matryoshka model (GGUF format)
- **Runtime**: Node.js with Python bridge for llama-cpp embeddings
- **Summaries**: Extractive summaries using centroid-based sentence selection

## Development

```bash
# Install Node.js dependencies
pnpm install

# Create and activate Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Setup sqlite-vec and models
./scripts/setup-sqlite-vec.sh

# Run in development
pnpm dev
```

**Note**: Always activate the virtual environment (`source venv/bin/activate`) before working with Python dependencies to avoid system package conflicts.

## Tools

### `markdown_ingest`
Ingests markdown files from a directory into the vector database.

Parameters:
- `directory`: Directory containing markdown files
- `pattern`: (optional) File pattern, defaults to "*.md"

### `markdown_search`
Searches ingested documents using semantic similarity.

Parameters:
- `query`: Search query text
- `limit`: (optional) Maximum results, defaults to 5

## Extending

To add generative summaries later, you can drop in a small T5 model:
- google/t5-small (~65MB in INT8 ONNX format)
- Cache generated summaries in the same SQLite database

## Performance

- Ingestion: ~10-50 docs/second depending on size
- Search: <10ms for typical queries
- Memory: ~100MB total with model loaded
- Disk: ~58MB base + your document database

## License

MIT

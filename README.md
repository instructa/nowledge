# Nowledge CLI

A powerful CLI tool for indexing and searching Markdown documentation using vector search. Nowledge creates a SQLite database with vector search capabilities, allowing you to quickly find relevant information across your documentation.

## Features

- **Vector Search**: Find semantically similar content across your documentation
- **Markdown Optimized**: Designed specifically for working with Markdown files
- **Live Watching**: Automatically update the index when files change
- **Fast & Lightweight**: Uses a compact model (10MB) that runs on CPU
- **SQLite Storage**: Self-contained database in a single file
- **Summarization**: Optional extractive summarization of search results

## Installation

### Prerequisites

- Node.js 18+
- SQLite

### Install from npm

```bash
npm install -g mcp-deepwiki
```

### Manual Installation

1. Clone the repository
   ```bash
   git clone https://github.com/regenrek/deepwiki-mcp
   cd deepwiki-mcp
   ```

2. Install dependencies
   ```bash
   pnpm install
   ```

3. Download the embedding model
   ```bash
   pnpm run download-model
   ```

4. Build and prepare the SQLite-Vec extension
   ```bash
   pnpm run setup-sqlite-vec
   ```

5. Build the project
   ```bash
   pnpm run build
   ```

6. Link for global usage
   ```bash
   npm link
   ```

## Usage

### Initialize a Database

```bash
nowledge init
```

### Index Markdown Files

```bash
nowledge ingest "./docs/**/*.md"
```

### Query the Knowledge Base

```bash
nowledge query "How does vector search work?"
```

With summary:

```bash
nowledge query "How does vector search work?" --summary
```

### Watch for Changes

```bash
nowledge watch "./docs"
```

### Optimize the Database

```bash
nowledge vacuum
```

## Configuration

You can create a `nowledge.config.json` file in your project root to customize settings:

```json
{
  "chunkSize": 512,
  "chunkOverlap": 128,
  "maxResults": 5,
  "summaryLength": 10
}
```

## Commands

| Command | Description |
|---------|-------------|
| `init`  | Initialize a new database |
| `ingest` | Index Markdown files |
| `query` | Search for information |
| `watch` | Monitor files for changes |
| `vacuum` | Optimize the database |

## Technical Details

- Uses [TaylorAI/bge-micro-v2](https://huggingface.co/TaylorAI/bge-micro-v2) for embedding (10MB model)
- Generates 384-dimensional vectors
- Utilizes SQLite with the sqlite-vec extension for vector search
- Implements extract-based summarization with wink-nlp

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

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

## Docker Installation

You can run Nowledge using Docker for a portable, containerized experience:

### Quick Start with Docker Compose

1. **Build the image**

   ```bash
   docker compose build            # or: docker compose up -d --build
````

2. **Start the server in detached mode**

   ```bash
   docker compose up -d
   ```

   The first run copies the baked-in model files into the `nowledge_models` volume. Subsequent container recreations start instantly.

3. **Run CLI commands inside the running container**

   ```bash
   # Ingest markdown located in /workspace inside the container
   docker compose exec nowledge nowledge ingest "/workspace/**/*.md"

   # Query the knowledge base
   docker compose exec nowledge nowledge query "How does vector search work?"
   ```

4. **Use your own models (optional)**
   Uncomment the `./models:/models:ro` line in `docker-compose.yml` and place your downloaded model folder at `./models` on the host. The container will then read from that directory instead of the baked copy.

# That is all – everything should now work smoothly.

### Using Docker

1. Build the Docker image:
   ```bash
   docker build -t nowledge .
   ```

2. Run the CLI with Docker:
   ```bash
   # Initialize a new database
   docker run --rm -v nowledge_data:/data nowledge init
   
   # Ingest markdown files
   docker run --rm -v nowledge_data:/data -v $(pwd)/docs:/workspace nowledge ingest "/workspace/**/*.md"
   
   # Query the knowledge base
   docker run --rm -v nowledge_data:/data nowledge query "How does vector search work?"
   ```

3. Run as an HTTP server:
   ```bash
   docker run -d --name nowledge-server \
     -p 4200:3000 \
     -v nowledge_data:/data \
     nowledge --http --port 3000
   ```

### Using Docker Compose

1. Start the server:
   ```bash
   docker-compose up -d
   ```

2. Run CLI commands:
   ```bash
   docker-compose exec nowledge nowledge ingest "/workspace/**/*.md"
   docker-compose exec nowledge nowledge query "How does vector search work?"
   ```

3. Stop the server:
   ```bash
   docker-compose down
   ```

Data is persisted in Docker volumes, so your database will remain intact even if the container is removed.

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
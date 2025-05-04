Thought for 6 seconds

## Implementation work packages for the dev team

---

### Task 1 – build **nowledge** CLI + local index

| Layer                 | Choice                                               | Notes                        |
| --------------------- | ---------------------------------------------------- | ---------------------------- |
| CLI core              | [`citty`](https://github.com/unjs/citty)             | ESM friendly, tiny           |
| Database              | SQLite file per project                              | Portable single-file storage |
| Vector ext.           | [`sqlite-vec`](https://github.com/asg017/sqlite-vec) | Cosine & L2 search           |
| Node binding          | `better-sqlite3`                                     | Sync, fast                   |
| Embedding model       | `TaylorAI/bge-micro-v2` (quant)                      | 6 MB, 384 dims               |
| Runtime               | `@xenova/transformers` + ONNX Runtime Web            | 4 MB lib                     |
| Markdown → text       | `markdown-it`                                        |                              |
| Token counting        | `@huggingface/tokenizers`                            |                              |
| File watch            | `chokidar`                                           |                              |
| Summariser (optional) | `wink-nlp` + `wink-eng-lite-web-model`               | 1.4 MB                       |

##### Expected CLI commands

```bash
nowledge init <project>
nowledge ingest <project> <glob>
nowledge watch <project> <dir>
nowledge query <project> "<prompt>" [--k 5] [--summary]
nowledge vacuum <project>
```

* `--summary` turns on wink-nlp sentence extraction
* default output is Markdown text

##### Rough file tree

```
/src
  cli.ts               main Citty root
  commands/
    init.ts  ingest.ts  watch.ts  query.ts  vacuum.ts
  lib/
    chunker.ts  embedder.ts  storage.ts  summariser.ts
```

##### Acceptance checklist

→ end-to-end index of 50-500 Markdown docs in under 30 s on M-series Mac
→ `nowledge query` returns top-k chunks in <500 ms for 1 k vectors
→ whole tool chain (code + models) <100 MB on disk
→ running `pnpm build && pnpm test` passes unit tests covering embed and search
→ no Internet access required at runtime

---

### Task 2 – expose **nowledge** through an MCP server

| Layer          | Choice                                             | Notes |
| -------------- | -------------------------------------------------- | ----- |
| MCP SDK        | `@modelcontextprotocol/sdk`                        |       |
| Transport      | `StdioServerTransport` – Claude Desktop compatible |       |
| Validation     | `zod`                                              |       |
| Tools          | `doc-search`, `doc-search-summary`                 |       |
| Wrapper launch | compiled binary `nowledge-mcp`                     |       |

##### Server layout

```
/src/mcp
  server.ts            creates McpServer, attaches tools
  runQuery.ts          shells out to nowledge CLI
```

##### Tool contracts

| Name                 | Inputs                   | Output (Markdown)                         |
| -------------------- | ------------------------ | ----------------------------------------- |
| `doc-search`         | `{ project, query, k? }` | raw list of chunk content with file paths |
| `doc-search-summary` | same                     | wink-nlp condensed answer                 |

##### server.ts sketch

```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { runQuery } from './runQuery.js'

const server = new McpServer({ name: 'nowledge', version: '0.1.0', capabilities: { tools: {} } })

server.tool(
  'doc-search',
  'Search Markdown chunks',
  { project: z.string(), query: z.string(), k: z.number().optional() },
  async ({ project, query, k = 5 }) => ({
    content: [{ type: 'text', text: await runQuery(project, query, k, false) }],
  })
)

server.tool(
  'doc-search-summary',
  'Search and summarise Markdown docs',
  { project: z.string(), query: z.string(), k: z.number().optional() },
  async ({ project, query, k = 5 }) => ({
    content: [{ type: 'text', text: await runQuery(project, query, k, true) }],
  })
)

await server.connect(new StdioServerTransport())
```

##### runQuery helper

```ts
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import summarise from './summarise.js' // wink-nlp wrapper

const exec = promisify(execFile)

export async function runQuery(project: string, prompt: string, k: number, doSum: boolean) {
  const { stdout } = await exec('nowledge', ['query', project, prompt, '--k', String(k)])
  return doSum ? summarise(stdout) : stdout.trim()
}
```

##### Claude Desktop config snippet

```json
{
  "mcpServers": {
    "nowledge": {
      "command": "/ABS/PATH/to/nowledge-mcp",
      "args": []
    }
  }
}
```

##### Acceptance checklist

→ Both tools appear under Claude’s hammer icon
→ `doc-search-summary` returns ≤512 tokens
→ Server binary launches in <1 s and stays under 70 MB RSS
→ No network calls – all answers come from local nowledge CLI

---

Hand these two tasks to the developer in order. After Task 1 is finished and tested locally, Task 2 is just a thin wrapper and should take <1 day.

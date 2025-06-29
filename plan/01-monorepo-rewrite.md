# Plan to Refactor `nowledge` into a pnpm Monorepo

## Overview

The objective is to restructure the `nowledge` project into a pnpm workspace monorepo, mirroring the architecture of `codetie3`. This will enhance modularity, scalability, and the overall organization of the code. The refactoring will result in three primary packages: `@nowledge/core` for the main application logic, `@nowledge/cli` for the command-line interface, and `@nowledge/mcp` for the Model Context Protocol server.

## 1. New Directory Structure

The refactored project will adopt the following directory structure:

```
nowledge/
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── converter/
│   │   │   ├── lib/
│   │   │   ├── utils/
│   │   │   └── types.ts
│   │   ├── package.json
│   │   ├── build.config.ts
│   │   └── tsconfig.json
│   ├── cli/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── commands/
│   │   │       ├── crawl.ts
│   │   │       ├── scrape.ts
│   │   │       ├── screenshot.ts
│   │   │       ├── fetch.ts
│   │   │       └── init.ts
│   │   ├── package.json
│   │   ├── build.config.ts
│   │   └── tsconfig.json
│   └── mcp/
│       ├── src/
│       │   ├── index.ts
│       │   ├── server.ts
│       │   ├── tools/
│       │   └── schemas/
│       ├── package.json
│       ├── build.config.ts
│       └── tsconfig.json
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .gitignore
└── ... (other root level files like README.md, LICENSE)
```

## 2. Create `pnpm-workspace.yaml`

A `pnpm-workspace.yaml` file will be created at the root of the `nowledge` project to define the workspace packages:

```yaml
packages:
  - 'packages/*'
```

## 3. Root `package.json`

The root `package.json` will be updated to manage the workspaces and centralize the development dependencies that are common across all packages.

### Key Changes:
- **`name`**: `nowledge` (not scoped, to maintain npm install nowledge compatibility)
- **`private`**: Set to `true`
- **`scripts`**: Will contain scripts to build, test, and lint all packages from the root directory
- **`devDependencies`**: All `devDependencies` from the current `nowledge/package.json` will be moved to the root `package.json`. This includes:
  - `typescript`
  - `unbuild`
  - `@antfu/eslint-config`
  - `vitest`
  - `tsx`
  - `nodemon`
  - And other development tools

### Example Root Scripts:
```json
{
  "scripts": {
    "build": "pnpm -r --filter './packages/**' build",
    "build:core": "pnpm -r --filter '@nowledge/core' build",
    "build:cli": "pnpm -r --filter '@nowledge/cli' build",
    "dev": "pnpm -r --parallel run dev",
    "test": "pnpm -r run test",
    "lint": "eslint --cache .",
    "typecheck": "tsc -p tsconfig.base.json --noEmit && pnpm -r --parallel run typecheck",
    "release": "tsx scripts/release.ts"
  }
}
```

## 4. Create `@nowledge/core` Package

This package will encapsulate the core business logic of the `nowledge` application.

### File Migration:
- Create `packages/core/src` directory
- Move contents of current `src/` directory (excluding CLI and MCP-specific files) to `packages/core/src/`:
  - `converter/`
  - `lib/`
  - `utils/`
  - `types.ts`
  - Create a new core-specific `index.ts`

### `packages/core/package.json`:
```json
{
  "name": "@nowledge/core",
  "version": "0.0.1",
  "type": "module",
  "main": "./dist/index.mjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "unbuild",
    "dev": "unbuild --stub",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@chatmcp/sdk": "^1.0.6",
    "@modelcontextprotocol/sdk": "^1.9.0",
    "h3": "^1.15.1",
    "hast-util-from-html": "^2.0.3",
    "hast-util-sanitize": "^5.0.2",
    "linkedom": "^0.18.9",
    "ofetch": "^1.4.1",
    "p-queue": "^8.1.0",
    "rehype-parse": "^9.0.1",
    "rehype-remark": "^10.0.1",
    "rehype-sanitize": "^6.0.0",
    "remark-gfm": "^4.0.1",
    "remark-stringify": "^11.0.0",
    "robots-parser": "^3.0.1",
    "undici": "^7.8.0",
    "unified": "^11.0.5",
    "unist-util-visit": "^5.0.0",
    "wink-eng-lite-web-model": "^1.0.0",
    "wink-nlp": "^1.10.0",
    "zod": "^3.24.3"
  }
}
```

### `packages/core/build.config.ts`:
```typescript
import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['src/index'],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: false,
  },
})
```

### `packages/core/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## 5. Create `@nowledge/cli` Package

This package will be dedicated to the command-line interface.

### File Structure:
- `packages/cli/src/index.ts`: Entry point for the CLI using citty
- `packages/cli/src/commands/`: Directory for CLI commands
  - `crawl.ts`: Command stub for crawling functionality
  - `scrape.ts`: Command stub for scraping functionality
  - `screenshot.ts`: Command stub for screenshot functionality
  - `fetch.ts`: Command stub for fetch functionality
  - `init.ts`: Command stub for project initialization
- Move basic CLI logic from `bin/cli.mjs` to `packages/cli/src/`

### `packages/cli/package.json`:
```json
{
  "name": "@nowledge/cli",
  "version": "0.0.1",
  "type": "module",
  "bin": {
    "nowledge": "./dist/index.mjs",
    "mcp-nowledge": "./dist/index.mjs"
  },
  "files": ["dist"],
  "scripts": {
    "build": "unbuild",
    "dev": "unbuild --stub",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@nowledge/core": "workspace:*",
    "citty": "^0.1.6"
  }
}
```

### `packages/cli/build.config.ts`:
```typescript
import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['src/index'],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: false,
  },
})
```

## 6. TypeScript Configuration

### `tsconfig.base.json` (Root):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "composite": true
  }
}
```

### `packages/core/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### `packages/cli/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"],
  "references": [
    { "path": "../core" }
  ]
}
```

## 6. Create `@nowledge/mcp` Package

This package will handle the Model Context Protocol server functionality.

### File Migration:
- Create `packages/mcp/src` directory
- Move MCP-specific files from current `src/` directory to `packages/mcp/src/`:
  - `server.ts`
  - `tools/`
  - `schemas/`
  - Current `index.ts` content (MCP server initialization)

### `packages/mcp/package.json`:
```json
{
  "name": "@nowledge/mcp",
  "version": "0.0.1",
  "type": "module",
  "bin": {
    "mcp-nowledge": "./dist/index.mjs"
  },
  "files": ["dist"],
  "scripts": {
    "build": "unbuild",
    "dev": "unbuild --stub",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@nowledge/core": "workspace:*",
    "@modelcontextprotocol/sdk": "^1.9.0",
    "@chatmcp/sdk": "^1.0.6",
    "citty": "^0.1.6"
  }
}
```

### `packages/mcp/build.config.ts`:
```typescript
import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['src/index'],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: false,
  },
})
```

### `packages/mcp/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"],
  "references": [
    { "path": "../core" }
  ]
}
```

## 7. Implementation Steps

### Phase 1: Setup Monorepo Structure
1. Create new directory structure: `packages/`, `packages/core/`, `packages/cli/`, `packages/mcp/`
2. Create `pnpm-workspace.yaml`
3. Update root `package.json` (name as `nowledge`, set private, move devDependencies, add workspace scripts)

### Phase 2: Create Core Package
1. Create `packages/core/package.json`
2. Create `packages/core/build.config.ts`
3. Create `packages/core/tsconfig.json` with path aliases
4. Move core source files from `src/` to `packages/core/src/` (converter, lib, utils, types.ts)
5. Update imports in core files to use path aliases (@/utils, @/lib, etc.)

### Phase 3: Create CLI Package
1. Create `packages/cli/package.json`
2. Create `packages/cli/build.config.ts`
3. Create `packages/cli/tsconfig.json` with path aliases
4. Create `packages/cli/src/index.ts` using citty
5. Create command stubs in `packages/cli/src/commands/` (crawl, scrape, screenshot, fetch, init)
6. Update CLI to import from `@nowledge/core`

### Phase 4: Create MCP Package
1. Create `packages/mcp/package.json`
2. Create `packages/mcp/build.config.ts`
3. Create `packages/mcp/tsconfig.json` with path aliases
4. Move MCP-specific files (server.ts, tools/, schemas/, current index.ts content)
5. Update MCP package to import from `@nowledge/core`

### Phase 5: Update Configuration Files
1. Create `tsconfig.base.json` at root
2. Update `.gitignore` to include workspace-specific patterns
3. Update `eslint.config.js` to work with monorepo structure
4. Move `vite.config.ts` to appropriate package if needed

### Phase 6: Testing and Verification
1. Run `pnpm install` from root to link packages
2. Run `pnpm build` to build all packages
3. Test CLI functionality
4. Run tests with `pnpm test`
5. Verify linting with `pnpm lint`

### Phase 7: Update Documentation
1. Update `README.md` to reflect monorepo structure
2. Add package-specific README files
3. Update `CONTRIBUTING.md` with monorepo development instructions

## 8. Benefits of This Structure

1. **Modularity**: Clear separation between core logic, CLI, and MCP server
2. **Scalability**: Easy to add new packages (e.g., `@nowledge/web-ui`, `@nowledge/plugins`)
3. **Dependency Management**: Shared dependencies at root level
4. **Version Strategy**: Simplified maintenance with synchronized versioning
5. **Better Testing**: Isolated testing for each package (with e2e CLI smoke tests)
6. **Type Safety**: Improved TypeScript support with project references and path aliases
7. **NPM Compatibility**: Main package remains installable as `nowledge`

## 9. Future Considerations

- Add more packages as needed (e.g., `@nowledge/docs`, `@nowledge/examples`)
- Consider adding a `templates/` directory for project templates
- Implement automated publishing workflow for packages
- Add changesets for better version management
- Consider adding turborepo for enhanced monorepo performance

## 10. Migration Checklist

- [ ] Backup current project
- [ ] Create new branch for migration
- [ ] Setup monorepo structure with three packages
- [ ] Migrate core package with path aliases
- [ ] Migrate CLI package with command stubs (crawl, scrape, screenshot, fetch, init)
- [ ] Migrate MCP package with server, tools, and schemas
- [ ] Update all imports to use path aliases and workspace references
- [ ] Update configuration files (TypeScript, ESLint, etc.)
- [ ] Run full test suite (focus on CLI e2e smoke tests)
- [ ] Update documentation
- [ ] Test that `npm install nowledge` still works
- [ ] Test published packages locally
- [ ] Merge migration branch

## 11. Key Implementation Notes

### CLI Commands
The CLI will use citty and have the following command structure:
- `nowledge crawl` - Web crawling functionality
- `nowledge scrape` - Web scraping functionality
- `nowledge screenshot` - Screenshot capture functionality
- `nowledge fetch` - Content fetching functionality
- `nowledge init` - Project initialization

### MCP Server Package
The MCP package will contain:
- The Model Context Protocol server implementation
- All MCP-related tools from `src/tools/`
- All MCP-related schemas from `src/schemas/`
- The current server initialization logic from `src/index.ts`

### Path Aliases
All packages will use TypeScript path aliases for cleaner imports:
- `@/utils` instead of `../../../utils`
- `@/lib` instead of relative paths
- This makes refactoring easier and imports more maintainable

### Version Management
For easier maintenance, consider using a synchronized versioning approach initially, where all packages share the same version number. This can be managed through the release script.

### Test Strategy
- Each package can have its own unit tests
- Focus on CLI e2e smoke tests for the main functionality
- Test stubs will be created but not implemented initially

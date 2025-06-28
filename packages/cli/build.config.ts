import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['src/index'],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: false,
    esbuild: {
      target: 'node18',
    },
  },
  hooks: {
    'rollup:done': async (ctx) => {
      // Make the CLI executable
      const fs = await import('fs')
      const path = await import('path')
      const distPath = path.join(ctx.options.rootDir, 'dist/index.mjs')
      fs.chmodSync(distPath, '755')
    },
  },
})
import { defineCommand } from 'citty'
import { cwdArgs } from './commands/_shared'
import { commands } from './commands/index'
import { getPackageJson } from './utils'

const pkg = getPackageJson()
const name = pkg?.name || ''
const version = pkg?.version || ''
const description = pkg?.description || ''

export const main = defineCommand({
  meta: {
    name,
    version,
    description,
  },
  args: {
    ...cwdArgs,
    command: {
      type: 'positional',
      required: false,
    },
  },
  subCommands: commands,
  setup(ctx) {
    // Initialize ctx.data if it doesn't exist
    ctx.data = ctx.data || {}
  },
})

export default main

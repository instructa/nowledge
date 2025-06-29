import { defineCommand } from 'citty'

export const initCommand = defineCommand({
  meta: {
    name: 'init',
    description: 'Initialize a new nowledge project',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Project name',
      default: 'my-nowledge-project',
    },
    template: {
      type: 'string',
      description: 'Project template to use',
      default: 'default',
    },
  },
  run({ args }) {
    console.log('Init command - Not implemented yet')
    console.log('Project name:', args.name)
    console.log('Template:', args.template)
  },
})

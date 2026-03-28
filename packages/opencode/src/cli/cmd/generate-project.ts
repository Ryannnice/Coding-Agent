import { cmd } from "./cmd"
import type { Argv } from "yargs"
import { bootstrap } from "../bootstrap"
import { generateProjectFiles } from "../../server/generate-project"

export const GenerateProjectCommand = cmd({
  command: "generate-project",
  describe: "generate a complete project and return it as structured JSON",
  builder: (yargs: Argv) =>
    yargs.option("prompt", {
      describe: "project generation prompt",
      type: "string",
      demandOption: true,
    }),
  handler: async (args) => {
    await bootstrap(process.cwd(), async () => {
      const result = await generateProjectFiles(args.prompt)
      process.stdout.write(JSON.stringify(result))
    })
  },
})

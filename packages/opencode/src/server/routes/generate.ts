import { Hono } from "hono"
import { describeRoute, resolver, validator } from "hono-openapi"
import z from "zod"
import { isProjectGenerationIntent } from "@/plugin/prompt-enhancer"
import { lazy } from "@/util/lazy"
import { generateProjectFiles } from "../generate-project"
import { errors } from "../error"

const GenerateRequest = z.object({
  prompt: z.string().trim().min(1).describe("The user prompt describing the project to generate"),
})

const GenerateResponse = z.object({
  files: z.array(
    z.object({
      path: z.string().describe("Relative POSIX file path"),
      content: z.string().describe("UTF-8 file content"),
    }),
  ),
})

export const GenerateRoutes = lazy(() =>
  new Hono()
    .post(
      "/generate",
      describeRoute({
        summary: "Generate project files",
        description:
          "Generate a complete project from a single prompt and return it as a structured files manifest.",
        operationId: "generate.project",
        responses: {
          200: {
            description: "Generated project files",
            content: {
              "application/json": {
                schema: resolver(GenerateResponse),
              },
            },
          },
          ...errors(400),
        },
      }),
      validator("json", GenerateRequest),
      async (c) => {
        const body = c.req.valid("json")
        const prompt = body.prompt.trim()

        if (!isProjectGenerationIntent(prompt)) {
          return c.json(
            {
              name: "InvalidGeneratePrompt",
              message: "The /generate endpoint only accepts prompts that request a full project generation.",
            },
            400,
          )
        }

        return c.json(await generateProjectFiles(prompt))
      },
    ),
)

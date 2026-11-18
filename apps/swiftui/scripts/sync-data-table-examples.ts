import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { Script } from "node:vm"
import ts from "typescript"
import { z } from "zod"

const optionSchema = z.object({
  value: z.string(),
  label: z.string(),
  tone: z
    .enum(["neutral", "info", "success", "warning", "destructive"])
    .optional(),
  image: z.url().optional(),
})
const examplesSchema = z.object({
  now: z.number(),
  rows: z.array(
    z.object({
      id: z.string(),
      company: z.string(),
      stage: z.string(),
      owner: z.string(),
      segments: z.array(z.string()),
      value: z.number(),
      probability: z.number(),
      health: z.number(),
      seats: z.number(),
      lastContact: z.string(),
      website: z.string(),
      contact: z.string(),
      active: z.boolean(),
    })
  ),
  columns: z.array(
    z.object({
      id: z.string(),
      size: z.number().optional(),
      meta: z.object({
        type: z.enum([
          "text",
          "status",
          "person",
          "tags",
          "currency",
          "percent",
          "progress",
          "number",
          "date",
          "link",
          "email",
          "boolean",
        ]),
        label: z.string(),
        primary: z.boolean().optional(),
        pin: z.enum(["start", "end"]).optional(),
        aggregate: z
          .enum(["count", "unique", "sum", "average", "max", "checked"])
          .optional(),
        editable: z.boolean().optional(),
        options: z.array(optionSchema).optional(),
        format: z
          .object({
            fractionDigits: z.number().int().nonnegative().optional(),
            relative: z.boolean().optional(),
          })
          .optional(),
      }),
    })
  ),
})

export function readDataTableExamples(source: string) {
  const file = ts.createSourceFile(
    "data-table-demo.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )
  const required = new Set([
    "STAGES",
    "OWNERS",
    "SEGMENTS",
    "NAMES",
    "KINDS",
    "NOW",
    "DAY",
    "createRandom",
    "getAccounts",
    "database",
  ])
  const declarations = new Map<string, string>()
  const columns: string[] = []
  for (const statement of file.statements) {
    if (
      ts.isFunctionDeclaration(statement) &&
      statement.name &&
      required.has(statement.name.text)
    ) {
      declarations.set(statement.name.text, statement.getText(file))
    }
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer)
        continue
      if (required.has(declaration.name.text))
        declarations.set(
          declaration.name.text,
          `const ${declaration.getText(file)};`
        )
      if (declaration.name.text !== "columns") continue
      function visit(node: ts.Node) {
        if (
          ts.isCallExpression(node) &&
          ts.isPropertyAccessExpression(node.expression) &&
          node.expression.expression.getText(file) === "column" &&
          node.expression.name.text === "accessor"
        ) {
          const [id, options] = node.arguments
          if (
            !id ||
            !ts.isStringLiteral(id) ||
            !options ||
            !ts.isObjectLiteralExpression(options)
          )
            throw new Error("Invalid canonical Data Table column")
          columns.push(
            `{ id: ${id.getText(file)}, ...${options.getText(file)} }`
          )
        }
        ts.forEachChild(node, visit)
      }
      visit(declaration.initializer)
    }
  }
  for (const name of required) {
    if (!declarations.has(name))
      throw new Error(`Missing canonical Data Table declaration: ${name}`)
  }
  if (columns.length !== 12)
    throw new Error("Expected all 12 canonical Data Table value columns")
  // Evaluate only the checked-in pure fixture declarations, without importing React or its UI.
  const script = ts.transpileModule(
    `${[...declarations.values()].join("\n")}\n({ now: NOW, rows: database, columns: [${columns.join(",")}] });`,
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.None,
      },
    }
  ).outputText
  const result: unknown = new Script(script, {
    filename: "data-table-fixtures.js",
  }).runInNewContext({}, { timeout: 5000 })
  return examplesSchema.parse(result)
}

export async function syncDataTableExamples(projectRoot: string) {
  const source = await readFile(
    path.join(projectRoot, "apps/web/examples/base/data-table-demo.tsx"),
    "utf8"
  )
  const output = path.join(projectRoot, "apps/swiftui/.build")
  await mkdir(output, { recursive: true })
  await writeFile(
    path.join(output, "data-table-examples.json"),
    `${JSON.stringify(readDataTableExamples(source))}\n`
  )
}

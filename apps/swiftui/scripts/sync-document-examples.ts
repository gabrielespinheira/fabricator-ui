import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import ts from "typescript"

export async function syncDocumentExamples(projectRoot: string) {
  async function readExample(filename: string, variable: string) {
    const source = await readFile(
      path.join(projectRoot, "apps/web/examples/base", filename),
      "utf8"
    )
    const file = ts.createSourceFile(
      filename,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    )
    let value: string | undefined
    function visit(node: ts.Node) {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.name.text === variable &&
        node.initializer &&
        ts.isNoSubstitutionTemplateLiteral(node.initializer)
      )
        value = node.initializer.text
      ts.forEachChild(node, visit)
    }
    visit(file)
    if (value === undefined)
      throw new Error(
        `Expected the canonical ${variable} template in ${filename}`
      )
    return value
  }
  const examples = {
    markdown: await readExample("markdown-demo.tsx", "markdown"),
    code: await readExample("syntax-highlight-demo.tsx", "code"),
    editor: await readExample("editor-demo.tsx", "notes"),
  }
  const output = path.join(projectRoot, "apps/swiftui/.build")
  await mkdir(output, { recursive: true })
  await writeFile(
    path.join(output, "document-examples.json"),
    `${JSON.stringify(examples)}\n`
  )
}

import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import ts from "typescript"

const ICON_MODULE_REGEX = /^(?:lucide-react|(?:@\/lib\/|\.\/)site-icons)$/

function getSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .sort((first, second) => first.name.localeCompare(second.name))
    .flatMap((entry) => {
      const file = join(directory, entry.name)
      if (entry.isDirectory()) return getSourceFiles(file)
      if (!/\.tsx?$/.test(entry.name) || /\.test\.tsx?$/.test(entry.name))
        return []
      return [file]
    })
}

export function scanSiteIconNames(root: string, sources: readonly string[]) {
  const names = new Set<string>()
  for (const source of sources) {
    const directory = join(root, source)
    if (!existsSync(directory)) continue
    for (const file of getSourceFiles(directory)) {
      const sourceFile = ts.createSourceFile(
        file,
        readFileSync(file, "utf-8"),
        ts.ScriptTarget.Latest,
        true
      )
      function visit(node: ts.Node) {
        if (
          ts.isImportDeclaration(node) &&
          ts.isStringLiteral(node.moduleSpecifier) &&
          ICON_MODULE_REGEX.test(node.moduleSpecifier.text) &&
          !node.importClause?.isTypeOnly
        ) {
          const bindings = node.importClause?.namedBindings
          if (bindings && ts.isNamedImports(bindings)) {
            for (const specifier of bindings.elements) {
              const name = (specifier.propertyName ?? specifier.name).text
              if (!specifier.isTypeOnly && !/^Lucide/.test(name))
                names.add(name)
            }
          }
        }
        if (
          (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) &&
          node.tagName.getText(sourceFile) === "IconPlaceholder"
        ) {
          for (const attribute of node.attributes.properties) {
            if (
              ts.isJsxAttribute(attribute) &&
              attribute.name.getText(sourceFile) === "lucide" &&
              attribute.initializer &&
              ts.isStringLiteral(attribute.initializer)
            )
              names.add(attribute.initializer.text)
          }
        }
        ts.forEachChild(node, visit)
      }
      visit(sourceFile)
    }
  }
  return Array.from(names).sort()
}

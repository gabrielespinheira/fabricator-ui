import path from "node:path"
import ts from "typescript"

export const PACKAGE_CLASS_PREFIX = "fab"

export function transformPackageSource(
  filename: string,
  source: string,
  files: ReadonlySet<string>
) {
  const document = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true
  )
  const edits = new Map<number, { end: number; text: string }>()
  const dependencies = new Set<string>()
  const candidates = new Set<string>()

  function replace(node: ts.Node, text: string) {
    edits.set(node.getStart(document), { end: node.getEnd(), text })
  }

  function prefix(node: ts.StringLiteralLike, isAttribute = false) {
    const classes = node.text
      .split(/\s+/)
      .filter(Boolean)
      .map((name) => {
        const candidate = `${PACKAGE_CLASS_PREFIX}:${name}`
        candidates.add(candidate)
        return candidate
      })
    const literal = JSON.stringify(classes.join(" "))
    replace(node, isAttribute ? `{${literal}}` : literal)
  }

  function visitClassExpression(node: ts.Node) {
    if (ts.isStringLiteralLike(node)) return prefix(node)
    if (ts.isPropertyAssignment(node))
      return visitClassExpression(node.initializer)
    if (ts.isConditionalExpression(node)) {
      visitClassExpression(node.whenTrue)
      visitClassExpression(node.whenFalse)
      return
    }
    if (ts.isBinaryExpression(node)) {
      if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
        visitClassExpression(node.right)
      }
      return
    }
    if (ts.isCallExpression(node)) return
    ts.forEachChild(node, visitClassExpression)
  }

  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const specifier = node.moduleSpecifier
      if (specifier && ts.isStringLiteral(specifier)) {
        const target = specifier.text
        if (target.startsWith("@/")) {
          const local = target.replace(/^@\/registry\/base-fabricator\//, "")
          if (
            ![".ts", ".tsx"].some((extension) =>
              files.has(`${local}${extension}`)
            )
          ) {
            throw new Error(
              `${filename} has an unresolved registry import ${target}`
            )
          }
          const relative = path.posix.relative(
            path.posix.dirname(filename),
            local
          )
          const entry = relative.startsWith(".") ? relative : `./${relative}`
          replace(specifier, JSON.stringify(`${entry}.js`))
        } else if (!target.startsWith(".")) {
          dependencies.add(
            target
              .split("/")
              .slice(0, target.startsWith("@") ? 2 : 1)
              .join("/")
          )
        }
      }
    }
    if (
      ts.isJsxAttribute(node) &&
      node.name.getText(document) === "className"
    ) {
      const value = node.initializer
      if (value && ts.isStringLiteral(value)) prefix(value, true)
      if (value && ts.isJsxExpression(value) && value.expression)
        visitClassExpression(value.expression)
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      if (node.expression.text === "cn")
        node.arguments.forEach(visitClassExpression)
      if (node.expression.text === "cva") {
        const [base, config] = node.arguments
        if (base) visitClassExpression(base)
        if (config && ts.isObjectLiteralExpression(config)) {
          for (const property of config.properties) {
            if (
              ts.isPropertyAssignment(property) &&
              property.name.getText(document) === "variants"
            ) {
              visitClassExpression(property.initializer)
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(document)
  let content = source
  for (const [start, edit] of Array.from(edits).sort(
    ([left], [right]) => right - left
  )) {
    content = `${content.slice(0, start)}${edit.text}${content.slice(edit.end)}`
  }
  return {
    content,
    candidates: [...candidates],
    dependencies: [...dependencies],
  }
}

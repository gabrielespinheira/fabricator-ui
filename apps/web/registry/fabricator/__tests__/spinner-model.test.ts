import { fileURLToPath } from "node:url"
import {
  createProgram,
  flattenDiagnosticMessageText,
  getPreEmitDiagnostics,
  ScriptTarget,
} from "typescript"
import { expect, it } from "vitest"

it("typechecks the installed spinner model with strict consumer index access", () => {
  const source = fileURLToPath(
    new URL("../shared/lib/spinner-model.ts", import.meta.url)
  )
  const program = createProgram([source], {
    strict: true,
    noUncheckedIndexedAccess: true,
    noEmit: true,
    skipLibCheck: true,
    target: ScriptTarget.ES2022,
    types: [],
  })
  const diagnostics = getPreEmitDiagnostics(program).map((diagnostic) =>
    flattenDiagnosticMessageText(diagnostic.messageText, "\n")
  )
  expect(diagnostics).toEqual([])
})

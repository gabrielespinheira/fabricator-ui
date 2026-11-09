import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import {
  FileUpload,
  FileUploadField,
} from "@/registry/fabricator/shared/ui/file-upload"

// The site's icon placeholder reads the icon library from the URL.
vi.mock("@/app/(create)/components/icon-placeholder", () => ({
  IconPlaceholder: () => <svg />,
}))

function createFile(name: string, type: string, size = 10) {
  return new File([new Uint8Array(size)], name, { type })
}

function renderField(
  props: React.ComponentProps<typeof FileUpload>,
  fieldProps: React.ComponentProps<typeof FileUploadField> = {}
) {
  return renderToStaticMarkup(
    <FileUpload {...props}>
      <FileUploadField {...fieldProps} />
    </FileUpload>
  )
}

describe("FileUploadField", () => {
  it("is a field frame with a browse button showing the placeholder", () => {
    const html = renderField({}, { id: "resume" })
    expect(html).toContain('data-slot="file-upload-field"')
    expect(html).toMatch(
      /<button[^>]*id="resume"[^>]*data-slot="file-upload-field-browse"/
    )
    expect(html).toContain("Choose a file or drop it here")
  })

  it("says files when it takes several", () => {
    expect(renderField({ multiple: true })).toContain(
      "Choose files or drop them here"
    )
  })

  it("takes a placeholder of your own", () => {
    expect(renderField({}, { placeholder: "Attach a PDF" })).toContain(
      "Attach a PDF"
    )
  })

  it("shows each picked file as a chip with a remove button, in one scrolling row", () => {
    const html = renderField({
      multiple: true,
      defaultValue: [
        createFile("brief.pdf", "application/pdf", 2048),
        createFile("notes.md", "", 512),
      ],
    })
    expect(html.match(/data-slot="file-upload-chip"/g)).toHaveLength(2)
    expect(html).toMatch(
      /data-slot="file-upload-chips"[\s\S]*brief\.pdf[\s\S]*notes\.md/
    )
    expect(html).toContain('aria-label="Remove brief.pdf"')
    expect(html).toContain('aria-label="Remove notes.md"')
    expect(html).not.toContain("Choose files or drop them here")
  })

  it("keeps the size off the chip, in its tooltip", () => {
    const html = renderField({
      defaultValue: [createFile("brief.pdf", "application/pdf", 2048)],
    })
    expect(html).toContain('title="brief.pdf, 2 KB"')
    expect(html).not.toMatch(/>2 KB</)
  })

  it("adds more with multiple, or replaces without, from an icon button", () => {
    const file = createFile("photo.png", "image/png")
    const several = renderField({ multiple: true, defaultValue: [file] })
    expect(several).toMatch(
      /aria-label="Add files"[^>]*data-slot="file-upload-field-browse"/
    )
    expect(several).not.toMatch(/>Add</)
    expect(renderField({ defaultValue: [file] })).toMatch(
      /aria-label="Replace file"[^>]*data-slot="file-upload-field-browse"/
    )
  })

  it("marks the frame invalid and disabled, and disables its buttons", () => {
    const html = renderField({ disabled: true }, { "aria-invalid": true })
    expect(html).toMatch(/data-slot="file-upload-field"[^>]*data-invalid=""/)
    expect(html).toMatch(/data-slot="file-upload-field"[^>]*data-disabled=""/)
    expect(html).toMatch(
      /<button[^>]*disabled=""[^>]*data-slot="file-upload-field-browse"/
    )
  })
})

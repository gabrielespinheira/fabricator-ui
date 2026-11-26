import {
  Folder,
  FolderFile,
  FolderFiles,
  FolderPreview,
  FolderTitle,
} from "@/styles/aria-fabricator/ui/folder"

const COLORS = [
  { color: undefined, name: "Neutral" },
  { color: "primary", name: "Primary" },
  { color: "blue", name: "Blue" },
  { color: "teal", name: "Teal" },
  { color: "green", name: "Green" },
  { color: "yellow", name: "Yellow" },
  { color: "orange", name: "Orange" },
  { color: "red", name: "Red" },
  { color: "pink", name: "Pink" },
  { color: "purple", name: "Purple" },
]

export function FolderColors() {
  return (
    <div className="max-w-full scroll-fade-x scrollbar-none overflow-x-auto p-1">
      <div className="grid grid-flow-col grid-rows-2 gap-1">
        {COLORS.map(({ color, name }) => (
          <Folder key={name} color={color} size="sm" className="shrink-0">
            <FolderPreview>
              <FolderFiles>
                <FolderFile />
                <FolderFile />
              </FolderFiles>
            </FolderPreview>
            <FolderTitle>{name}</FolderTitle>
          </Folder>
        ))}
      </div>
    </div>
  )
}

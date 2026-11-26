import {
  Folder,
  FolderDescription,
  FolderFile,
  FolderFiles,
  FolderPreview,
  FolderTitle,
} from "@/styles/radix-fabricator/ui/folder"

const COUNTS = [0, 1, 2, 3, 12]

export function FolderEmpty() {
  return (
    <div className="flex max-w-full scroll-fade-x scrollbar-none gap-1 overflow-x-auto p-1">
      {COUNTS.map((count) => (
        <Folder key={count} color="cyan" size="sm" className="shrink-0">
          <FolderPreview>
            <FolderFiles>
              {Array.from({ length: count }, (_, index) => (
                <FolderFile key={index} />
              ))}
            </FolderFiles>
          </FolderPreview>
          <FolderTitle>
            {count === 0
              ? "Empty"
              : `${count} ${count === 1 ? "file" : "files"}`}
          </FolderTitle>
          <FolderDescription>
            {count === 0 ? "Nothing inside" : `Shows ${Math.min(count, 3)}`}
          </FolderDescription>
        </Folder>
      ))}
    </div>
  )
}

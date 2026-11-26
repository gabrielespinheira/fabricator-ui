import {
  Folder,
  FolderDescription,
  FolderFile,
  FolderFiles,
  FolderPreview,
  FolderTitle,
} from "@/styles/base-fabricator/ui/folder"

export function FolderSizes() {
  return (
    <div className="flex max-w-full scroll-fade-x scrollbar-none items-end gap-2 overflow-x-auto p-1">
      {(["sm", "default", "lg"] as const).map((size) => (
        <Folder key={size} size={size} color="blue" className="shrink-0">
          <FolderPreview>
            <FolderFiles>
              <FolderFile />
              <FolderFile />
            </FolderFiles>
          </FolderPreview>
          <FolderTitle>Reports</FolderTitle>
          <FolderDescription>{size}</FolderDescription>
        </Folder>
      ))}
    </div>
  )
}

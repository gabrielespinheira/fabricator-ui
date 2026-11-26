import {
  Folder,
  FolderDescription,
  FolderFile,
  FolderFiles,
  FolderPreview,
  FolderTitle,
} from "@/styles/radix-fabricator/ui/folder"

export function FolderGlass() {
  return (
    <div className="flex max-w-full scroll-fade-x scrollbar-none gap-2 overflow-x-auto p-1">
      <Folder variant="glass" className="shrink-0">
        <FolderPreview>
          <FolderFiles>
            <FolderFile />
            <FolderFile />
            <FolderFile />
          </FolderFiles>
        </FolderPreview>
        <FolderTitle>Résumés</FolderTitle>
        <FolderDescription>8 files</FolderDescription>
      </Folder>
      <Folder variant="glass" color="purple" className="shrink-0">
        <FolderPreview>
          <FolderFiles>
            <FolderFile />
          </FolderFiles>
        </FolderPreview>
        <FolderTitle>Certificates</FolderTitle>
        <FolderDescription>1 file</FolderDescription>
      </Folder>
      <Folder variant="glass" color="teal" className="shrink-0">
        <FolderPreview>
          <FolderFiles>
            <FolderFile>
              <img src="/media/image-compare-before.webp" alt="" />
            </FolderFile>
            <FolderFile>
              <img src="/media/image-compare-after.webp" alt="" />
            </FolderFile>
          </FolderFiles>
        </FolderPreview>
        <FolderTitle>Coast trip</FolderTitle>
        <FolderDescription>36 photos</FolderDescription>
      </Folder>
    </div>
  )
}

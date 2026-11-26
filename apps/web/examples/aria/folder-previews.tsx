import {
  Folder,
  FolderDescription,
  FolderFile,
  FolderFiles,
  FolderPreview,
  FolderTitle,
} from "@/styles/aria-fabricator/ui/folder"

export function FolderPreviews() {
  return (
    <div className="flex max-w-full scroll-fade-x scrollbar-none gap-2 overflow-x-auto p-1">
      <Folder color="orange" className="shrink-0">
        <FolderPreview>
          <FolderFiles>
            <FolderFile>
              <img src="/media/sintel-trailer.jpg" alt="" />
            </FolderFile>
            <FolderFile>
              <img src="/media/image-compare-after.webp" alt="" />
            </FolderFile>
            <FolderFile>
              <img src="/media/image-compare-before.webp" alt="" />
            </FolderFile>
          </FolderFiles>
        </FolderPreview>
        <FolderTitle>Thumbnails</FolderTitle>
        <FolderDescription>Your files&apos; own previews</FolderDescription>
      </Folder>
      <Folder color="indigo" className="shrink-0">
        <FolderPreview>
          <FolderFiles>
            <FolderFile className="p-[4cqw] text-[11cqw] leading-none font-semibold text-(--folder-paper-ink)">
              Aa
            </FolderFile>
            <FolderFile className="bg-warning" />
            <FolderFile className="bg-success" />
          </FolderFiles>
        </FolderPreview>
        <FolderTitle>Anything</FolderTitle>
        <FolderDescription>Type, colours, icons</FolderDescription>
      </Folder>
      <Folder className="shrink-0">
        <FolderPreview>
          <FolderFiles>
            <FolderFile />
            <FolderFile />
            <FolderFile />
          </FolderFiles>
        </FolderPreview>
        <FolderTitle>Blank sheets</FolderTitle>
        <FolderDescription>When there&apos;s nothing to show</FolderDescription>
      </Folder>
    </div>
  )
}

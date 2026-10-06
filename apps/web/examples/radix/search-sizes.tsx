import { Search } from "@/styles/radix-fabricator/ui/search"

export function SearchSizes() {
  return (
    <div className="flex flex-col items-start gap-4">
      <Search size="sm" />
      <Search />
      <Search size="lg" />
    </div>
  )
}

import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/registry/native/ui/pagination"
import { Text } from "@/registry/native/ui/text"

const PAGES = [1, 2, 3, 4, 5]

function PaginationExample() {
  const [page, setPage] = React.useState(2)
  return (
    <ExampleWrapper>
      <Example title="Default" className="items-stretch">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                disabled={page === 1}
                onPress={() => setPage(page - 1)}
              />
            </PaginationItem>
            {PAGES.slice(0, 3).map((value) => (
              <PaginationItem key={value}>
                <PaginationLink
                  isActive={page === value}
                  onPress={() => setPage(value)}
                >
                  {value}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                disabled={page === PAGES.length}
                onPress={() => setPage(page + 1)}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
        <Text className="text-center text-muted-foreground">Page {page}</Text>
      </Example>
      <Example title="Numbers only" className="items-stretch">
        <Pagination>
          <PaginationContent>
            {PAGES.map((value) => (
              <PaginationItem key={value}>
                <PaginationLink isActive={value === 2}>{value}</PaginationLink>
              </PaginationItem>
            ))}
          </PaginationContent>
        </Pagination>
      </Example>
      <Example title="Link sizes" className="items-stretch">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationLink size="icon-sm">1</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink size="icon-lg" isActive>
                2
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink size="default">Three</PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </Example>
      <Example
        title="Custom labels, shown from tablet width"
        className="items-stretch"
      >
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious text="Back" />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext text="Forward" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </Example>
    </ExampleWrapper>
  )
}

export { PaginationExample }

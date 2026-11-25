"use client"

import * as React from "react"

import {
  applyKanbanPageChange,
  mergeKanbanPage,
  type KanbanLoader,
  type KanbanPage,
} from "@/registry/bases/__base__/lib/kanban-model"

type Request<Item> = {
  load: KanbanLoader<Item>
  queryKey: string
  pages: Map<string, KanbanPage<Item>>
  active: Map<string, AbortController>
}

function useKanbanPages<Item>({
  load,
  queryKey,
  columnIds,
  getId,
  pageSize,
}: {
  load?: KanbanLoader<Item>
  queryKey: string
  columnIds: readonly string[]
  getId: (item: Item) => string
  pageSize: number
}) {
  const request = React.useRef<Request<Item> | null>(null)
  const [result, setResult] = React.useState<{
    load: KanbanLoader<Item>
    queryKey: string
    pages: ReadonlyMap<string, KanbanPage<Item>>
  }>()
  const pages =
    result?.load === load && result?.queryKey === queryKey
      ? result?.pages
      : undefined

  const loadMore = React.useCallback(
    async (columnId: string, refresh = false) => {
      const current = request.current
      if (!current || current.active.has(columnId)) return
      const previous = current.pages.get(columnId)
      if (!refresh && previous?.nextCursor === null && !previous.error) return
      const cursor = refresh ? null : (previous?.nextCursor ?? null)
      const controller = new AbortController()
      current.active.set(columnId, controller)
      const publish = (page: KanbanPage<Item>) => {
        if (request.current !== current || controller.signal.aborted) return
        current.pages.set(columnId, page)
        setResult({
          load: current.load,
          queryKey: current.queryKey,
          pages: new Map(current.pages),
        })
      }
      publish({
        ...previous,
        items: previous?.items ?? [],
        nextCursor: cursor,
        isLoading: true,
        error: undefined,
      })
      try {
        const page = await current.load({
          columnId,
          cursor,
          limit: pageSize,
          signal: controller.signal,
        })
        if (page.nextCursor !== null && page.nextCursor === cursor)
          throw new Error("The loader returned the same cursor.")
        publish({
          ...page,
          items:
            cursor === null
              ? page.items
              : mergeKanbanPage(previous?.items ?? [], page.items, getId),
        })
      } catch (error) {
        publish({
          ...previous,
          items: previous?.items ?? [],
          nextCursor: cursor,
          error: error ?? new Error("Could not load cards."),
        })
      } finally {
        if (current.active.get(columnId) === controller)
          current.active.delete(columnId)
      }
    },
    [getId, pageSize]
  )

  React.useEffect(() => {
    if (!load) return
    const current: Request<Item> = {
      load,
      queryKey,
      pages: new Map(),
      active: new Map(),
    }
    request.current = current
    return () => {
      for (const controller of current.active.values()) controller.abort()
      request.current = null
    }
  }, [load, queryKey])

  React.useEffect(() => {
    for (const columnId of columnIds) {
      if (!request.current?.pages.has(columnId)) void loadMore(columnId)
    }
  }, [columnIds, load, loadMore, queryKey])

  function captureCommit() {
    const current = request.current
    return (
      apply: (items: readonly Item[]) => Item[],
      getColumnId: (item: Item) => string | null
    ) => {
      if (!current || request.current !== current) return
      const pages = applyKanbanPageChange(
        current.pages,
        apply,
        getId,
        getColumnId
      )
      const interrupted: string[] = []
      for (const [id, controller] of current.active) {
        const page = pages.get(id)
        if (!page || page === current.pages.get(id)) continue
        controller.abort()
        current.active.delete(id)
        pages.set(id, { ...page, isLoading: false })
        interrupted.push(id)
      }
      current.pages = pages
      setResult({
        load: current.load,
        queryKey: current.queryKey,
        pages: new Map(pages),
      })
      for (const id of interrupted)
        void loadMore(id, pages.get(id)?.nextCursor === null)
    }
  }

  return { pages, loadMore, captureCommit }
}

export { useKanbanPages }

import * as React from "react"
import { cn } from "cn"
import {
  Pressable,
  ScrollView,
  View,
  type LayoutChangeEvent,
} from "react-native"

import {
  FluidHoverHighlight,
  FluidHoverProvider,
  useFluidHover,
  useFluidRow,
  useFluidRowLit,
} from "@/registry/native/lib/fluid-hover"
import {
  getCellColumns,
  getSpanWidth,
  pickTextClasses,
  reportColumnWidth,
  resolveColumnWidths,
} from "@/registry/native/lib/table-model"
import { renderTextChildren, Text, TextStyle } from "@/registry/native/ui/text"

// Views don't line up into columns on their own: each cell reports its width,
// the table keeps the widest of each column, and every cell in that column takes
// it. A wide table scrolls sideways; a narrow one shares out the spare room.

const TableContext = React.createContext<{
  widths: readonly number[]
  report: (column: number, width: number) => void
}>({ widths: [], report: () => {} })

type TableSection = "header" | "body" | "footer"

const TableSectionContext = React.createContext<TableSection>("body")
const TableRowPositionContext = React.createContext<{
  isLast: boolean
  /** The row's key in the table's Fluid Hover. */
  itemKey?: string
  /** The row under this one is lit, so this one's divider gives way. */
  isBeforeLit?: boolean
}>({ isLast: false })
const TableColumnContext = React.createContext(0)
const TableRowLitContext = React.createContext(false)

function useCell(
  colSpan: number,
  onLayout?: (event: LayoutChangeEvent) => void
) {
  const { widths, report } = React.use(TableContext)
  const column = React.use(TableColumnContext)
  return {
    minWidth: getSpanWidth(widths, column, colSpan),
    onLayout(event: LayoutChangeEvent) {
      // A spanning cell doesn't say how wide any one column should be.
      if (colSpan === 1) report(column, event.nativeEvent.layout.width)
      onLayout?.(event)
    },
  }
}

function Table({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const [natural, setNatural] = React.useState<readonly number[]>([])
  const [available, setAvailable] = React.useState(0)
  const widths = React.useMemo(
    () => resolveColumnWidths(natural, available),
    [available, natural]
  )
  const widthsRef = React.useRef(widths)
  widthsRef.current = widths
  const context = React.useMemo(
    () => ({
      widths,
      report(column: number, width: number) {
        setNatural((current) =>
          reportColumnWidth(current, widthsRef.current, column, width)
        )
      },
    }),
    [widths]
  )
  // Tables sit in pages that scroll, so a drag stays the page's.
  const fluid = useFluidHover()

  // A caption sits under the table wherever it's written, as `caption-bottom`
  // puts it on the website, and doesn't scroll with the columns.
  const { captions, body } = React.useMemo(() => {
    const captions: React.ReactNode[] = []
    const body: React.ReactNode[] = []
    for (const part of React.Children.toArray(children)) {
      if (React.isValidElement(part) && part.type === TableCaption)
        captions.push(part)
      else body.push(part)
    }
    return { captions, body }
  }, [children])

  return (
    <TableContext value={context}>
      <View className="w-full">
        <ScrollView
          horizontal
          data-slot="table-container"
          onLayout={(event) => setAvailable(event.nativeEvent.layout.width)}
          contentContainerClassName="min-w-full"
          className="cn-table-container grow-0"
        >
          <TextStyle className="cn-table-text">
            <View
              ref={fluid.attach}
              data-slot="table"
              role="table"
              className={cn("cn-table relative grow", className)}
              {...props}
            >
              <FluidHoverHighlight
                hover={fluid.hover}
                className="cn-table-highlight"
              />
              <FluidHoverProvider fluid={fluid}>{body}</FluidHoverProvider>
            </View>
          </TextStyle>
        </ScrollView>
        <TextStyle className="cn-table-text">{captions}</TextStyle>
      </View>
    </TableContext>
  )
}

function TableHeader({
  className,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <TableSectionContext value="header">
      <View
        data-slot="table-header"
        role="rowgroup"
        className={cn("cn-table-header", className)}
        {...props}
      />
    </TableSectionContext>
  )
}

function TableBody({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const rows = React.Children.toArray(children)
  const id = React.useId()
  return (
    <TableSectionContext value="body">
      <View
        data-slot="table-body"
        role="rowgroup"
        className={cn("cn-table-body", className)}
        {...props}
      >
        {rows.map((row, index) => (
          <TableRowPosition
            key={React.isValidElement(row) ? row.key : index}
            isLast={index === rows.length - 1}
            itemKey={`${id}-${index}`}
            nextKey={`${id}-${index + 1}`}
          >
            {row}
          </TableRowPosition>
        ))}
      </View>
    </TableSectionContext>
  )
}

function TableRowPosition({
  isLast,
  itemKey,
  nextKey,
  children,
}: {
  isLast: boolean
  itemKey: string
  nextKey: string
  children: React.ReactNode
}) {
  const isBeforeLit = useFluidRowLit(nextKey)
  const value = React.useMemo(
    () => ({ isLast, itemKey, isBeforeLit }),
    [isLast, itemKey, isBeforeLit]
  )
  return (
    <TableRowPositionContext value={value}>{children}</TableRowPositionContext>
  )
}

function TableFooter({
  className,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <TableSectionContext value="footer">
      <View
        data-slot="table-footer"
        role="rowgroup"
        className={cn("cn-table-footer", className)}
        {...props}
      />
    </TableSectionContext>
  )
}

function TableRow({
  className,
  children,
  disabled,
  onPress,
  onPressIn,
  onPressOut,
  onHoverIn,
  onHoverOut,
  onLayout,
  "aria-expanded": isExpanded,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "children"> & {
  children?: React.ReactNode
  "aria-expanded"?: boolean
}) {
  const section = React.use(TableSectionContext)
  const { isLast, itemKey, isBeforeLit } = React.use(TableRowPositionContext)
  // Only body rows light: the header and footer switch it off, as on the website.
  const { isLit, rowProps } = useFluidRow({
    itemKey,
    disabled: section !== "body" || disabled,
    onLayout,
    onPressIn,
    onPressOut,
    onHoverIn,
    onHoverOut,
  })
  const cells = React.Children.toArray(children)
  const columns = getCellColumns(
    cells.map((cell) =>
      React.isValidElement<{ colSpan?: number }>(cell)
        ? (cell.props.colSpan ?? 1)
        : 1
    )
  )
  return (
    <Pressable
      data-slot="table-row"
      data-section={section}
      data-last={isLast}
      data-expanded={Boolean(isExpanded)}
      data-lit={isLit}
      data-before-lit={Boolean(isBeforeLit)}
      role="row"
      // A one-line row is a point short of a full touch target.
      hitSlop={1}
      aria-expanded={isExpanded}
      // Only a row that does something reads as one element to a screen reader:
      // otherwise its cells, and anything in them, stay reachable one by one.
      accessible={Boolean(onPress)}
      disabled={disabled}
      onPress={onPress}
      className={cn(
        "cn-table-row flex-row data-[expanded=true]:bg-muted/50",
        className
      )}
      {...rowProps}
      {...props}
    >
      <TableRowLitContext value={isLit}>
        {cells.map((cell, index) => (
          <TableColumnContext
            key={React.isValidElement(cell) ? cell.key : index}
            value={columns[index] ?? index}
          >
            {cell}
          </TableColumnContext>
        ))}
      </TableRowLitContext>
    </Pressable>
  )
}

function TableHead({
  className,
  children,
  colSpan = 1,
  onLayout,
  style,
  ...props
}: React.ComponentProps<typeof View> & { colSpan?: number }) {
  const cell = useCell(colSpan, onLayout)
  return (
    <View
      data-slot="table-head"
      role="columnheader"
      onLayout={cell.onLayout}
      className={cn("cn-table-head justify-center", className)}
      style={[{ minWidth: cell.minWidth }, style]}
      {...props}
    >
      <TextStyle
        className={cn("cn-table-head-text", pickTextClasses(className))}
      >
        {renderTextChildren(children)}
      </TextStyle>
    </View>
  )
}

function TableCell({
  className,
  children,
  colSpan = 1,
  onLayout,
  style,
  ...props
}: React.ComponentProps<typeof View> & { colSpan?: number }) {
  const section = React.use(TableSectionContext)
  const isLit = React.use(TableRowLitContext)
  const cell = useCell(colSpan, onLayout)
  const textClasses = pickTextClasses(className)
  return (
    <View
      data-slot="table-cell"
      role="cell"
      onLayout={cell.onLayout}
      className={cn("cn-table-cell justify-center", className)}
      style={[{ minWidth: cell.minWidth }, style]}
      {...props}
    >
      <TextStyle
        className={
          section === "footer"
            ? cn("cn-table-cell-text-footer", textClasses)
            : isLit
              ? cn("cn-table-cell-text-lit", textClasses)
              : cn("cn-table-cell-text", textClasses)
        }
      >
        {renderTextChildren(children)}
      </TextStyle>
    </View>
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      data-slot="table-caption"
      className={cn("cn-table-caption", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}

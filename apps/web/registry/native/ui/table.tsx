import * as React from "react"
import { cn } from "cn"
import {
  Pressable,
  ScrollView,
  View,
  type LayoutChangeEvent,
} from "react-native"

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
const TableRowPositionContext = React.createContext({ isLast: false })
const TableColumnContext = React.createContext(0)

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

  // A caption sits under the table wherever it's written, as `caption-bottom`
  // puts it on the website, and doesn't scroll with the columns.
  const parts = React.Children.toArray(children)
  const isCaption = (part: React.ReactNode) =>
    React.isValidElement(part) && part.type === TableCaption

  return (
    <TableContext value={context}>
      <View className="w-full">
        <ScrollView
          horizontal
          data-slot="table-container"
          onLayout={(event) => setAvailable(event.nativeEvent.layout.width)}
          contentContainerClassName="min-w-full"
          className="cn-table-container"
        >
          <TextStyle className="cn-table-text">
            <View
              data-slot="table"
              role="table"
              className={cn("cn-table grow", className)}
              {...props}
            >
              {parts.filter((part) => !isCaption(part))}
            </View>
          </TextStyle>
        </ScrollView>
        <TextStyle className="cn-table-text">
          {parts.filter(isCaption)}
        </TextStyle>
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
  return (
    <TableSectionContext value="body">
      <View
        data-slot="table-body"
        role="rowgroup"
        className={cn("cn-table-body", className)}
        {...props}
      >
        {rows.map((row, index) => (
          <TableRowPositionContext
            key={React.isValidElement(row) ? row.key : index}
            value={index === rows.length - 1 ? LAST_ROW : OTHER_ROW}
          >
            {row}
          </TableRowPositionContext>
        ))}
      </View>
    </TableSectionContext>
  )
}

const LAST_ROW = { isLast: true }
const OTHER_ROW = { isLast: false }

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
  onPress,
  "aria-expanded": isExpanded,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "children"> & {
  children?: React.ReactNode
  "aria-expanded"?: boolean
}) {
  const section = React.use(TableSectionContext)
  const { isLast } = React.use(TableRowPositionContext)
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
      role="row"
      aria-expanded={isExpanded}
      // Only a row that does something reads as one element to a screen reader:
      // otherwise its cells, and anything in them, stay reachable one by one.
      accessible={Boolean(onPress)}
      onPress={onPress}
      className={cn(
        "cn-table-row cn-table-highlight flex-row data-[expanded=true]:bg-muted/50",
        className
      )}
      {...props}
    >
      {cells.map((cell, index) => (
        <TableColumnContext
          key={React.isValidElement(cell) ? cell.key : index}
          value={columns[index] ?? index}
        >
          {cell}
        </TableColumnContext>
      ))}
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

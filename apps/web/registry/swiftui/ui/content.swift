import SwiftUI
import AVKit

public struct FabricatorAlert: View {
    @Environment(\.fabricatorTheme) private var theme
    public var title: String
    public var message: String?
    public var variant: FabricatorBadgeVariant
    public var icon: String
    public init(_ title: String, message: String? = nil, variant: FabricatorBadgeVariant = .info, icon: String = "info") { self.title = title; self.message = message; self.variant = variant; self.icon = icon }
    public var body: some View {
        let role = [.destructive, .success, .warning, .info].contains(variant) ? variant.rawValue : "foreground"
        HStack(alignment: .top, spacing: theme.space(10)) {
            FabricatorIcon(icon, size: theme.icon()).foregroundStyle(theme.color(role)).padding(.top, 1)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(theme.font(theme.text(14), weight: .medium)).foregroundStyle(theme.color("foreground"))
                if let message { Text(message).font(theme.bodyFont).foregroundStyle(theme.color("foreground").opacity(0.7)).fixedSize(horizontal: false, vertical: true) }
            }
        }.padding(theme.space(16)).frame(maxWidth: .infinity, alignment: .leading).background(theme.color("hover"), in: RoundedRectangle(cornerRadius: theme.radius("xl"))).accessibilityElement(children: .combine)
    }
}
public struct FabricatorEmpty<Action: View>: View {
    @Environment(\.fabricatorTheme) private var theme
    public var title: String
    public var description: String
    public var icon: String
    private var action: Action
    public init(_ title: String, description: String, icon: String = "inbox", @ViewBuilder action: () -> Action) { self.title = title; self.description = description; self.icon = icon; self.action = action() }
    public var body: some View {
        VStack(spacing: theme.space(16)) {
            VStack(spacing: theme.space(6)) {
                FabricatorIcon(icon, size: theme.space(20), strokeWidth: 1.5)
                    .frame(width: theme.space(40), height: theme.space(40))
                    .fabricatorSurface(radius: "xl", elevation: "surface-4", fill: theme.color("surface-4"))
                    .padding(.bottom, 8).accessibilityHidden(true)
                Text(title).modifier(FabricatorTextMetrics(size: theme.text(14), weight: .semibold))
                Text(description).modifier(FabricatorTextMetrics(size: 13, lineHeight: 1.625))
                    .foregroundStyle(theme.color("muted-foreground"))
            }.frame(maxWidth: 384)
            action
        }.multilineTextAlignment(.center).padding(theme.space(24)).frame(maxWidth: .infinity)
    }
}

public struct FabricatorTable: View {
    @Environment(\.fabricatorTheme) private var theme
    public var columns: [FabricatorTableColumn]
    public var rows: [FabricatorTableRow]
    public var caption: String?
    public var footer: FabricatorTableRow?
    public var columnWidths: [String: CGFloat]
    public var emphasizedColumns: Set<String>
    public init(columns: [FabricatorTableColumn], rows: [FabricatorTableRow], caption: String? = nil, footer: FabricatorTableRow? = nil, columnWidths: [String: CGFloat] = [:], emphasizedColumns: Set<String> = []) {
        precondition(columnWidths.values.allSatisfy { $0.isFinite && $0 >= 0 }, "Table column widths must be finite and nonnegative")
        self.columns = columns; self.rows = rows; self.caption = caption; self.footer = footer; self.columnWidths = columnWidths; self.emphasizedColumns = emphasizedColumns
    }
    private var minimumColumnWidths: [String: CGFloat] {
        let font = theme.resolveFont(theme.text())
        let headerFont = theme.resolveFont(theme.text(), weight: .semibold)
        let footerFont = theme.resolveFont(theme.text(), weight: .medium)
        return Dictionary(uniqueKeysWithValues: columns.map { column in
            var width = FabricatorFontAdapter.measureTextWidth(column.title, font: headerFont)
            for row in rows { width = max(width, FabricatorFontAdapter.measureTextWidth(row.cells[column.id, default: ""], font: emphasizedColumns.contains(column.id) ? footerFont : font)) }
            if let footer { width = max(width, FabricatorFontAdapter.measureTextWidth(footer.cells[column.id, default: ""], font: footerFont)) }
            return (column.id, max(columnWidths[column.id, default: 0], width + 2 * theme.space(12)))
        })
    }
    public var body: some View {
        // Measure only when the data or theme changes, outside hover/viewport state.
        FabricatorTableContent(columns: columns, rows: rows, caption: caption, footer: footer, minimumColumnWidths: minimumColumnWidths, fixedColumns: Set(columnWidths.keys), emphasizedColumns: emphasizedColumns)
    }
}

private struct FabricatorTableContent: View {
    @Environment(\.fabricatorTheme) private var theme
    @State private var viewportWidth: CGFloat = 0
    @State private var hoveredRow: String?
    @Namespace private var hoverNamespace
    var columns: [FabricatorTableColumn]
    var rows: [FabricatorTableRow]
    var caption: String?
    var footer: FabricatorTableRow?
    var minimumColumnWidths: [String: CGFloat]
    var fixedColumns: Set<String>
    var emphasizedColumns: Set<String>

    var body: some View {
        ScrollView(.horizontal) {
            Grid(alignment: .leading, horizontalSpacing: 0, verticalSpacing: 0) {
                GridRow {
                    ForEach(columns) { column in
                        Text(column.title).modifier(FabricatorTextMetrics(size: theme.text(), weight: .semibold))
                            .fixedSize(horizontal: true, vertical: false).padding(.horizontal, theme.space(12))
                            .frame(minWidth: minimumColumnWidths[column.id], maxWidth: fixedColumns.contains(column.id) ? minimumColumnWidths[column.id] : .infinity, minHeight: theme.controlHeight, alignment: column.isNumeric ? .trailing : .leading)
                            .accessibilityAddTraits(.isHeader)
                    }
                }
                divider
                ForEach(Array(rows.enumerated()), id: \.element.id) { index, row in
                    GridRow { cells(row, isFooter: false) }
                        .background {
                            if hoveredRow == row.id { Rectangle().fill(theme.color("hover")).matchedGeometryEffect(id: "row", in: hoverNamespace) }
                        }
                        .onHover { hoveredRow = $0 ? row.id : (hoveredRow == row.id ? nil : hoveredRow) }
                        .accessibilityElement(children: .contain)
                    if index < rows.count - 1 { divider.opacity(hoveredRow == row.id || hoveredRow == rows[index + 1].id ? 0 : 1) }
                    else if footer != nil { divider }
                }
                if let footer { GridRow { cells(footer, isFooter: true) } }
                if let caption {
                    Text(caption).modifier(FabricatorTextMetrics(size: theme.text(12)))
                        .foregroundStyle(theme.color("muted-foreground")).padding(.top, 16)
                        .frame(maxWidth: .infinity).gridCellUnsizedAxes(.horizontal)
                }
            }.frame(minWidth: viewportWidth).animation(theme.animation("glide"), value: hoveredRow)
        }.fixedSize(horizontal: false, vertical: true)
            .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { viewportWidth = $0 }
            .accessibilityElement(children: .contain).accessibilityLabel(caption ?? "Table")
    }

    private var divider: some View {
        Rectangle().fill(theme.color("border").opacity(0.6)).frame(height: 1).gridCellUnsizedAxes(.horizontal)
    }

    @ViewBuilder private func cells(_ row: FabricatorTableRow, isFooter: Bool) -> some View {
        ForEach(columns) { column in
            let value = row.cells[column.id, default: ""]
            Text(value).modifier(FabricatorTextMetrics(size: theme.text(), weight: isFooter || emphasizedColumns.contains(column.id) ? .medium : .regular))
                .fixedSize(horizontal: true, vertical: false)
                .foregroundStyle(theme.color(isFooter || hoveredRow == row.id ? "foreground" : "muted-foreground"))
                .padding(.horizontal, theme.space(12)).padding(.vertical, theme.space(8))
                .frame(minWidth: minimumColumnWidths[column.id], maxWidth: fixedColumns.contains(column.id) ? minimumColumnWidths[column.id] : .infinity, alignment: column.isNumeric ? .trailing : .leading)
                .accessibilityLabel(value.isEmpty ? "" : "\(column.title): \(value)")
                .accessibilityHidden(value.isEmpty)
        }
    }
}
public struct FabricatorImageCompare<Before: View, After: View>: View {
    @Environment(\.fabricatorTheme) private var theme
    @Binding public var position: Double
    private var before: Before
    private var after: After
    public init(position: Binding<Double>, @ViewBuilder before: () -> Before, @ViewBuilder after: () -> After) { _position = position; self.before = before(); self.after = after() }
    public var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                after.frame(width: geometry.size.width, height: geometry.size.height)
                before.frame(width: geometry.size.width, height: geometry.size.height).mask(alignment: .leading) { Rectangle().frame(width: geometry.size.width * min(1, max(0, position))) }
                Rectangle().fill(.white).frame(width: 2).offset(x: geometry.size.width * position - 1)
                FabricatorIcon("chevrons-left-right", size: 18).foregroundStyle(theme.color("foreground")).frame(width: 32, height: 32).background(theme.color("card"), in: Circle()).shadow(color: .black.opacity(0.2), radius: 4).offset(x: geometry.size.width * position - 16)
            }.clipped().contentShape(Rectangle()).gesture(DragGesture(minimumDistance: 0).onChanged { value in position = min(1, max(0, value.location.x / geometry.size.width)) })
                .accessibilityElement(children: .ignore).accessibilityLabel("Image comparison").accessibilityValue("\(Int(position * 100)) percent before").accessibilityAdjustableAction { direction in position = min(1, max(0, position + (direction == .increment ? 0.05 : -0.05))) }
        }.clipShape(RoundedRectangle(cornerRadius: theme.radius()))
    }
}

public struct FabricatorVideoPlayer: View {
    public var player: AVPlayer
    public init(player: AVPlayer) { self.player = player }
    public init(url: URL) { self.player = AVPlayer(url: url) }
    public var body: some View { VideoPlayer(player: player).aspectRatio(16 / 9, contentMode: .fit).clipShape(RoundedRectangle(cornerRadius: 8)).accessibilityLabel("Video player").onDisappear { player.pause() } }
}
public struct FabricatorAudioPlayer: View {
    @Environment(\.fabricatorTheme) private var theme
    @State private var isPlaying = false
    @State private var position: Double = 0
    public var player: AVPlayer
    public var title: String
    public init(_ title: String, player: AVPlayer) { self.title = title; self.player = player }
    public var body: some View {
        VStack(spacing: 10) {
            HStack(spacing: 12) { FabricatorButton(isPlaying ? "Pause" : "Play", icon: isPlaying ? "pause" : "play", size: .icon) { isPlaying.toggle(); if isPlaying { player.play() } else { player.pause() } }; Text(title).font(theme.font(theme.text(), weight: .medium)); Spacer(); Text(formatTime(position)).font(theme.font(11)).monospacedDigit().foregroundStyle(theme.color("muted-foreground")) }
            Slider(value: $position, in: 0...max(1, player.currentItem?.duration.seconds.isFinite == true ? player.currentItem?.duration.seconds ?? 1 : 1)) { editing in if !editing { player.seek(to: CMTime(seconds: position, preferredTimescale: 600)) } }.tint(theme.color("primary")).accessibilityLabel("Playback position")
        }.padding(14).fabricatorSurface().task { while !Task.isCancelled { position = player.currentTime().seconds; if let item = player.currentItem, item.duration.seconds.isFinite, position >= item.duration.seconds { isPlaying = false }; do { try await Task.sleep(for: .milliseconds(250)) } catch { return } } }.onDisappear { player.pause(); isPlaying = false }
    }
    private func formatTime(_ time: Double) -> String { let seconds = max(0, Int(time.isFinite ? time : 0)); return String(format: "%d:%02d", seconds / 60, seconds % 60) }
}

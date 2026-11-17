import SwiftUI

public struct FabricatorMenuItem: Identifiable {
    public var id: String
    public var title: String
    public var icon: String?
    public var isDestructive: Bool
    public var isDisabled: Bool
    public var action: () -> Void
    public init(id: String = UUID().uuidString, title: String, icon: String? = nil, isDestructive: Bool = false, isDisabled: Bool = false, action: @escaping () -> Void) { self.id = id; self.title = title; self.icon = icon; self.isDestructive = isDestructive; self.isDisabled = isDisabled; self.action = action }
}
struct FabricatorMenuContent: View {
    var items: [FabricatorMenuItem]
    var body: some View { ForEach(items) { item in Button(role: item.isDestructive ? .destructive : nil, action: item.action) { HStack { if let icon = item.icon { FabricatorIcon(icon) }; Text(item.title) } }.disabled(item.isDisabled) } }
}
struct FabricatorMenuPanel<Header: View>: View {
    @Environment(\.fabricatorTheme) private var theme
    var items: [FabricatorMenuItem]
    var onSelect: (FabricatorMenuItem) -> Void
    var header: Header
    init(items: [FabricatorMenuItem], onSelect: @escaping (FabricatorMenuItem) -> Void, @ViewBuilder header: () -> Header) { self.items = items; self.onSelect = onSelect; self.header = header() }
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
            if Header.self != EmptyView.self { Rectangle().fill(theme.color("border").opacity(0.6)).frame(height: 1).padding(.vertical, theme.space(4)).padding(.horizontal, theme.space(4)) }
            ForEach(items) { item in FabricatorMenuRow(item: item) { onSelect(item) } }
        }.padding(theme.space(4)).frame(minWidth: 180, alignment: .leading).fabricatorSurface(radius: "xl", elevation: "surface-3", fill: theme.color("surface-3"))
    }
}
extension FabricatorMenuPanel where Header == EmptyView {
    init(items: [FabricatorMenuItem], onSelect: @escaping (FabricatorMenuItem) -> Void) { self.init(items: items, onSelect: onSelect) { EmptyView() } }
}
private struct FabricatorMenuRow: View {
    @Environment(\.fabricatorTheme) private var theme
    var item: FabricatorMenuItem
    var action: () -> Void
    @State private var isHovered = false
    var body: some View {
        Button(action: action) {
            HStack(spacing: theme.space(8)) {
                if let icon = item.icon { FabricatorIcon(icon, size: theme.icon(), strokeWidth: isHovered ? 2 : 1.5) }
                Text(item.title).lineLimit(1)
                Spacer(minLength: 0)
            }.font(theme.font(theme.text())).foregroundStyle(theme.color(item.isDestructive ? "destructive-text" : isHovered ? "foreground" : "muted-foreground")).padding(.horizontal, theme.space(8)).frame(maxWidth: .infinity, minHeight: theme.controlHeight, alignment: .leading).background(isHovered ? theme.color("hover") : .clear, in: RoundedRectangle(cornerRadius: theme.radius())).contentShape(Rectangle())
        }.buttonStyle(.plain).disabled(item.isDisabled).opacity(item.isDisabled ? 0.5 : 1).onHover { isHovered = $0 }
    }
}


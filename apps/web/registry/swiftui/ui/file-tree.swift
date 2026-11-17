import SwiftUI

public struct FabricatorFileTree: View {
    public var nodes: [FabricatorFileNode]
    @Binding public var selection: String?
    @Binding public var expanded: Set<String>
    public var query: String
    public var maximumHeight: CGFloat?
    public var onOpen: ((FabricatorFileNode) -> Void)?

    public init(_ nodes: [FabricatorFileNode], selection: Binding<String?>, expanded: Binding<Set<String>>, query: String = "", maximumHeight: CGFloat? = nil, onOpen: ((FabricatorFileNode) -> Void)? = nil) {
        precondition(maximumHeight.map { $0.isFinite && $0 >= 0 } ?? true, "Tree height must be finite and nonnegative")
        self.nodes = nodes; _selection = selection; _expanded = expanded; self.query = query; self.maximumHeight = maximumHeight; self.onOpen = onOpen
    }

    public var body: some View {
        FabricatorFileTreeContent(rows: FabricatorFileNode.flatten(nodes, expanded: expanded, query: query), selection: $selection, expanded: $expanded, maximumHeight: maximumHeight, onOpen: onOpen)
    }
}

private struct FabricatorFileTreeContent: View {
    @Environment(\.fabricatorTheme) private var theme
    @Environment(\.isEnabled) private var isEnabled
    @FocusState private var focusedID: String?
    @State private var isKeyboardNavigating = false
    @State private var searchText = ""
    @State private var searchTime: TimeInterval = 0
    var rows: [FabricatorFileNode.Entry]
    @Binding var selection: String?
    @Binding var expanded: Set<String>
    var maximumHeight: CGFloat?
    var onOpen: ((FabricatorFileNode) -> Void)?

    private var rowHeight: CGFloat { max(theme.minimumControlHeight(28), theme.minimumHitSize) }

    var body: some View {
        ScrollViewReader { scroll in
            ScrollView(.vertical) {
                FabricatorFileTreeSurface(selection: selection, hasFocus: focusedID != nil) { hover, showsGuides in
                    VStack(spacing: 0) {
                        ForEach(rows) { entry in
                            FabricatorFileTreeRow(entry: entry, isExpanded: expanded.contains(entry.id), isSelected: selection == entry.id, showsFocus: isKeyboardNavigating && focusedID == entry.id, showsGuides: showsGuides, rowHeight: rowHeight, focus: $focusedID, hover: hover, onOpen: onOpen, activate: { activate(entry) }, disclose: { disclose(entry) }, keyPress: { handleKey($0, entry: entry) })
                                .id(entry.id)
                        }
                    }.padding(theme.space(4))
                }
            }
            .frame(height: min(maximumHeight ?? .infinity, CGFloat(rows.count) * rowHeight + 2 * theme.space(4)))
            .onChange(of: focusedID) { if let focusedID { scroll.scrollTo(focusedID) } }
            .onChange(of: rows) { previous, current in focusedID = FabricatorFileNode.restoredFocus(previous, current: current, from: focusedID, selected: selection) }
        }.accessibilityElement(children: .contain).accessibilityLabel("Files")
    }

    private func activate(_ entry: FabricatorFileNode.Entry) {
        guard isEnabled && !entry.isDisabled else { return }
        isKeyboardNavigating = false
        focusedID = entry.id
        selection = entry.id
        if entry.node.isDirectory { toggleFolder(entry.id) }
    }

    private func disclose(_ entry: FabricatorFileNode.Entry) {
        guard isEnabled && !entry.isDisabled else { return }
        isKeyboardNavigating = false
        focusedID = entry.id
        toggleFolder(entry.id)
    }

    private func toggleFolder(_ id: String) {
        if expanded.contains(id) { expanded.remove(id) }
        else { expanded.insert(id) }
    }

    private func open(_ entry: FabricatorFileNode.Entry) {
        guard isEnabled && !entry.isDisabled else { return }
        if entry.node.isDirectory { toggleFolder(entry.id) }
        else { onOpen?(entry.node) }
    }

    private func moveFocus(_ target: FabricatorFileNode.Entry?, selects: Bool) {
        guard let target else { return }
        focusedID = target.id
        if selects { selection = target.id }
    }

    private func handleKey(_ press: KeyPress, entry: FabricatorFileNode.Entry) -> KeyPress.Result {
        guard isEnabled && !entry.isDisabled else { return .ignored }
        isKeyboardNavigating = true
        let selects = press.modifiers.intersection([.command, .control]).isEmpty
        let directions: [KeyEquivalent: FabricatorFileNode.Navigation] = [.upArrow: .previous, .downArrow: .next, .home: .first, .end: .last]
        if let direction = directions[press.key] {
            moveFocus(FabricatorFileNode.navigationTarget(rows, from: entry.id, direction: direction), selects: selects)
            return .handled
        }
        switch press.key {
        case .rightArrow:
            if entry.node.isDirectory && !expanded.contains(entry.id) { toggleFolder(entry.id) }
            else { moveFocus(FabricatorFileNode.navigationTarget(rows, from: entry.id, direction: .child), selects: selects) }
        case .leftArrow:
            if entry.node.isDirectory && expanded.contains(entry.id) { toggleFolder(entry.id) }
            else { moveFocus(FabricatorFileNode.navigationTarget(rows, from: entry.id, direction: .parent), selects: selects) }
        case .return, KeyEquivalent("\u{3}"): open(entry)
        case .space: selection = entry.id
        case .escape: selection = nil
        default:
            guard press.modifiers.intersection([.command, .control, .option]).isEmpty && press.characters.count == 1 else { return .ignored }
            if press.characters == "*" {
                expanded.formUnion(rows.filter { !$0.isDisabled && $0.parentID == entry.parentID && $0.node.isDirectory }.map(\.id))
                return .handled
            }
            let now = ProcessInfo.processInfo.systemUptime
            searchText = (now - searchTime < 0.5 ? searchText : "") + press.characters.lowercased()
            searchTime = now
            moveFocus(FabricatorFileNode.typeaheadTarget(rows, from: entry.id, text: searchText), selects: selects)
        }
        return .handled
    }
}

private struct FabricatorFileTreeRow: View {
    @Environment(\.fabricatorTheme) private var theme
    @Environment(\.isEnabled) private var isEnabled
    var entry: FabricatorFileNode.Entry
    var isExpanded: Bool
    var isSelected: Bool
    var showsFocus: Bool
    var showsGuides: Bool
    var rowHeight: CGFloat
    var focus: FocusState<String?>.Binding
    @Binding var hover: String?
    var onOpen: ((FabricatorFileNode) -> Void)?
    var activate: () -> Void
    var disclose: () -> Void
    var keyPress: (KeyPress) -> KeyPress.Result

    var body: some View {
        ZStack(alignment: .leading) {
            Button(action: activate) { rowContent }
            .buttonStyle(.plain)
            .focusable(true, interactions: .edit).focused(focus, equals: entry.id).focusEffectDisabled()
            .onKeyPress(action: keyPress)
            .simultaneousGesture(TapGesture(count: 2).onEnded { if isEnabled && !entry.isDisabled && !entry.node.isDirectory { onOpen?(entry.node) } })
            .accessibilityLabel(entry.node.name).accessibilityValue(entry.node.isDirectory ? (isExpanded ? "Expanded folder" : "Collapsed folder") : "File")
            .accessibilityHint("Level \(entry.depth + 1)")
            .accessibilityAddTraits(isSelected ? .isSelected : [])
            .accessibilityActions {
                if isEnabled && !entry.isDisabled && !entry.node.isDirectory, let onOpen { Button("Open") { onOpen(entry.node) } }
            }
            if entry.node.isDirectory {
                Button(action: disclose) { Color.clear.frame(width: theme.space(16), height: rowHeight).contentShape(Rectangle()) }
                    .buttonStyle(.plain).focusable(false).accessibilityHidden(true)
                    .padding(.leading, theme.space(4) + CGFloat(entry.depth) * theme.space(16))
            }
        }
        .overlay { if showsFocus { RoundedRectangle(cornerRadius: theme.radius("md")).strokeBorder(theme.color("focus-ring"), lineWidth: 1).allowsHitTesting(false) } }
        .anchorPreference(key: FabricatorFileTreeBounds.self, value: .bounds) { [entry.id: $0] }
        .onHover { isHovered in if isHovered { hover = entry.id } else if hover == entry.id { hover = nil } }
        .disabled(entry.isDisabled).opacity(entry.isDisabled || !isEnabled ? 0.5 : 1)
    }

    private var rowContent: some View {
        HStack(spacing: 0) {
            ForEach(0..<entry.depth, id: \.self) { _ in
                Color.clear.frame(width: theme.space(16)).overlay {
                    Rectangle().fill(theme.color("border")).frame(width: 1).opacity(showsGuides ? 1 : 0)
                        .animation(theme.animation("feedback"), value: showsGuides)
                }
            }
            Color.clear.frame(width: theme.space(16)).overlay {
                if entry.node.isDirectory {
                    FabricatorIcon("chevron-right", size: theme.icon(14)).foregroundStyle(theme.color("muted-foreground"))
                        .rotationEffect(.degrees(isExpanded ? 90 : 0)).animation(theme.animation("move"), value: isExpanded)
                }
            }
            FabricatorFileTypeIcon(entry.node.name, isDirectory: entry.node.isDirectory, isExpanded: isExpanded).padding(.leading, theme.space(4))
            Text(entry.node.name).modifier(FabricatorTextMetrics(size: theme.text()))
                .foregroundStyle(theme.color(entry.node.isMuted ? "muted-foreground" : "foreground"))
                .lineLimit(1).padding(.leading, theme.space(6))
            Spacer(minLength: 0)
        }.padding(.leading, theme.space(4)).padding(.trailing, theme.space(8)).frame(height: rowHeight).contentShape(Rectangle())
    }
}

private struct FabricatorFileTreeBounds: PreferenceKey {
    static let defaultValue: [String: Anchor<CGRect>] = [:]
    static func reduce(value: inout [String: Anchor<CGRect>], nextValue: () -> [String: Anchor<CGRect>]) { value.merge(nextValue(), uniquingKeysWith: { _, next in next }) }
}

private struct FabricatorFileTreeSurface<Content: View>: View {
    @Environment(\.fabricatorTheme) private var theme
    @State private var hoveredID: String?
    @State private var isHovered = false
    var selection: String?
    var hasFocus: Bool
    @ViewBuilder var content: (Binding<String?>, Bool) -> Content
    var body: some View {
        content($hoveredID, isHovered || hasFocus)
            .onHover { isHovered = $0; if !$0 { hoveredID = nil } }
            .backgroundPreferenceValue(FabricatorFileTreeBounds.self) { bounds in
                GeometryReader { geometry in
                    FabricatorFileTreeHighlight(frame: selection.flatMap { bounds[$0].map { geometry[$0] } }, fill: theme.color(hasFocus ? "active" : "hover"), role: "move")
                    FabricatorFileTreeHighlight(frame: hoveredID.flatMap { bounds[$0].map { geometry[$0] } }, fill: theme.color("hover"), role: "glide")
                }.allowsHitTesting(false).accessibilityHidden(true)
            }
    }
}

private struct FabricatorFileTreeHighlight: View {
    @Environment(\.fabricatorTheme) private var theme
    var frame: CGRect?
    var fill: Color
    var role: String
    @State private var lastFrame: CGRect?
    var body: some View {
        let target = frame ?? lastFrame ?? .zero
        RoundedRectangle(cornerRadius: theme.radius("md")).fill(fill)
            .frame(width: target.width, height: target.height)
            .animation(theme.animation("feedback", isExiting: frame == nil)) { view in view.opacity(frame == nil ? 0 : 1) }
            .position(x: target.midX, y: target.midY)
            .animation(lastFrame == nil ? nil : theme.animation(role), value: frame)
            .onAppear { lastFrame = frame }
            .onChange(of: frame) { if let frame { lastFrame = frame } }
    }
}

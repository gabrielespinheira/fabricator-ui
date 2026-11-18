import SwiftUI

public struct FabricatorCard<Content: View>: View {
    @Environment(\.fabricatorTheme) private var theme
    public var title: String?
    public var description: String?
    private var content: Content
    public init(_ title: String? = nil, description: String? = nil, @ViewBuilder content: () -> Content) { self.title = title; self.description = description; self.content = content() }
    public var body: some View {
        VStack(alignment: .leading, spacing: theme.space(16)) {
            if let title { FabricatorCardHeader(title, description: description) }
            content
        }.padding(theme.space(16)).frame(maxWidth: .infinity, alignment: .leading).fabricatorSurface()
    }
}
public struct FabricatorCardHeader: View {
    @Environment(\.fabricatorTheme) private var theme
    public var title: String
    public var description: String?
    public init(_ title: String, description: String? = nil) { self.title = title; self.description = description }
    public var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).modifier(FabricatorTextMetrics(size: theme.text(14), weight: .medium, lineHeight: 1.375))
            if let description { Text(description).modifier(FabricatorTextMetrics(size: theme.text())).foregroundStyle(theme.color("muted-foreground")).fixedSize(horizontal: false, vertical: true) }
        }
    }
}
public struct FabricatorCardFooter<Content: View>: View {
    @Environment(\.fabricatorTheme) private var theme
    private var content: Content
    public init(@ViewBuilder content: () -> Content) { self.content = content() }
    public var body: some View { HStack(spacing: theme.space(8)) { content }.frame(maxWidth: .infinity, alignment: .leading) }
}

public struct FabricatorAccordionItem: Identifiable, Sendable {
    public var id: String
    public var title: String
    public var content: String
    public init(id: String, title: String, content: String) { self.id = id; self.title = title; self.content = content }
}
public struct FabricatorAccordion: View {
    @Environment(\.fabricatorTheme) private var theme
    public var items: [FabricatorAccordionItem]
    @Binding public var expanded: Set<String>
    public var allowsMultiple: Bool
    public init(_ items: [FabricatorAccordionItem], expanded: Binding<Set<String>>, allowsMultiple: Bool = false) { self.items = items; _expanded = expanded; self.allowsMultiple = allowsMultiple }
    public var body: some View {
        VStack(spacing: 0) {
            ForEach(items) { item in
                FabricatorCollapsible(item.title, isExpanded: Binding(get: { expanded.contains(item.id) }, set: { value in
                    if value { if !allowsMultiple { expanded.removeAll() }; expanded.insert(item.id) } else { expanded.remove(item.id) }
                })) { Text(item.content).foregroundStyle(theme.color("muted-foreground")).padding(.bottom, 16) }
                FabricatorSeparator()
            }
        }
    }
}
public struct FabricatorCollapsible<Content: View>: View {
    @Environment(\.fabricatorTheme) private var theme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    public var title: String
    @Binding public var isExpanded: Bool
    private var content: Content
    public init(_ title: String, isExpanded: Binding<Bool>, @ViewBuilder content: () -> Content) { self.title = title; _isExpanded = isExpanded; self.content = content() }
    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button { withAnimation(reduceMotion ? nil : theme.animation("disclosure", isExiting: isExpanded)) { isExpanded.toggle() } } label: {
                HStack { Text(title).font(theme.font(theme.text(), weight: .medium)); Spacer(); FabricatorIcon("chevron-down", size: 14).rotationEffect(.degrees(isExpanded ? 180 : 0)) }.frame(minHeight: theme.controlHeight + 8).contentShape(Rectangle())
            }.buttonStyle(.plain).accessibilityValue(isExpanded ? "Expanded" : "Collapsed")
            if isExpanded { content.transition(.opacity.combined(with: .move(edge: .top))) }
        }.clipped()
    }
}

public struct FabricatorTabs<Content: View>: View {
    @Environment(\.fabricatorTheme) private var theme
    @Namespace private var selectionNamespace
    @State private var hoveredTab: String?
    public var tabs: [String]
    @Binding public var selection: String
    private var content: Content
    public init(_ tabs: [String], selection: Binding<String>, @ViewBuilder content: () -> Content) { self.tabs = tabs; _selection = selection; self.content = content() }
    public var body: some View {
        VStack(alignment: .leading, spacing: theme.space(8)) {
            HStack(spacing: 0) {
                ForEach(tabs, id: \.self) { tab in
                    let isSelected = selection == tab
                    Button { selection = tab } label: {
                        Text(tab).font(theme.font(theme.text(), weight: .regular)).padding(.horizontal, theme.space(12)).frame(minHeight: theme.minimumControlHeight(28))
                            .foregroundStyle(isSelected ? theme.color("foreground") : theme.colorScheme == .dark ? theme.color("muted-foreground") : theme.color("foreground").opacity(0.65))
                            .background {
                                if isSelected {
                                    Color.clear.fabricatorSurface(radius: "lg", elevation: "surface-4", fill: theme.colorScheme == .dark ? theme.color("foreground").opacity(0.14) : theme.color("surface-4")).matchedGeometryEffect(id: "selection", in: selectionNamespace)
                                } else if hoveredTab == tab {
                                    RoundedRectangle(cornerRadius: theme.radius()).fill(theme.color("hover").opacity(0.6)).matchedGeometryEffect(id: "hover", in: selectionNamespace)
                                }
                            }
                            .contentShape(Rectangle())
                    }.buttonStyle(.plain).onHover { hoveredTab = $0 ? tab : nil }.accessibilityAddTraits(isSelected ? .isSelected : [])
                }
            }.padding(theme.space(4)).background(theme.color("foreground").opacity(0.05), in: RoundedRectangle(cornerRadius: theme.radius("xl")))
                .animation(theme.animation("move"), value: selection).animation(theme.animation("glide"), value: hoveredTab)
            content
        }
    }
}

public struct FabricatorTab: Identifiable, Sendable, Equatable {
    public var id: String
    public var title: String
    public var icon: String?
    public var isClosable: Bool
    public init(id: String, title: String, icon: String? = nil, isClosable: Bool = true) { self.id = id; self.title = title; self.icon = icon; self.isClosable = isClosable }
}
public struct FabricatorTabStrip: View {
    @Environment(\.fabricatorTheme) private var theme
    @Binding public var tabs: [FabricatorTab]
    @Binding public var selection: String
    public init(tabs: Binding<[FabricatorTab]>, selection: Binding<String>) { _tabs = tabs; _selection = selection }
    public var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 2) {
                ForEach(tabs) { tab in
                    HStack(spacing: 6) {
                        Button { selection = tab.id } label: { HStack(spacing: 6) { if let icon = tab.icon { FabricatorIcon(icon, size: 14) }; Text(tab.title).lineLimit(1) }.padding(.leading, 12).padding(.trailing, tab.isClosable ? 0 : 12).frame(height: theme.controlHeight).contentShape(Rectangle()) }.buttonStyle(.plain).accessibilityAddTraits(selection == tab.id ? .isSelected : [])
                        if tab.isClosable { FabricatorButton("Close \(tab.title)", icon: "x", variant: .ghost, size: .iconXs) { close(tab) } }
                    }.padding(.trailing, tab.isClosable ? 4 : 0).frame(height: theme.controlHeight)
                        .background(selection == tab.id ? theme.color("card") : .clear, in: RoundedRectangle(cornerRadius: theme.radius()))
                        .draggable(tab.id).dropDestination(for: String.self) { ids, _ in
                            guard let id = ids.first, let from = tabs.firstIndex(where: { $0.id == id }), let to = tabs.firstIndex(where: { $0.id == tab.id }) else { return false }
                            let moved = tabs.remove(at: from); tabs.insert(moved, at: to); return true
                        }
                }
            }.padding(4)
        }.background(theme.color("tabTrack"), in: RoundedRectangle(cornerRadius: theme.radius()))
    }
    private func close(_ tab: FabricatorTab) {
        guard let index = tabs.firstIndex(of: tab) else { return }
        tabs.remove(at: index)
        if selection == tab.id { selection = tabs.isEmpty ? "" : tabs[min(index, tabs.count - 1)].id }
    }
}

public struct FabricatorBreadcrumb: View {
    @Environment(\.fabricatorTheme) private var theme
    public var items: [String]
    public var onNavigate: (Int) -> Void
    public init(_ items: [String], onNavigate: @escaping (Int) -> Void = { _ in }) { self.items = items; self.onNavigate = onNavigate }
    public var body: some View {
        HStack(spacing: theme.space(6)) {
            ForEach(Array(items.enumerated()), id: \.offset) { index, item in
                if index > 0 { FabricatorIcon("chevron-right", size: 14).foregroundStyle(theme.color("muted-foreground").opacity(0.6)) }
                Button { onNavigate(index) } label: { Text(item).lineLimit(1) }.buttonStyle(.plain).foregroundStyle(theme.color(index == items.count - 1 ? "foreground" : "muted-foreground"))
            }
        }.font(theme.font(theme.text())).lineLimit(1).accessibilityElement(children: .contain).accessibilityLabel("Breadcrumb")
    }
}
public struct FabricatorPagination: View {
    @Environment(\.fabricatorTheme) private var theme
    public var pageCount: Int
    @Binding public var page: Int
    public init(page: Binding<Int>, pageCount: Int) { _page = page; self.pageCount = max(1, pageCount) }
    public var body: some View {
        HStack(spacing: theme.space(2)) {
            FabricatorButton("Previous page", icon: "chevron-left", variant: .ghost, size: .iconSm) { page = max(0, page - 1) }.disabled(page == 0)
            ForEach(FabricatorPaginationEngine.items(page: page, pageCount: pageCount)) { item in
                switch item {
                case .page(let index): FabricatorButton(String(index + 1), variant: page == index ? .secondary : .ghost, size: .sm) { page = index }.fixedSize(horizontal: true, vertical: false).accessibilityLabel("Page \(index + 1)").accessibilityAddTraits(index == page ? .isSelected : [])
                case .gap: Text("…").font(theme.bodyFont).foregroundStyle(theme.color("muted-foreground")).frame(width: theme.space(24)).accessibilityHidden(true)
                }
            }
            FabricatorButton("Next page", icon: "chevron-right", variant: .ghost, size: .iconSm) { page = min(pageCount - 1, page + 1) }.disabled(page >= pageCount - 1)
        }
    }
}
public struct FabricatorItem: View {
    @Environment(\.fabricatorTheme) private var theme
    public var title: String
    public var description: String?
    public var icon: String?
    public var accessory: String?
    public init(_ title: String, description: String? = nil, icon: String? = nil, accessory: String? = nil) { self.title = title; self.description = description; self.icon = icon; self.accessory = accessory }
    public var body: some View {
        HStack(spacing: 12) {
            if let icon { FabricatorIcon(icon, size: 18).frame(width: 36, height: 36).background(theme.color("hover"), in: RoundedRectangle(cornerRadius: theme.radius())) }
            VStack(alignment: .leading, spacing: 3) { Text(title).font(theme.font(theme.text(), weight: .medium)); if let description { Text(description).font(theme.font(theme.text(12))).foregroundStyle(theme.color("muted-foreground")) } }
            Spacer(minLength: 0)
            if let accessory { FabricatorIcon(accessory).foregroundStyle(theme.color("muted-foreground")) }
        }.padding(12).contentShape(Rectangle())
    }
}
public struct FabricatorNavigationMenu: View {
    public var groups: [String: [String]]
    public var onSelect: (String) -> Void
    public init(groups: [String: [String]], onSelect: @escaping (String) -> Void) { self.groups = groups; self.onSelect = onSelect }
    public var body: some View {
        HStack(spacing: 4) { ForEach(groups.keys.sorted(), id: \.self) { key in Menu { ForEach(groups[key, default: []], id: \.self) { value in Button(value) { onSelect(value) } } } label: { HStack(spacing: 4) { Text(key); FabricatorIcon("chevron-down", size: 12) } }.menuStyle(.borderlessButton) } }
    }
}
public struct FabricatorCarousel<Content: View>: View {
    public var count: Int
    @Binding public var selection: Int
    private var content: (Int) -> Content
    public init(count: Int, selection: Binding<Int>, @ViewBuilder content: @escaping (Int) -> Content) { self.count = count; _selection = selection; self.content = content }
    public var body: some View {
        VStack(spacing: 12) {
            if count > 0 { content(min(max(0, selection), count - 1)).gesture(DragGesture().onEnded { value in if abs(value.translation.width) > 40 { selection = min(count - 1, max(0, selection + (value.translation.width < 0 ? 1 : -1))) } }) }
            HStack {
                FabricatorButton("Previous slide", icon: "arrow-left", variant: .outline, size: .iconSm) { selection = max(0, selection - 1) }.disabled(selection == 0)
                Spacer(); Text("\(min(selection + 1, count)) / \(count)").font(.caption).monospacedDigit(); Spacer()
                FabricatorButton("Next slide", icon: "arrow-right", variant: .outline, size: .iconSm) { selection = min(count - 1, selection + 1) }.disabled(selection >= count - 1)
            }
        }.accessibilityElement(children: .contain).accessibilityLabel("Carousel")
    }
}
public struct FabricatorPreviewRail<Content: View>: View {
    public var count: Int
    @Binding public var selection: Int
    private var preview: (Int) -> Content
    public init(count: Int, selection: Binding<Int>, @ViewBuilder preview: @escaping (Int) -> Content) { self.count = count; _selection = selection; self.preview = preview }
    public var body: some View { ScrollView(.horizontal) { HStack(spacing: 8) { ForEach(0..<max(0, count), id: \.self) { index in Button { selection = index } label: { preview(index).opacity(selection == index ? 1 : 0.5) }.buttonStyle(.plain).accessibilityLabel("Preview \(index + 1)").accessibilityAddTraits(selection == index ? .isSelected : []) } } } }
}
public struct FabricatorResizable<Leading: View, Trailing: View>: View {
    @Environment(\.fabricatorTheme) private var theme
    @Binding public var ratio: Double
    private var leading: Leading
    private var trailing: Trailing
    public init(ratio: Binding<Double>, @ViewBuilder leading: () -> Leading, @ViewBuilder trailing: () -> Trailing) { _ratio = ratio; self.leading = leading(); self.trailing = trailing() }
    public var body: some View {
        GeometryReader { geometry in
            HStack(spacing: 0) {
                leading.frame(width: (geometry.size.width - 12) * min(0.85, max(0.15, ratio)))
                Rectangle().fill(theme.color("border")).frame(width: 1).frame(width: 12).contentShape(Rectangle()).overlay { RoundedRectangle(cornerRadius: 2).fill(theme.color("card")).frame(width: 6, height: 24) }
                    .gesture(DragGesture(coordinateSpace: .named("fabricator-resize")).onChanged { value in ratio = min(0.85, max(0.15, value.location.x / geometry.size.width)) })
                    .accessibilityLabel("Resize panels").accessibilityValue("\(Int(ratio * 100)) percent").accessibilityAdjustableAction { direction in ratio = min(0.85, max(0.15, ratio + (direction == .increment ? 0.05 : -0.05))) }
                trailing.frame(maxWidth: .infinity)
            }.coordinateSpace(name: "fabricator-resize")
        }
    }
}
public struct FabricatorDirection<Content: View>: View {
    public var direction: LayoutDirection
    private var content: Content
    public init(_ direction: LayoutDirection, @ViewBuilder content: () -> Content) { self.direction = direction; self.content = content() }
    public var body: some View { content.environment(\.layoutDirection, direction) }
}

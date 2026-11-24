import SwiftUI

public struct FabricatorNavigationItem: Identifiable, Sendable {
    public var id: String
    public var title: String
    public var icon: String
    public var badge: String?
    public var children: [FabricatorNavigationItem]
    public init(id: String, title: String, icon: String = "square", badge: String? = nil, children: [FabricatorNavigationItem] = []) { self.id = id; self.title = title; self.icon = icon; self.badge = badge; self.children = children }
}
public struct FabricatorNavigationGroup: Identifiable, Sendable {
    public var title: String
    public var items: [FabricatorNavigationItem]
    public var id: String { title }
    public init(_ title: String, items: [FabricatorNavigationItem]) { self.title = title; self.items = items }
}
public struct FabricatorSidebar: View {
    @Environment(\.fabricatorTheme) private var theme
    public var groups: [FabricatorNavigationGroup]
    @Binding public var selection: String
    public init(_ groups: [FabricatorNavigationGroup], selection: Binding<String>) { self.groups = groups; _selection = selection }
    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                ForEach(groups) { group in
                    VStack(alignment: .leading, spacing: 2) {
                        if !group.title.isEmpty {
                            Text(group.title).font(theme.font(theme.text(12), weight: .medium)).foregroundStyle(theme.color("mutedOnFrame")).padding(.horizontal, theme.space(8)).frame(maxWidth: .infinity, minHeight: theme.space(24), alignment: .leading).padding(.bottom, theme.space(4))
                        }
                        ForEach(group.items) { item in
                            let childSelected = item.children.contains { $0.id == selection }
                            FabricatorSidebarRow(item: item, isSelected: selection == item.id || childSelected, isChild: false) { selection = item.id }
                            ForEach(item.children) { child in
                                FabricatorSidebarRow(item: child, isSelected: selection == child.id, isChild: true) { selection = child.id }
                            }
                        }
                    }.padding(theme.space(8))
                }
            }
        }.accessibilityLabel("Sidebar navigation")
    }
}
public struct FabricatorAppNav: View {
    public var items: [FabricatorNavigationItem]
    @Binding public var selection: String
    public init(_ items: [FabricatorNavigationItem], selection: Binding<String>) { self.items = items; _selection = selection }
    public var body: some View { FabricatorSidebar([FabricatorNavigationGroup("", items: items)], selection: $selection) }
}

private struct FabricatorSidebarRow: View {
    @Environment(\.fabricatorTheme) private var theme
    var item: FabricatorNavigationItem
    var isSelected: Bool
    var isChild: Bool
    var action: () -> Void
    @State private var isHovered = false
    var body: some View {
        let isLit = isSelected || isHovered
        let fill = isChild ? (isSelected ? theme.color("hover").opacity(0.5) : isHovered ? theme.color("hover") : .clear) : (isSelected ? theme.color("active") : isHovered ? theme.color("hover") : .clear)
        let label = isChild ? (isLit ? "foreground" : "muted-foreground") : (isLit ? "foreground" : "foregroundSoft")
        Button(action: action) {
            HStack(spacing: theme.space(8)) {
                if !item.icon.isEmpty { FabricatorIcon(item.icon, size: theme.icon(), strokeWidth: isLit ? 2 : 1.5).foregroundStyle(theme.color(isLit ? "foreground" : isChild ? "muted-foreground" : "mutedOnFrame")) }
                Text(item.title).font(theme.font(theme.text())).foregroundStyle(theme.color(label))
                Spacer(minLength: 0)
                if let badge = item.badge { Text(badge).font(theme.font(theme.text(12))).monospacedDigit().foregroundStyle(theme.color(isLit ? "foreground" : "mutedOnFrame")) }
            }.padding(.leading, isChild ? theme.space(8) + theme.icon() + theme.space(8) : theme.space(8)).padding(.trailing, theme.space(8)).frame(minHeight: theme.minimumControlHeight(30)).contentShape(Rectangle())
                .fabricatorSurface(radius: "lg", elevation: isSelected && !isChild ? "selection" : nil, fill: fill)
        }.buttonStyle(.plain).onHover { isHovered = $0 }.accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}
public struct FabricatorWorkspaceSwitcher: View {
    @Environment(\.fabricatorTheme) private var theme
    @State private var isPresented = false
    public var workspaces: [String]
    @Binding public var selection: String
    public var detail: String
    public var onCreate: () -> Void
    public init(_ workspaces: [String], selection: Binding<String>, detail: String = "Workspace", onCreate: @escaping () -> Void = {}) { self.workspaces = workspaces; _selection = selection; self.detail = detail; self.onCreate = onCreate }
    public var body: some View {
        Button { isPresented.toggle() } label: {
            HStack(spacing: theme.space(8)) {
                Text(String(selection.prefix(1)).uppercased()).font(Font(FabricatorFontAdapter.makeFont(size: theme.text(14), weight: FabricatorContract.shared.typography.weights.semibold))).foregroundStyle(theme.color("primary-foreground")).frame(width: theme.space(32), height: theme.space(32)).background(theme.color("primary"), in: RoundedRectangle(cornerRadius: theme.radius()))
                VStack(alignment: .leading, spacing: 1) { Text(selection).font(theme.font(theme.text(), weight: .semibold)).lineLimit(1); Text(detail).font(theme.font(theme.text(12))).foregroundStyle(theme.color("mutedOnFrame")).lineLimit(1) }
                Spacer(minLength: 2); FabricatorIcon("chevrons-up-down", size: theme.icon()).foregroundStyle(theme.color("mutedOnFrame"))
            }.foregroundStyle(theme.color("foreground")).padding(theme.space(8)).contentShape(Rectangle())
        }.buttonStyle(.plain).accessibilityLabel("Switch workspace").fabricatorPopup(isPresented: $isPresented) {
            FabricatorMenuPanel(items: workspaces.map { name in FabricatorMenuItem(id: name, title: name, action: { selection = name }) } + [FabricatorMenuItem(id: "create", title: "Create workspace…", icon: "plus", action: onCreate)]) { item in isPresented = false; item.action() }
        }
    }
}
public struct FabricatorUserMenu: View {
    @Environment(\.fabricatorTheme) private var theme
    @State private var isPresented = false
    public var name: String
    public var email: String
    public var onSettings: () -> Void
    public var onSignOut: () -> Void
    public init(_ name: String, email: String, onSettings: @escaping () -> Void = {}, onSignOut: @escaping () -> Void = {}) { self.name = name; self.email = email; self.onSettings = onSettings; self.onSignOut = onSignOut }
    public var body: some View {
        Button { isPresented.toggle() } label: {
            HStack(spacing: theme.space(8)) { FabricatorAvatar(name, size: theme.space(32)); VStack(alignment: .leading, spacing: 1) { Text(name).font(theme.font(theme.text(), weight: .semibold)).lineLimit(1); Text(email).font(theme.font(theme.text(12))).foregroundStyle(theme.color("mutedOnFrame")).lineLimit(1).truncationMode(.tail) }; Spacer(minLength: 0); FabricatorIcon("chevrons-up-down", size: theme.icon()).foregroundStyle(theme.color("mutedOnFrame")) }.foregroundStyle(theme.color("foreground")).padding(theme.space(8)).contentShape(Rectangle())
        }.buttonStyle(.plain).accessibilityLabel("User menu for \(name)").fabricatorPopup(isPresented: $isPresented) {
            FabricatorMenuPanel(items: [FabricatorMenuItem(id: "settings", title: "Account settings", icon: "settings", action: onSettings), FabricatorMenuItem(id: "sign-out", title: "Sign out", icon: "log-out", isDestructive: true, action: onSignOut)]) { item in isPresented = false; item.action() } header: {
                VStack(alignment: .leading, spacing: 2) { Text(name).font(theme.font(theme.text(), weight: .semibold)).lineLimit(1); Text(email).font(theme.font(theme.text(12))).foregroundStyle(theme.color("muted-foreground")).lineLimit(1) }.padding(.horizontal, theme.space(8)).padding(.vertical, theme.space(6)).frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }
}

public struct FabricatorAppShell<Content: View, Toolbar: View, Panel: View>: View {
    @Environment(\.fabricatorTheme) private var theme
    @State private var isNavigationPresented = false
    @State private var isDetailsPresented = false
    @State private var isDetailsDocked = true
    @State private var workspace: String
    public var title: String
    public var subtitle: String?
    public var groups: [FabricatorNavigationGroup]
    @Binding public var selection: String
    public var sidebarWidth: CGFloat
    public var showsSidebar: Bool
    public var panelWidth: CGFloat
    public var status: String?
    public var statusTrailing: String?
    public var workspaces: [String]
    public var workspaceDetail: String
    public var breadcrumb: [String]
    private var toolbar: Toolbar
    private var content: Content
    private var panel: Panel
    public init(_ title: String, subtitle: String? = nil, groups: [FabricatorNavigationGroup], selection: Binding<String>, sidebarWidth: CGFloat = 256, showsSidebar: Bool = true, panelWidth: CGFloat = 280, status: String? = nil, statusTrailing: String? = nil, workspaces: [String] = ["Fabricator UI", "Personal workspace"], workspaceDetail: String = "Workspace", breadcrumb: [String] = [], @ViewBuilder toolbar: () -> Toolbar, @ViewBuilder content: () -> Content, @ViewBuilder panel: () -> Panel) {
        self.title = title; self.subtitle = subtitle; self.groups = groups; _selection = selection; self.sidebarWidth = sidebarWidth; self.showsSidebar = showsSidebar; self.panelWidth = panelWidth; self.status = status; self.statusTrailing = statusTrailing; self.workspaces = workspaces; self.workspaceDetail = workspaceDetail; self.breadcrumb = breadcrumb; self.toolbar = toolbar(); self.content = content(); self.panel = panel(); _workspace = State(initialValue: workspaces.first ?? "Fabricator UI")
    }
    public var body: some View {
        GeometryReader { geometry in
            let isCompact = geometry.size.width < 768
            let hasPanel = Panel.self != EmptyView.self
            let canDockPanel = !isCompact && geometry.size.width - (showsSidebar ? sidebarWidth : 0) - panelWidth >= 520
            HStack(alignment: .top, spacing: 0) {
                if showsSidebar, !isCompact { sidebar.frame(width: sidebarWidth).frame(maxHeight: .infinity, alignment: .top) }
                VStack(spacing: 0) {
                    main(isCompact: isCompact, hasPanel: hasPanel, canDockPanel: canDockPanel)
                    if !isCompact, let status {
                        HStack(spacing: theme.space(8)) {
                            Text(status).lineLimit(1)
                            Spacer(minLength: 0)
                            if let statusTrailing { Text(statusTrailing).lineLimit(1) }
                        }.font(theme.font(theme.text(12))).foregroundStyle(theme.color("mutedOnFrame")).padding(.horizontal, theme.space(12)).frame(height: theme.space(36))
                    }
                }.frame(maxHeight: .infinity, alignment: .top)
            }
            .background(theme.color("app-shell-frame"))
            .background {
                if showsSidebar && isCompact {
                    FabricatorOverlayHost(isPresented: $isNavigationPresented, placement: .leading, showsScrim: true, scrimDismisses: true) {
                        sidebar.frame(maxWidth: .infinity, maxHeight: .infinity)
                    }
                }
                if hasPanel && !canDockPanel {
                    FabricatorDrawer("Details", isPresented: $isDetailsPresented) {
                        panel.frame(maxHeight: geometry.size.height * 0.6, alignment: .topLeading)
                    }
                }
            }
            .onChange(of: selection) { _, _ in isNavigationPresented = false }
            .onChange(of: canDockPanel) { _, canDock in
                if canDock { isDetailsPresented = false }
            }
        }
    }
    private func main(isCompact: Bool, hasPanel: Bool, canDockPanel: Bool) -> some View {
        let column = VStack(spacing: 0) {
            HStack(spacing: theme.space(8)) {
                if showsSidebar && isCompact { FabricatorButton("Open navigation", icon: "panel-left", variant: .ghost, size: .icon) { isNavigationPresented = true } }
                if breadcrumb.isEmpty || isCompact {
                    Text(title).font(theme.font(theme.text(), weight: .medium)).lineLimit(1)
                    if breadcrumb.isEmpty, let subtitle { Text(subtitle).font(theme.font(theme.text(12))).foregroundStyle(theme.color("muted-foreground")).lineLimit(1) }
                } else { FabricatorBreadcrumb(breadcrumb).layoutPriority(1).fixedSize(horizontal: true, vertical: false) }
                Spacer(minLength: 8); toolbar.layoutPriority(isCompact ? 1 : 0).fixedSize()
                if hasPanel {
                    FabricatorButton(canDockPanel && isDetailsDocked ? "Close details" : "Open details", icon: "panel-right", variant: .ghost, size: .iconSm) {
                        if canDockPanel { isDetailsDocked.toggle() }
                        else { isDetailsPresented = true }
                    }
                }
            }.padding(.horizontal, theme.space(12)).frame(minHeight: theme.minimumControlHeight(48))
            content.frame(maxWidth: .infinity, maxHeight: .infinity)
        }.frame(maxWidth: .infinity, maxHeight: .infinity)
        let card = column.clipShape(RoundedRectangle(cornerRadius: theme.radius("xl"), style: .continuous)).fabricatorSurface(radius: "xl", elevation: "card", fill: theme.color("app-shell-main"))
        let inset = theme.space(8)
        return Group {
            if isCompact { column.background(theme.color("app-shell-main")) }
            else if !(hasPanel && canDockPanel && isDetailsDocked) {
                card.padding(.top, inset).padding(.leading, showsSidebar ? 0 : inset).padding(.trailing, inset).padding(.bottom, status == nil ? inset : 0)
            } else {
                HStack(alignment: .top, spacing: inset) {
                    card
                    panel.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading).frame(width: panelWidth).clipShape(RoundedRectangle(cornerRadius: theme.radius("xl"), style: .continuous)).fabricatorSurface(radius: "xl", elevation: "card", fill: theme.color("app-shell-main"))
                }.padding(.top, inset).padding(.leading, showsSidebar ? 0 : inset).padding(.trailing, inset).padding(.bottom, status == nil ? inset : 0)
            }
        }
    }
    private var sidebar: some View {
        VStack(spacing: 0) {
            FabricatorWorkspaceSwitcher(workspaces, selection: $workspace, detail: workspaceDetail)
            FabricatorSidebar(groups, selection: $selection).frame(maxHeight: .infinity)
            FabricatorUserMenu("Alex Morgan", email: "alex@fabricator.design")
        }.background(theme.color("app-shell-frame"))
    }
}
extension FabricatorAppShell where Panel == EmptyView {
    public init(_ title: String, subtitle: String? = nil, groups: [FabricatorNavigationGroup], selection: Binding<String>, sidebarWidth: CGFloat = 256, showsSidebar: Bool = true, status: String? = nil, statusTrailing: String? = nil, workspaces: [String] = ["Fabricator UI", "Personal workspace"], workspaceDetail: String = "Workspace", breadcrumb: [String] = [], @ViewBuilder toolbar: () -> Toolbar, @ViewBuilder content: () -> Content) {
        self.init(title, subtitle: subtitle, groups: groups, selection: selection, sidebarWidth: sidebarWidth, showsSidebar: showsSidebar, status: status, statusTrailing: statusTrailing, workspaces: workspaces, workspaceDetail: workspaceDetail, breadcrumb: breadcrumb, toolbar: toolbar, content: content, panel: { EmptyView() })
    }
}

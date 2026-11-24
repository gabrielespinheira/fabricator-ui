import SwiftUI
import Observation

public struct FabricatorDialog<Content: View>: View {
    @Environment(\.fabricatorTheme) private var theme
    @Binding public var isPresented: Bool
    public var title: String
    public var description: String?
    private var content: Content
    public init(_ title: String, description: String? = nil, isPresented: Binding<Bool>, @ViewBuilder content: () -> Content) { self.title = title; self.description = description; _isPresented = isPresented; self.content = content() }
    public var body: some View {
        FabricatorOverlayHost(isPresented: $isPresented, placement: .center, showsScrim: true, scrimDismisses: true) {
            FabricatorDialogContent(title, description: description, onDismiss: { isPresented = false }) { content }.frame(maxWidth: 400).fabricatorSurface(radius: "xl", elevation: "surface-5", fill: theme.color("surface-5"))
        }
    }
}
public struct FabricatorDialogContent<Content: View>: View {
    @Environment(\.fabricatorTheme) private var theme
    public var title: String
    public var description: String?
    public var onDismiss: () -> Void
    public var inset: CGFloat?
    public var expands: Bool
    private var content: Content
    public init(_ title: String, description: String? = nil, onDismiss: @escaping () -> Void, inset: CGFloat? = nil, expands: Bool = false, @ViewBuilder content: () -> Content) { self.title = title; self.description = description; self.onDismiss = onDismiss; self.inset = inset; self.expands = expands; self.content = content() }
    public var body: some View {
        VStack(alignment: .leading, spacing: theme.space(16)) {
            VStack(alignment: .leading, spacing: theme.space(6)) {
                Text(title).modifier(FabricatorTextMetrics(size: theme.text(16), weight: .bold, lineHeight: 1.25)).foregroundStyle(theme.color("foreground")).padding(.trailing, theme.space(20)).fixedSize(horizontal: false, vertical: true).accessibilityAddTraits(.isHeader)
                if let description { Text(description).modifier(FabricatorTextMetrics(size: theme.text())).foregroundStyle(theme.color("muted-foreground")).fixedSize(horizontal: false, vertical: true) }
            }.frame(maxWidth: .infinity, alignment: .leading)
            content
        }.padding(inset ?? theme.space(24)).frame(maxWidth: .infinity, maxHeight: expands ? .infinity : nil, alignment: .topLeading)
            .overlay(alignment: .topTrailing) {
                FabricatorButton("Close dialog", icon: "x", variant: .ghost, size: .iconSm, action: onDismiss).keyboardShortcut(.cancelAction).padding(theme.space(12))
            }
    }
}
public struct FabricatorSheet<Content: View>: View {
    @Environment(\.fabricatorTheme) private var theme
    @Binding public var isPresented: Bool
    public var title: String
    public var description: String?
    private var content: Content
    public init(_ title: String, description: String? = nil, isPresented: Binding<Bool>, @ViewBuilder content: () -> Content) { self.title = title; self.description = description; _isPresented = isPresented; self.content = content() }
    public var body: some View {
        FabricatorOverlayHost(isPresented: $isPresented, placement: .trailing, showsScrim: true, scrimDismisses: true) {
            FabricatorDialogContent(title, description: description, onDismiss: { isPresented = false }, inset: theme.space(16), expands: true) { content }.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top).fabricatorSurface(cornerRadius: 0, elevation: "surface-3", fill: theme.color("surface-3"))
        }
    }
}
public struct FabricatorDrawer<Content: View>: View {
    @Environment(\.fabricatorTheme) private var theme
    @Binding public var isPresented: Bool
    public var title: String
    private var content: Content
    public init(_ title: String, isPresented: Binding<Bool>, @ViewBuilder content: () -> Content) { self.title = title; _isPresented = isPresented; self.content = content() }
    public var body: some View {
        FabricatorOverlayHost(isPresented: $isPresented, placement: .bottom, showsScrim: true, scrimDismisses: true) {
            FabricatorDialogContent(title, onDismiss: { isPresented = false }) { content }.padding(.bottom, 12).frame(maxWidth: .infinity, alignment: .top).fabricatorSurface(radius: "xl", elevation: "surface-3", fill: theme.color("surface-3"))
        }
    }
}
public struct FabricatorAlertDialog: View {
    @Environment(\.fabricatorTheme) private var theme
    @Binding public var isPresented: Bool
    public var title: String
    public var message: String
    public var confirmLabel: String
    public var isDestructive: Bool
    public var onConfirm: () -> Void
    public init(_ title: String, message: String, isPresented: Binding<Bool>, confirmLabel: String = "Continue", isDestructive: Bool = false, onConfirm: @escaping () -> Void) { self.title = title; self.message = message; _isPresented = isPresented; self.confirmLabel = confirmLabel; self.isDestructive = isDestructive; self.onConfirm = onConfirm }
    public var body: some View {
        FabricatorOverlayHost(isPresented: $isPresented, placement: .center, showsScrim: true, scrimDismisses: false) {
            VStack(alignment: .leading, spacing: theme.space(16)) {
                VStack(alignment: .leading, spacing: theme.space(6)) {
                    Text(title).font(theme.font(theme.text(16), weight: .bold)).foregroundStyle(theme.color("foreground")).accessibilityAddTraits(.isHeader)
                    Text(message).font(theme.bodyFont).foregroundStyle(theme.color("muted-foreground")).fixedSize(horizontal: false, vertical: true)
                }
                HStack(spacing: theme.space(8)) { Spacer(minLength: 0); FabricatorButton("Cancel", variant: .outline) { isPresented = false }; FabricatorButton(confirmLabel, variant: isDestructive ? .destructive : .default) { isPresented = false; onConfirm() } }.padding(.top, theme.space(8))
            }.padding(theme.space(24)).frame(maxWidth: 400).fabricatorSurface(radius: "xl", elevation: "surface-5", fill: theme.color("surface-5"))
        }
    }
}
public struct FabricatorPopover<Label: View, Content: View>: View {
    @Environment(\.fabricatorTheme) private var theme
    @Binding public var isPresented: Bool
    private var label: Label
    private var content: Content
    public init(isPresented: Binding<Bool>, @ViewBuilder label: () -> Label, @ViewBuilder content: () -> Content) { _isPresented = isPresented; self.label = label(); self.content = content() }
    public var body: some View { label.fabricatorPopup(isPresented: $isPresented) { content.padding(theme.space(12)).frame(minWidth: 220, alignment: .leading).fabricatorSurface(radius: "xl", elevation: "surface-3", fill: theme.color("surface-3")) } }
}
public struct FabricatorHoverCard<Label: View, Content: View>: View {
    @Environment(\.fabricatorTheme) private var theme
    @State private var isPresented = false
    private var label: Label
    private var content: Content
    public init(@ViewBuilder label: () -> Label, @ViewBuilder content: () -> Content) { self.label = label(); self.content = content() }
    public var body: some View { label.onHover { isPresented = $0 }.onTapGesture { isPresented.toggle() }.fabricatorPopup(isPresented: $isPresented) { content.padding(theme.space(12)).frame(minWidth: 220, alignment: .leading).fabricatorSurface(radius: "xl", elevation: "surface-3", fill: theme.color("surface-3")) } }
}
public struct FabricatorTooltip<Content: View>: View {
    @Environment(\.fabricatorTheme) private var theme
    @State private var isPresented = false
    public var text: String
    private var content: Content
    public init(_ text: String, @ViewBuilder content: () -> Content) { self.text = text; self.content = content() }
    public var body: some View {
        content.help(text).accessibilityHint(text).onLongPressGesture { isPresented = true }.fabricatorPopup(isPresented: $isPresented) {
            Text(text).font(theme.font(theme.text(12), weight: .medium)).foregroundStyle(theme.color("background")).padding(.horizontal, theme.space(8)).padding(.vertical, 4).background(theme.color("foreground"), in: RoundedRectangle(cornerRadius: theme.radius()))
        }
    }
}

public struct FabricatorDropdownMenu: View {
    @State private var isPresented = false
    public var title: String
    public var items: [FabricatorMenuItem]
    public init(_ title: String, items: [FabricatorMenuItem]) { self.title = title; self.items = items }
    public var body: some View {
        Button { isPresented.toggle() } label: { HStack(spacing: 6) { Text(title); FabricatorIcon("chevron-down", size: 12) } }.buttonStyle(FabricatorButtonStyle(variant: .outline)).fabricatorPopup(isPresented: $isPresented) { FabricatorMenuPanel(items: items) { item in isPresented = false; item.action() } }
    }
}
public struct FabricatorContextMenu<Content: View>: View {
    public var items: [FabricatorMenuItem]
    private var content: Content
    public init(items: [FabricatorMenuItem], @ViewBuilder content: () -> Content) { self.items = items; self.content = content() }
    public var body: some View { content.contextMenu { FabricatorMenuContent(items: items) } }
}
public struct FabricatorMenubar: View {
    public var menus: [(String, [FabricatorMenuItem])]
    public init(_ menus: [(String, [FabricatorMenuItem])]) { self.menus = menus }
    public var body: some View { HStack(spacing: 16) { ForEach(menus.indices, id: \.self) { index in FabricatorDropdownMenu(menus[index].0, items: menus[index].1) } } }
}

public struct FabricatorCommandItem: Identifiable {
    public var id: String
    public var title: String
    public var group: String
    public var icon: String
    public var shortcut: String?
    public var action: () -> Void
    public init(id: String, title: String, group: String = "Actions", icon: String = "command", shortcut: String? = nil, action: @escaping () -> Void) { self.id = id; self.title = title; self.group = group; self.icon = icon; self.shortcut = shortcut; self.action = action }
}
public struct FabricatorCommand: View {
    @Environment(\.fabricatorTheme) private var theme
    @State private var query = ""
    @FocusState private var isFocused: Bool
    public var items: [FabricatorCommandItem]
    public var onSelect: () -> Void
    public init(_ items: [FabricatorCommandItem], onSelect: @escaping () -> Void = {}) { self.items = items; self.onSelect = onSelect }
    private var filtered: [FabricatorCommandItem] { items.filter { query.isEmpty || $0.title.localizedCaseInsensitiveContains(query) || $0.group.localizedCaseInsensitiveContains(query) } }
    public var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: theme.space(10)) { FabricatorIcon("search").foregroundStyle(theme.color("muted-foreground")); TextField("Type a command or search…", text: $query).textFieldStyle(.plain).font(theme.font(theme.text(14))).focused($isFocused).onSubmit { if let first = filtered.first { first.action(); onSelect() } } }.padding(.horizontal, theme.space(12)).frame(height: theme.space(48))
            Rectangle().fill(theme.color("border").opacity(0.6)).frame(height: 1)
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    if filtered.isEmpty { Text("No results found.").font(theme.bodyFont).foregroundStyle(theme.color("muted-foreground")).padding(theme.space(16)) }
                    ForEach(Array(Set(filtered.map(\.group))).sorted(), id: \.self) { group in
                        Text(group).font(theme.font(theme.text(12))).foregroundStyle(theme.color("muted-foreground")).padding(.horizontal, theme.space(8)).padding(.top, theme.space(8)).padding(.bottom, theme.space(4))
                        ForEach(filtered.filter { $0.group == group }) { item in
                            Button { item.action(); onSelect() } label: {
                                HStack(spacing: theme.space(8)) { FabricatorIcon(item.icon, size: theme.icon()); Text(item.title); Spacer(minLength: 0); if let shortcut = item.shortcut { FabricatorKbd(shortcut) } }.font(theme.bodyFont).foregroundStyle(theme.color("muted-foreground")).padding(.horizontal, theme.space(8)).frame(maxWidth: .infinity, minHeight: theme.controlHeight, alignment: .leading).contentShape(Rectangle())
                            }.buttonStyle(.plain)
                        }
                    }
                }.padding(theme.space(4))
            }.frame(maxHeight: 320)
        }.frame(minWidth: 280).fabricatorSurface(radius: "xl", elevation: "surface-3", fill: theme.color("surface-3")).onAppear { isFocused = true }
    }
}

public struct FabricatorToastAction: Equatable, Sendable {
    public var label: String
    public var perform: @MainActor @Sendable () -> Void
    public init(_ label: String, perform: @escaping @MainActor @Sendable () -> Void) { self.label = label; self.perform = perform }
    public static func == (first: Self, second: Self) -> Bool { first.label == second.label }
}
public struct FabricatorToastMessage: Identifiable, Equatable, Sendable {
    public var id = UUID()
    public var title: String
    public var description: String?
    public var variant: FabricatorBadgeVariant
    /// Shown instead of the variant's icon.
    public var icon: String?
    public var action: FabricatorToastAction?
    public init(_ title: String, description: String? = nil, variant: FabricatorBadgeVariant = .default, icon: String? = nil, action: FabricatorToastAction? = nil) { self.title = title; self.description = description; self.variant = variant; self.icon = icon; self.action = action }
    var resolvedIcon: String? {
        if let icon { return icon }
        switch variant {
        case .success: return "circle-check"
        case .info: return "info"
        case .warning: return "triangle-exclamation-point"
        case .destructive: return "octagon-x"
        case .default, .secondary, .outline: return nil
        }
    }
}
@MainActor @Observable public final class FabricatorToaster {
    public private(set) var messages: [FabricatorToastMessage] = []
    public init() {}
    public func show(_ title: String, description: String? = nil, variant: FabricatorBadgeVariant = .default, icon: String? = nil, action: FabricatorToastAction? = nil) { messages.append(FabricatorToastMessage(title, description: description, variant: variant, icon: icon, action: action)) }
    public func dismiss(_ id: UUID) { messages.removeAll { $0.id == id } }
}
/// As wide as its content, up to a limit.
private struct FabricatorToastWidth: Layout {
    var maximum: CGFloat
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        subviews.first?.sizeThatFits(ProposedViewSize(width: min(proposal.width ?? maximum, maximum), height: nil)) ?? .zero
    }
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        subviews.first?.place(at: bounds.origin, proposal: ProposedViewSize(bounds.size))
    }
}
public struct FabricatorToast: View {
    @Environment(\.fabricatorTheme) private var theme
    public var message: FabricatorToastMessage
    /// Shows all of a long text.
    public var isExpanded: Bool
    public var onDismiss: () -> Void
    public init(_ message: FabricatorToastMessage, isExpanded: Bool = false, onDismiss: @escaping () -> Void) { self.message = message; self.isExpanded = isExpanded; self.onDismiss = onDismiss }
    private var isStatus: Bool { [.destructive, .success, .warning, .info].contains(message.variant) }
    private var text: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(message.title).modifier(FabricatorTextMetrics(size: theme.text(), weight: .medium)).lineLimit(isExpanded ? nil : 2).foregroundStyle(theme.color("foreground"))
            if let description = message.description { Text(description).modifier(FabricatorTextMetrics(size: theme.text())).lineLimit(isExpanded ? nil : 3).foregroundStyle(theme.color("muted-foreground")) }
        }.accessibilityElement(children: .combine)
    }
    @ViewBuilder private var action: some View {
        if let action = message.action { FabricatorButton(action.label, variant: .secondary, size: .sm) { action.perform(); onDismiss() }.fixedSize() }
    }
    public var body: some View {
        FabricatorToastWidth(maximum: theme.text() * 27) {
            HStack(alignment: .top, spacing: theme.space(8)) {
                if let icon = message.resolvedIcon { FabricatorIcon(icon, size: theme.icon()).foregroundStyle(theme.color(isStatus ? message.variant.rawValue : "foreground")).frame(height: theme.text() * theme.fontScale * 1.5).accessibilityHidden(true) }
                // Beside text that leaves it room, under text that doesn't.
                ViewThatFits(in: .horizontal) {
                    HStack(spacing: theme.space(12)) { text; action }
                    VStack(alignment: .leading, spacing: theme.space(8)) { text.fixedSize(horizontal: false, vertical: true); action }
                }
            }.padding(.horizontal, theme.space(12)).padding(.vertical, theme.space(10))
        }.fabricatorSurface(elevation: "surface-5", fill: theme.color("surface-5"))
            .overlay(alignment: .topLeading) {
                Button(action: onDismiss) { FabricatorIcon("x", size: 12).frame(width: theme.space(20), height: theme.space(20)).background(theme.color("surface-5"), in: Circle()).overlay(Circle().stroke(theme.color("border"))).contentShape(Rectangle().inset(by: -8)) }.buttonStyle(.plain).foregroundStyle(theme.color("muted-foreground")).accessibilityLabel("Dismiss notification").offset(x: -6, y: -6)
            }.accessibilityElement(children: .contain).accessibilityAddTraits(.updatesFrequently)
    }
}
/// A toast on its timer, which waits while its whole text is being read.
private struct FabricatorTimedToast: View {
    @Environment(\.fabricatorTheme) private var theme
    var message: FabricatorToastMessage
    var duration: Duration
    var onDismiss: () -> Void
    @State private var isExpanded = false
    var body: some View {
        FabricatorToast(message, isExpanded: isExpanded, onDismiss: onDismiss)
            .onHover { isExpanded = $0 }
            .onTapGesture { isExpanded.toggle() }
            .animation(theme.animation("toast"), value: isExpanded)
            .task(id: isExpanded) {
                guard !isExpanded else { return }
                do { try await Task.sleep(for: duration); onDismiss() } catch is CancellationError {} catch { assertionFailure("Toast task failed: \(error)") }
            }
    }
}
public struct FabricatorSonner: View {
    @Environment(\.fabricatorTheme) private var theme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    public var toaster: FabricatorToaster
    public var duration: Duration
    public init(_ toaster: FabricatorToaster, duration: Duration = .seconds(5)) { self.toaster = toaster; self.duration = duration }
    private var transition: AnyTransition { reduceMotion ? .opacity : .offset(y: 24).combined(with: .scale(scale: 0.95, anchor: .bottom)).combined(with: .opacity) }
    public var body: some View {
        VStack(alignment: .trailing, spacing: 10) {
            ForEach(toaster.messages.suffix(3)) { message in
                FabricatorTimedToast(message: message, duration: duration) { toaster.dismiss(message.id) }.transition(transition)
            }
        }.padding(16).animation(theme.animation("toast"), value: toaster.messages)
    }
}

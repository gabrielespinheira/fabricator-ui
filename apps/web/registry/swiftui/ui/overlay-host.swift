import SwiftUI
#if os(iOS)
import UIKit
#endif

enum FabricatorOverlayPlacement: Equatable { case center, bottom, leading, trailing, anchor(CGRect) }

private struct FabricatorPopupAvailableHeight: EnvironmentKey { static let defaultValue = CGFloat.infinity }
extension EnvironmentValues {
    var fabricatorPopupAvailableHeight: CGFloat {
        get { self[FabricatorPopupAvailableHeight.self] }
        set { self[FabricatorPopupAvailableHeight.self] = newValue }
    }
}

extension View {
    func fabricatorPopup<Panel: View>(isPresented: Binding<Bool>, minimumWidth: CGFloat = 220, showsScrim: Bool = false, scrimDismisses: Bool = true, preservesTextFocus: Bool = false, onDismiss: @escaping () -> Void = {}, @ViewBuilder panel: () -> Panel) -> some View {
        modifier(FabricatorPopupModifier(isPresented: isPresented, minimumWidth: minimumWidth, showsScrim: showsScrim, scrimDismisses: scrimDismisses, preservesTextFocus: preservesTextFocus, onDismiss: onDismiss, panel: panel()))
    }
}

private struct FabricatorPopupModifier<Panel: View>: ViewModifier {
    @Binding var isPresented: Bool
    var minimumWidth: CGFloat
    var showsScrim: Bool
    var scrimDismisses: Bool
    var preservesTextFocus: Bool
    var onDismiss: () -> Void
    var panel: Panel
    @State private var anchor = CGRect.zero
    func body(content: Content) -> some View {
        content.background {
            GeometryReader { proxy in Color.clear.onAppear { anchor = proxy.frame(in: .global) }.onChange(of: proxy.frame(in: .global)) { _, next in anchor = next } }
        }.background {
            FabricatorOverlayHost(isPresented: $isPresented, placement: .anchor(anchor), minimumWidth: minimumWidth, showsScrim: showsScrim, scrimDismisses: scrimDismisses, preservesTextFocus: preservesTextFocus, onDismiss: onDismiss) { panel }
        }
    }
}

struct FabricatorOverlayHost<Panel: View>: View {
    @Environment(\.fabricatorTheme) private var theme
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @Binding var isPresented: Bool
    var placement: FabricatorOverlayPlacement
    var minimumWidth: CGFloat
    var showsScrim: Bool
    var scrimDismisses: Bool
    var preservesTextFocus: Bool
    var onDismiss: () -> Void
    var panel: Panel
    init(isPresented: Binding<Bool>, placement: FabricatorOverlayPlacement, minimumWidth: CGFloat = 220, showsScrim: Bool, scrimDismisses: Bool, preservesTextFocus: Bool = false, onDismiss: @escaping () -> Void = {}, @ViewBuilder panel: () -> Panel) {
        _isPresented = isPresented
        self.placement = placement
        self.minimumWidth = minimumWidth
        self.showsScrim = showsScrim
        self.scrimDismisses = scrimDismisses
        self.preservesTextFocus = preservesTextFocus
        self.onDismiss = onDismiss
        self.panel = panel()
    }
    var body: some View {
        #if os(iOS)
        FabricatorOverlayRepresentable(isPresented: isPresented, theme: theme, dynamicTypeSize: dynamicTypeSize, placement: placement, minimumWidth: minimumWidth, showsScrim: showsScrim, scrimDismisses: scrimDismisses, preservesTextFocus: preservesTextFocus, dismiss: { isPresented = false }, onDismiss: onDismiss, panel: panel).frame(width: 0, height: 0).accessibilityHidden(true)
        #else
        Color.clear.frame(width: 0, height: 0).accessibilityHidden(true).modifier(FabricatorMacOverlay(isPresented: $isPresented, placement: placement, onDismiss: onDismiss, panel: panel))
        #endif
    }
}

#if os(iOS)
private struct FabricatorOverlayRoot<Panel: View>: View {
    var theme: FabricatorTheme
    var dynamicTypeSize: DynamicTypeSize
    var layer: FabricatorOverlayLayer<Panel>
    var body: some View {
        FabricatorRoot(colorScheme: theme.colorScheme, density: theme.density, motionSpeed: theme.motionSpeed, motionScale: theme.motionScale, isMotionEnabled: theme.isMotionEnabled) { layer }
            .environment(\.dynamicTypeSize, dynamicTypeSize)
    }
}

private final class FabricatorOverlayPresenter: UIViewController {
    var onDidMoveToWindow: (() -> Void)?
    override func viewDidAppear(_ animated: Bool) { super.viewDidAppear(animated); onDidMoveToWindow?() }
}

private final class FabricatorOverlayPortal: UIView {
    var passthroughRect = CGRect.zero
    override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
        // The input remains editable through its nonmodal wheel's overlay.
        if let window, passthroughRect.contains(convert(point, to: window)) { return nil }
        return super.hitTest(point, with: event)
    }
}

private struct FabricatorOverlayRepresentable<Panel: View>: UIViewControllerRepresentable {
    var isPresented: Bool
    var theme: FabricatorTheme
    var dynamicTypeSize: DynamicTypeSize
    var placement: FabricatorOverlayPlacement
    var minimumWidth: CGFloat
    var showsScrim: Bool
    var scrimDismisses: Bool
    var preservesTextFocus: Bool
    var dismiss: () -> Void
    var onDismiss: () -> Void
    var panel: Panel
    func makeCoordinator() -> Coordinator { Coordinator() }
    func makeUIViewController(context: Context) -> FabricatorOverlayPresenter {
        let controller = FabricatorOverlayPresenter()
        controller.view.backgroundColor = .clear
        controller.onDidMoveToWindow = { context.coordinator.sync() }
        return controller
    }
    func updateUIViewController(_ controller: FabricatorOverlayPresenter, context: Context) {
        let coordinator = context.coordinator
        let layer = FabricatorOverlayLayer(isPresented: isPresented, placement: placement, minimumWidth: minimumWidth, showsScrim: showsScrim, scrimDismisses: scrimDismisses, dismiss: dismiss, onExit: { [weak coordinator] in coordinator?.finishDismissal() }, panel: panel)
        let root = FabricatorOverlayRoot(theme: theme, dynamicTypeSize: dynamicTypeSize, layer: layer)
        coordinator.root = isPresented || coordinator.host != nil ? root : nil
        if let host = coordinator.host { host.rootView = root }
        context.coordinator.isPresented = isPresented
        context.coordinator.preservesTextFocus = preservesTextFocus
        context.coordinator.placement = placement
        if case .anchor(let rect) = placement { context.coordinator.portal?.passthroughRect = rect }
        context.coordinator.onDismiss = onDismiss
        context.coordinator.presenter = controller
        if controller.view.window != nil { context.coordinator.sync() }
    }
    static func dismantleUIViewController(_ controller: FabricatorOverlayPresenter, coordinator: Coordinator) {
        coordinator.isPresented = false
        coordinator.finishDismissal()
        coordinator.root = nil
        controller.onDidMoveToWindow = nil
    }
    @MainActor final class Coordinator {
        var host: UIHostingController<FabricatorOverlayRoot<Panel>>?
        var root: FabricatorOverlayRoot<Panel>?
        var isPresented = false
        var preservesTextFocus = false
        var placement = FabricatorOverlayPlacement.center
        var portal: FabricatorOverlayPortal?
        var onDismiss: () -> Void = {}
        weak var presenter: FabricatorOverlayPresenter?
        func sync() {
            guard let presenter else { return }
            if isPresented {
                if host == nil {
                    guard let root else { preconditionFailure("An overlay requires its current content") }
                    let host = UIHostingController(rootView: root)
                    host.view.backgroundColor = .clear
                    host.modalPresentationStyle = .overFullScreen
                    self.host = host
                }
                if preservesTextFocus {
                    guard portal == nil, let host else { return }
                    var container: UIViewController = presenter
                    while let parent = container.parent { container = parent }
                    guard let surface = container.view.superview else { return }
                    let portal = FabricatorOverlayPortal(frame: container.view.frame)
                    portal.autoresizingMask = [.flexibleWidth, .flexibleHeight]
                    if case .anchor(let rect) = placement { portal.passthroughRect = rect }
                    host.view.frame = portal.bounds; host.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
                    // A sibling surface cannot belong to the hosting controller's child tree.
                    portal.addSubview(host.view); surface.addSubview(portal)
                    self.portal = portal
                    return
                }
                guard presenter.presentedViewController == nil, let host else { return }
                presenter.present(host, animated: false)
            }
        }
        func finishDismissal() {
            guard !isPresented, let host else { return }
            if let portal {
                host.view.endEditing(true)
                host.view.removeFromSuperview(); portal.removeFromSuperview()
                self.portal = nil; self.host = nil; root = nil; onDismiss(); return
            }
            guard host.presentingViewController != nil else { return }
            host.dismiss(animated: false) { [weak self, weak host] in
                guard let self, let host, self.host === host else { return }
                self.host = nil; if !self.isPresented { self.root = nil }; self.onDismiss(); self.sync()
            }
        }
    }
}
#else
private struct FabricatorMacOverlay<Panel: View>: ViewModifier {
    @Binding var isPresented: Bool
    var placement: FabricatorOverlayPlacement
    var onDismiss: () -> Void
    var panel: Panel
    func body(content: Content) -> some View {
        if case .anchor = placement { content.popover(isPresented: $isPresented, arrowEdge: .bottom) { panel.onDisappear(perform: onDismiss) } } else { content.sheet(isPresented: $isPresented, onDismiss: onDismiss) { panel } }
    }
}
#endif

#if os(iOS)
private struct FabricatorWindowInsets: UIViewRepresentable {
    var onChange: (UIEdgeInsets) -> Void
    func makeUIView(context: Context) -> Probe { Probe() }
    func updateUIView(_ uiView: Probe, context: Context) { uiView.onChange = onChange; uiView.publish() }
    final class Probe: UIView {
        var onChange: ((UIEdgeInsets) -> Void)?
        override func didMoveToWindow() { super.didMoveToWindow(); publish() }
        override func safeAreaInsetsDidChange() { super.safeAreaInsetsDidChange(); publish() }
        func publish() {
            let next = window?.safeAreaInsets ?? .zero
            guard next != .zero else { return }
            DispatchQueue.main.async { [weak self] in self?.onChange?(next) }
        }
    }
}
#endif

private struct FabricatorOverlayLayer<Panel: View>: View {
    @Environment(\.fabricatorTheme) private var theme
    @State private var isVisible = false
    @State private var windowTop: CGFloat = 0
    @State private var windowBottom: CGFloat = 0
    var isPresented: Bool
    var placement: FabricatorOverlayPlacement
    var minimumWidth: CGFloat
    var showsScrim: Bool
    var scrimDismisses: Bool
    var dismiss: () -> Void
    var onExit: () -> Void
    var panel: Panel
    var body: some View {
        GeometryReader { proxy in
            let origin = proxy.frame(in: .global).origin
            ZStack {
                (showsScrim ? theme.color("scrim") : Color.black.opacity(0.001)).opacity(isVisible ? 1 : 0).ignoresSafeArea().contentShape(Rectangle()).onTapGesture { if scrimDismisses { dismiss() } }.accessibilityHidden(true)
                layer(in: proxy.size, origin: origin, insets: proxy.safeAreaInsets)
            }
        }.ignoresSafeArea(.container).onAppear { setVisibility(isPresented) }.onChange(of: isPresented) { _, presented in setVisibility(presented) }.onKeyPress(.escape) {
            guard scrimDismisses else { return .ignored }
            dismiss(); return .handled
        }.background {
            #if os(iOS)
            FabricatorWindowInsets { insets in
                if insets.top != windowTop { windowTop = insets.top }
                if insets.bottom != windowBottom { windowBottom = insets.bottom }
            }
            #endif
        }
    }
    private var motionRole: String {
        switch placement { case .center: "dialog"; case .anchor: "popup"; default: "sheet" }
    }
    private func setVisibility(_ visible: Bool) {
        withAnimation(theme.animation(motionRole, isExiting: !visible), completionCriteria: .removed) { isVisible = visible } completion: {
            if !visible { onExit() }
        }
    }
    private func animatedPanel<V: View>(_ content: V, travel: CGSize = .zero, anchor: UnitPoint = .center) -> some View {
        let scale = motionRole == "sheet" ? 1 : theme.surfaceScale(motionRole)
        return content.opacity(isVisible ? 1 : 0).scaleEffect(isVisible ? 1 : scale, anchor: anchor)
            .offset(x: isVisible || !theme.hasMotion ? 0 : travel.width, y: isVisible || !theme.hasMotion ? 0 : travel.height)
            .blur(radius: isVisible || motionRole != "popup" ? 0 : theme.popupBlur)
    }
    @ViewBuilder private func layer(in size: CGSize, origin: CGPoint, insets: EdgeInsets) -> some View {
        switch placement {
        case .center: animatedPanel(panel.padding(.horizontal, 16).frame(maxWidth: min(432, size.width)))
        case .bottom: VStack(spacing: 0) { Spacer(minLength: 0); animatedPanel(panel.frame(maxWidth: .infinity), travel: CGSize(width: 0, height: size.height)) }
        case .leading:
            let top = max(insets.top, windowTop)
            let bottom = max(insets.bottom, windowBottom)
            let width = min(320, size.width * 0.86)
            HStack(spacing: 0) { animatedPanel(panel.padding(.top, top).padding(.bottom, bottom).frame(width: width, height: size.height, alignment: .top).background(theme.color("app-shell-frame")), travel: CGSize(width: -width, height: 0)); Spacer(minLength: 0) }
        case .trailing:
            let width = min(384, size.width * 0.75)
            HStack(spacing: 0) { Spacer(minLength: 0); animatedPanel(panel.frame(width: width, height: size.height), travel: CGSize(width: width, height: 0)) }
        case .anchor(let rect):
            let local = CGRect(x: rect.minX - origin.x, y: rect.minY - origin.y, width: rect.width, height: rect.height)
            anchor(local, in: size)
        }
    }
    private func anchor(_ rect: CGRect, in size: CGSize) -> some View {
        let above = max(0, rect.minY - 14), below = max(0, size.height - rect.maxY - 14)
        let opensUp = above > below
        let availableHeight = opensUp ? above : below
        let width = min(max(rect.width, minimumWidth), size.width - 16)
        let leading = min(max(8, rect.minX), max(8, size.width - width - 8))
        return VStack(spacing: 0) {
            if opensUp { Spacer(minLength: 0) }
            animatedPanel(panel.frame(width: width).environment(\.fabricatorPopupAvailableHeight, availableHeight), travel: CGSize(width: 0, height: opensUp ? theme.popupTravel() : -theme.popupTravel()), anchor: opensUp ? .bottomLeading : .topLeading)
            if !opensUp { Spacer(minLength: 0) }
        }.padding(.leading, leading).padding(.trailing, 8).padding(.top, opensUp ? 8 : rect.maxY + 6).padding(.bottom, opensUp ? size.height - rect.minY + 6 : 8).frame(width: size.width, height: size.height, alignment: .topLeading)
    }
}


import SwiftUI
#if os(macOS)
import AppKit
#endif

struct FabricatorTimeWheelScrollActivity: ViewModifier {
    var onStart: () -> Void
    var onEnd: () -> Void
    func body(content: Content) -> some View {
        content.simultaneousGesture(DragGesture(minimumDistance: 1).onChanged { _ in onStart() }.onEnded { _ in onEnd() })
            .background {
                #if os(macOS)
                FabricatorMacWheelEvents(onScroll: { onStart(); onEnd() })
                #endif
            }
    }
}

#if os(macOS)
private struct FabricatorMacWheelEvents: NSViewRepresentable {
    var onScroll: () -> Void
    func makeNSView(context: Context) -> Probe { let view = Probe(); view.start(); return view }
    func updateNSView(_ view: Probe, context: Context) { view.onScroll = onScroll }
    static func dismantleNSView(_ view: Probe, coordinator: ()) { view.stop() }
    final class Probe: NSView {
        var onScroll: (() -> Void)?
        private var monitor: Any?
        func start() {
            monitor = NSEvent.addLocalMonitorForEvents(matching: .scrollWheel) { [weak self] event in
                MainActor.assumeIsolated {
                    guard let self, let window = self.window, event.window === window, self.bounds.contains(self.convert(event.locationInWindow, from: nil)) else { return }
                    self.onScroll?()
                }
                return event
            }
        }
        func stop() { if let monitor { NSEvent.removeMonitor(monitor) }; monitor = nil }
    }
}
#endif

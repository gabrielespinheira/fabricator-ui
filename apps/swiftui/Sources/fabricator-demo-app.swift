import SwiftUI
import FabricatorUI

@main struct FabricatorDemoApp: App {
    var body: some Scene {
        WindowGroup {
            ComponentGallery()
                #if os(macOS)
                .frame(minWidth: 840, minHeight: 680)
                #endif
        }
        #if os(macOS)
        .defaultSize(width: 1280, height: 900)
        .windowStyle(.hiddenTitleBar)
        .commands {
            CommandMenu("Components") {
                Button("Open command menu") { NotificationCenter.default.post(name: .fabricatorCommand, object: nil) }.keyboardShortcut("k", modifiers: .command)
                Divider()
                Button("Toggle appearance") { NotificationCenter.default.post(name: .fabricatorAppearance, object: nil) }.keyboardShortcut("l", modifiers: [.command, .shift])
            }
        }
        #endif
    }
}
extension Notification.Name {
    static let fabricatorCommand = Notification.Name("fabricator.command")
    static let fabricatorAppearance = Notification.Name("fabricator.appearance")
}

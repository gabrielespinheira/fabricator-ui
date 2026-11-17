import Foundation
#if os(iOS)
import UIKit
#else
import AppKit
#endif

@MainActor public enum FabricatorClipboard {
    @discardableResult public static func copy(_ text: String) -> Bool {
        #if os(iOS)
        UIPasteboard.general.string = text
        return true
        #else
        NSPasteboard.general.clearContents(); return NSPasteboard.general.setString(text, forType: .string)
        #endif
    }
}

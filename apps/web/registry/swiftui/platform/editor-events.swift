#if os(iOS)
import Foundation
import OSLog

/// Converts the existing UIKit core's SDK payload at one typed Data boundary.
@MainActor final class FabricatorEditorEventDispatcher {
    var handler: ((Data) -> Void)?
    func callAsFunction(_ payload: [String: Any]) {
        do { handler?(try JSONSerialization.data(withJSONObject: payload)) }
        catch { Logger(subsystem: "app.fabricator-ui", category: "editor-uikit").error("Native editor event could not be encoded: \(error.localizedDescription)") }
    }
}
#endif

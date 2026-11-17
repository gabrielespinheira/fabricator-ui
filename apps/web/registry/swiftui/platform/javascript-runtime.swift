import Foundation
import JavaScriptCore

enum FabricatorJavaScriptError: Error, LocalizedError {
    case unavailable, missingResource(String), exception(String), invalidResult
    var errorDescription: String? { switch self { case .unavailable: "Apple JavaScriptCore is unavailable."; case .missingResource(let resource): "Packaged native domain engine is missing: \(resource)"; case .exception(let message): message; case .invalidResult: "The native domain engine returned no JSON." } }
}

/// One SDK adapter for locally packaged domain engines. No webview or network.
@MainActor final class FabricatorJavaScriptRuntime {
    private let context: JSContext
    private let function: JSValue
    let scriptByteCount: Int
    init(resource: String, functionName: String) throws {
        #if SWIFT_PACKAGE
        let bundle = Bundle.module
        #else
        let bundle = Bundle.main
        #endif
        guard let url = bundle.url(forResource: resource, withExtension: "js") else { throw FabricatorJavaScriptError.missingResource(resource) }
        let source = try String(contentsOf: url, encoding: .utf8)
        scriptByteCount = source.utf8.count
        guard let context = JSContext() else { throw FabricatorJavaScriptError.unavailable }
        self.context = context
        context.evaluateScript(source, withSourceURL: url)
        if let exception = context.exception { throw FabricatorJavaScriptError.exception(exception.toString() ?? "Unknown engine exception") }
        guard let function = context.objectForKeyedSubscript(functionName), !function.isUndefined else { throw FabricatorJavaScriptError.invalidResult }
        self.function = function
    }
    func call(_ request: String) throws -> String {
        context.exception = nil
        let result = function.call(withArguments: [request])
        if let exception = context.exception { throw FabricatorJavaScriptError.exception(exception.toString() ?? "Unknown engine exception") }
        guard let response = result?.toString() else { throw FabricatorJavaScriptError.invalidResult }
        return response
    }
}

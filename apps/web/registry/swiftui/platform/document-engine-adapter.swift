import Foundation

enum FabricatorDocumentEngineError: Error, LocalizedError {
    case scriptFailure(String), invalidReply
    var errorDescription: String? { switch self { case .scriptFailure(let message): message; case .invalidReply: "The canonical document engine returned an invalid reply." } }
}

@MainActor final class FabricatorDocumentEngineAdapter {
    static let shared = Result { try FabricatorDocumentEngineAdapter() }
    static let typography: [String: FabricatorDocumentTypography] = {
        #if SWIFT_PACKAGE
        let bundle = Bundle.module
        #else
        let bundle = Bundle.main
        #endif
        guard let url = bundle.url(forResource: "document-typography", withExtension: "json") else { preconditionFailure("Missing canonical document typography") }
        do { return try JSONDecoder().decode([String: FabricatorDocumentTypography].self, from: Data(contentsOf: url)) }
        catch { preconditionFailure("Invalid canonical document typography: \(error)") }
    }()
    private let runtime: FabricatorJavaScriptRuntime
    var scriptByteCount: Int { runtime.scriptByteCount }
    init() throws { runtime = try FabricatorJavaScriptRuntime(resource: "document-engine", functionName: "fabricatorDocumentCall") }

    private struct Request: Encodable { var action: String; var source: String; var language: String?; var filename: String? }
    private struct Reply<Value: Decodable>: Decodable {
        struct Failure: Decodable { var name: String; var message: String }
        var ok: Bool
        var value: Value?
        var error: Failure?
    }

    func markdown(_ source: String) throws -> FabricatorMarkdownDocument { try call(Request(action: "markdown", source: source)) }
    func syntax(_ source: String, language: String? = nil, filename: String? = nil) throws -> FabricatorSyntaxDocument { try call(Request(action: "syntax", source: source, language: language, filename: filename)) }

    private func call<Value: Decodable>(_ request: Request) throws -> Value {
        let input = String(decoding: try JSONEncoder().encode(request), as: UTF8.self)
        let json = try runtime.call(input)
        let reply = try JSONDecoder().decode(Reply<Value>.self, from: Data(json.utf8))
        if let error = reply.error { throw FabricatorDocumentEngineError.scriptFailure("\(error.name): \(error.message)") }
        guard reply.ok, let value = reply.value else { throw FabricatorDocumentEngineError.invalidReply }
        return value
    }
}

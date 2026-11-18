import Foundation

public enum FabricatorEditorEngineError: Error, LocalizedError, Sendable {
    case unavailable
    case missingResource
    case scriptFailure(String)
    case invalidReply(String)
    public var errorDescription: String? { switch self { case .unavailable: "Apple JavaScriptCore could not create the editor engine."; case .missingResource: "The packaged canonical editor engine is missing."; case .scriptFailure(let message): "Canonical editor engine: \(message)"; case .invalidReply(let message): "Invalid canonical editor reply: \(message)" } }
}
private struct FabricatorEditorEngineReply: Decodable { var ok: Bool; var value: FabricatorEditorEngineSnapshot?; var error: Failure?; struct Failure: Decodable { var name: String; var message: String } }

/// Typed editor port backed by the shared local JavaScriptCore SDK adapter.
/// All text rendering and input stay in UIKit/AppKit and SwiftUI.
@MainActor public final class FabricatorEditorEngineAdapter {
    private let runtime: FabricatorJavaScriptRuntime
    private let sessionID = UUID().uuidString
    private var currentSnapshot: FabricatorEditorEngineSnapshot?
    public let scriptByteCount: Int
    public private(set) var lastCallDuration: Duration = .zero
    public var snapshot: FabricatorEditorEngineSnapshot { guard let value = currentSnapshot else { preconditionFailure("Editor session has not been initialized") }; return value }
    public convenience init(markdown: String = "") throws { try self.init(initial: ["markdown": .string(markdown)]) }
    public convenience init(document: FabricatorEditorDocument) throws { let value = try JSONDecoder().decode(FabricatorEditorJSON.self, from: JSONEncoder().encode(document)); try self.init(initial: ["document": value]) }
    private init(initial: [String: FabricatorEditorJSON]) throws {
        runtime = try FabricatorJavaScriptRuntime(resource: "editor-engine", functionName: "FabricatorEditorBridge")
        scriptByteCount = runtime.scriptByteCount
        try perform("create", values: initial)
    }
    public func select(from: Int, to: Int) throws { try perform("select", values: ["from": .number(Double(from)), "to": .number(Double(to))]) }
    public func replace(from: Int, to: Int, text: String) throws { try perform("replace", values: ["from": .number(Double(from)), "to": .number(Double(to)), "text": .string(text)]) }
    public func replaceNativeText(_ text: String, selection: NSRange) throws { try perform("replaceText", values: ["text": .string(text), "from": .number(Double(selection.location)), "to": .number(Double(selection.location + selection.length))]) }
    public func runCommand(_ id: String, arguments: [String: FabricatorEditorJSON] = [:]) throws { try perform("command", values: ["command": .string(id), "args": .object(arguments)]) }
    public func paste(_ markdown: String) throws { try perform("paste", values: ["text": .string(markdown)]) }
    public func split() throws { try perform("split") }
    public func softBreak() throws { try perform("softBreak") }
    public func deleteBackward() throws { try perform("deleteBackward") }
    public func deleteForward() throws { try perform("deleteForward") }
    public func setBlock(_ id: String, type: String? = nil, attributes: [String: FabricatorEditorJSON]? = nil) throws {
        var values: [String: FabricatorEditorJSON] = ["blockID": .string(id)]
        if let type { values["blockType"] = .string(type) }; if let attributes { values["attrs"] = .object(attributes) }
        try perform("setBlock", values: values)
    }
    public func tableDraft(for blockID: String) throws -> FabricatorEditorTableDraft { try perform("tableDraft", values: ["blockID": .string(blockID)]); guard let draft = snapshot.tableDraft else { throw FabricatorEditorEngineError.invalidReply("Table draft is missing") }; return draft }
    public func updateTable(_ blockID: String, draft: FabricatorEditorTableDraft) throws { let value = try JSONDecoder().decode(FabricatorEditorJSON.self, from: JSONEncoder().encode(draft)); try perform("updateTable", values: ["blockID": .string(blockID), "draft": value]) }
    public func updateCode(_ blockID: String, text: String, language: String) throws { try perform("updateCode", values: ["blockID": .string(blockID), "text": .string(text), "args": .object(["language": .string(language)])]) }
    public func serializeMarkdown() throws -> String { try perform("serialize"); guard let markdown = snapshot.markdown else { throw FabricatorEditorEngineError.invalidReply("Serialized Markdown is missing") }; return markdown }
    private func perform(_ action: String, values: [String: FabricatorEditorJSON] = [:]) throws {
        let clock = ContinuousClock(), start = clock.now
        let request = values.merging(["action": .string(action), "id": .string(sessionID)]) { _, required in required }
        let input = String(decoding: try JSONEncoder().encode(request), as: UTF8.self)
        let text = try runtime.call(input)
        guard let data = text.data(using: .utf8) else { throw FabricatorEditorEngineError.invalidReply("Bridge returned no JSON") }
        let reply = try JSONDecoder().decode(FabricatorEditorEngineReply.self, from: data)
        guard reply.ok, let snapshot = reply.value else { throw FabricatorEditorEngineError.scriptFailure(reply.error.map { "\($0.name): \($0.message)" } ?? "Missing snapshot") }
        currentSnapshot = snapshot
        lastCallDuration = start.duration(to: clock.now)
    }
}

import Foundation

public enum FabricatorEditorJSON: Codable, Equatable, Sendable {
    case string(String), number(Double), boolean(Bool), array([FabricatorEditorJSON]), object([String: FabricatorEditorJSON]), null
    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() { self = .null }
        else if let value = try? container.decode(Bool.self) { self = .boolean(value) }
        else if let value = try? container.decode(Double.self) { self = .number(value) }
        else if let value = try? container.decode(String.self) { self = .string(value) }
        else if let value = try? container.decode([Self].self) { self = .array(value) }
        else { self = .object(try container.decode([String: Self].self)) }
    }
    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self { case .string(let value): try container.encode(value); case .number(let value): try container.encode(value); case .boolean(let value): try container.encode(value); case .array(let value): try container.encode(value); case .object(let value): try container.encode(value); case .null: try container.encodeNil() }
    }
    public var string: String? { if case .string(let value) = self { return value }; return nil }
    public var number: Double? { if case .number(let value) = self { return value }; return nil }
    public var boolean: Bool? { if case .boolean(let value) = self { return value }; return nil }
}
public struct FabricatorEditorMark: Codable, Equatable, Sendable {
    public var type: String
    public var attrs: [String: String]?
    public init(_ type: String, attrs: [String: String]? = nil) { self.type = type; self.attrs = attrs }
}
public struct FabricatorEditorInline: Codable, Equatable, Sendable {
    public var text: String
    public var marks: [FabricatorEditorMark]?
    public var raw: Bool?
    public init(_ text: String, marks: [FabricatorEditorMark]? = nil, raw: Bool? = nil) { self.text = text; self.marks = marks; self.raw = raw }
}
public struct FabricatorEditorSource: Codable, Equatable, Sendable { public var text: String; public var before: String; public var fingerprint: String }
public struct FabricatorEditorBlock: Codable, Identifiable, Equatable, Sendable {
    public var id: String
    public var type: String
    public var indent: Int
    public var content: [FabricatorEditorInline]
    public var attrs: [String: FabricatorEditorJSON]
    public var source: FabricatorEditorSource?
    public init(id: String = UUID().uuidString, type: String = "paragraph", indent: Int = 0, content: [FabricatorEditorInline] = [], attrs: [String: FabricatorEditorJSON] = [:], source: FabricatorEditorSource? = nil) { self.id = id; self.type = type; self.indent = indent; self.content = content; self.attrs = attrs; self.source = source }
    public var text: String { content.map(\.text).joined() }
}
public struct FabricatorEditorDocument: Codable, Equatable, Sendable {
    public var frontmatter: String?
    public var frontmatterSource: String?
    public var blocks: [FabricatorEditorBlock]
    public var trailing: String?
    public init(frontmatter: String? = nil, blocks: [FabricatorEditorBlock] = [FabricatorEditorBlock()], frontmatterSource: String? = nil, trailing: String? = nil) { self.frontmatter = frontmatter; self.blocks = blocks; self.frontmatterSource = frontmatterSource; self.trailing = trailing }
    private enum CodingKeys: CodingKey { case frontmatter, frontmatterSource, blocks, trailing }
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(frontmatter, forKey: .frontmatter); try container.encodeIfPresent(frontmatterSource, forKey: .frontmatterSource); try container.encode(blocks, forKey: .blocks); try container.encodeIfPresent(trailing, forKey: .trailing)
    }
}
public struct FabricatorEditorNativeSpan: Codable, Sendable { public var start: Int; public var end: Int; public var bold: Bool; public var italic: Bool; public var strike: Bool; public var code: Bool; public var raw: Bool; public var link: String?; public var token: String? }
public struct FabricatorEditorNativeTable: Codable, Sendable { public var rows: [[String]]; public var align: [String?] }
public struct FabricatorEditorNativeParagraph: Codable, Sendable { public var start: Int; public var end: Int; public var kind: String; public var level: Int; public var indent: Int; public var marker: String?; public var checked: Bool; public var table: FabricatorEditorNativeTable?; public var label: String? }
public struct FabricatorEditorNativeContent: Codable, Sendable { public var version: Int; public var text: String; public var spans: [FabricatorEditorNativeSpan]; public var paragraphs: [FabricatorEditorNativeParagraph] }
public struct FabricatorEditorFlatSelection: Decodable, Sendable { public var start: Int; public var end: Int }
public struct FabricatorEditorCommandInfo: Decodable, Identifiable, Sendable { public var id: String; public var label: String; public var group: String?; public var shortcut: String?; public var isActive: Bool; public var canRun: Bool }
public struct FabricatorEditorTableDraft: Codable, Sendable { public var cells: [[String]]; public var align: [String?] }
public struct FabricatorEditorEngineSnapshot: Decodable, Sendable {
    public var document: FabricatorEditorDocument
    public var flatText: String
    public var nativeContent: FabricatorEditorNativeContent
    public var selection: FabricatorEditorFlatSelection?
    public var activeMarks: [String]
    public var blockType: String?
    public var headingLevel: Int?
    public var isChecked: Bool
    public var canIndent: Bool
    public var canOutdent: Bool
    public var canUndo: Bool
    public var canRedo: Bool
    public var commands: [FabricatorEditorCommandInfo]
    public var markdown: String?
    public var tableDraft: FabricatorEditorTableDraft?
}

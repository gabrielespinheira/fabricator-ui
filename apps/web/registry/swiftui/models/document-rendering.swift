import Foundation

struct FabricatorDocumentRun: Decodable, Equatable, Sendable {
    struct Mark: Decodable, Equatable, Sendable { var type: String; var attributes: [String: String] }
    var text: String
    var isRaw: Bool
    var marks: [Mark]
}
struct FabricatorDocumentCode: Decodable, Equatable, Sendable { var source: String; var language: String?; var filename: String? }
struct FabricatorDocumentImage: Decodable, Equatable, Sendable { var source: String; var alt: String; var title: String? }
struct FabricatorDocumentTable: Decodable, Equatable, Sendable {
    enum Alignment: String, Decodable, Sendable { case left, center, right }
    var rows: [[[FabricatorDocumentRun]]]
    var align: [Alignment?]
}
struct FabricatorDocumentList: Decodable, Equatable, Sendable {
    struct Item: Decodable, Equatable, Identifiable, Sendable {
        var id: String
        var runs: [FabricatorDocumentRun]
        var isChecked: Bool?
        var children: [FabricatorMarkdownNode]
    }
    var isOrdered: Bool
    var start: Int
    var items: [Item]
}
struct FabricatorMarkdownNode: Decodable, Equatable, Identifiable, Sendable {
    indirect enum Content: Equatable, Sendable {
        case paragraph([FabricatorDocumentRun]), heading(Int, [FabricatorDocumentRun]), quote([FabricatorDocumentRun]), code(FabricatorDocumentCode), divider, raw(String), image(FabricatorDocumentImage), table(FabricatorDocumentTable), list(FabricatorDocumentList)
    }
    var id: String
    var content: Content
    private enum Keys: CodingKey { case id, kind, level, runs, code, source, image, table, list }
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: Keys.self)
        id = try container.decode(String.self, forKey: .id)
        switch try container.decode(String.self, forKey: .kind) {
        case "paragraph": content = .paragraph(try container.decode([FabricatorDocumentRun].self, forKey: .runs))
        case "heading": content = .heading(try container.decode(Int.self, forKey: .level), try container.decode([FabricatorDocumentRun].self, forKey: .runs))
        case "quote": content = .quote(try container.decode([FabricatorDocumentRun].self, forKey: .runs))
        case "code": content = .code(try container.decode(FabricatorDocumentCode.self, forKey: .code))
        case "divider": content = .divider
        case "raw": content = .raw(try container.decode(String.self, forKey: .source))
        case "image": content = .image(try container.decode(FabricatorDocumentImage.self, forKey: .image))
        case "table": content = .table(try container.decode(FabricatorDocumentTable.self, forKey: .table))
        case "list": content = .list(try container.decode(FabricatorDocumentList.self, forKey: .list))
        default: throw DecodingError.dataCorruptedError(forKey: .kind, in: container, debugDescription: "Unknown canonical Markdown node")
        }
    }
}
struct FabricatorMarkdownDocument: Decodable, Equatable, Sendable { var nodes: [FabricatorMarkdownNode] }

struct FabricatorSyntaxToken: Decodable, Equatable, Sendable {
    enum Kind: String, Decodable, Sendable { case plain, comment, keyword, string, constant, function, type, tag, attribute, property, variable, regex, `operator`, punctuation, inserted, deleted, heading, link }
    var content: String
    var kind: Kind
    var isStrong: Bool
    var isEmphasis: Bool
}
struct FabricatorSyntaxLine: Decodable, Equatable, Sendable {
    enum Diff: String, Decodable, Sendable { case inserted, deleted }
    var tokens: [FabricatorSyntaxToken]
    var diff: Diff?
}
struct FabricatorSyntaxDocument: Decodable, Equatable, Sendable {
    var language: String?
    var label: String
    var isShell: Bool
    var lines: [FabricatorSyntaxLine]
}

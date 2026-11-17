import Foundation

public enum FabricatorDocumentSize: String, CaseIterable, Sendable { case sm, `default`, lg }
struct FabricatorDocumentTypography: Decodable, Sendable { var body: CGFloat; var headings: [CGFloat]; var lineHeight: CGFloat; var blockGap: CGFloat; var indent: CGFloat }

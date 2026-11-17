import SwiftUI

public struct FabricatorMarkdown: View {
    @State private var document: FabricatorMarkdownDocument?
    @State private var failure: String?
    public var source: String
    public var size: FabricatorDocumentSize
    public init(_ source: String, size: FabricatorDocumentSize = .default) { self.source = source; self.size = size }
    public var body: some View {
        Group {
            if let document { FabricatorMarkdownNodes(nodes: document.nodes, typography: getDocumentTypography(size)) }
            else if let failure { FabricatorDocumentFailure(message: failure) }
            else { Color.clear.frame(height: 1).accessibilityHidden(true) }
        }.frame(maxWidth: .infinity, alignment: .leading)
            .onChange(of: source, initial: true) {
                do { document = try FabricatorDocumentEngineAdapter.shared.get().markdown(source); failure = nil }
                catch { document = nil; failure = error.localizedDescription; FabricatorDocumentFailure.log(error, component: "Markdown") }
            }
    }
}

private struct FabricatorMarkdownNodes: View {
    @Environment(\.fabricatorTheme) private var theme
    var nodes: [FabricatorMarkdownNode]
    var typography: FabricatorDocumentTypography
    var body: some View {
        VStack(alignment: .leading, spacing: typography.blockGap * theme.fontScale) {
            ForEach(Array(nodes.enumerated()), id: \.element.id) { index, node in
                block(node.content).padding(.top, index > 0 && isHeading(node.content) ? typography.blockGap * theme.fontScale : 0)
            }
        }.frame(maxWidth: .infinity, alignment: .leading)
    }
    private func isHeading(_ content: FabricatorMarkdownNode.Content) -> Bool { if case .heading = content { return true }; return false }
    @ViewBuilder private func block(_ content: FabricatorMarkdownNode.Content) -> some View {
        switch content {
        case .paragraph(let runs): FabricatorDocumentText(runs: runs, size: typography.body, lineHeight: typography.lineHeight)
        case .heading(let level, let runs):
            FabricatorDocumentText(runs: runs, size: typography.headings[level - 1], weight: FabricatorContract.shared.typography.weights.semibold, lineHeight: 1.25)
                .tracking(-0.025 * typography.headings[level - 1] * theme.fontScale).accessibilityAddTraits(.isHeader)
        case .quote(let runs):
            FabricatorDocumentText(runs: runs, size: typography.body, lineHeight: typography.lineHeight, isMuted: true)
                .padding(.leading, typography.body * theme.fontScale + 2).frame(maxWidth: .infinity, alignment: .leading)
                .overlay(alignment: .leading) { Rectangle().fill(theme.color("border")).frame(width: 2) }
        case .code(let code): FabricatorSyntaxHighlight(code.source, language: code.language, filename: code.filename)
        case .list(let list): FabricatorMarkdownList(list: list, typography: typography)
        case .divider: Rectangle().fill(theme.color("border")).frame(height: 1).padding(.vertical, typography.body * theme.fontScale * 0.5).accessibilityHidden(true)
        case .raw(let source):
            Text(source).font(Font(FabricatorFontAdapter.makeMonospaceFont(size: typography.body * theme.fontScale * 0.8125)))
                .foregroundStyle(theme.color("muted-foreground")).textSelection(.enabled).frame(maxWidth: .infinity, alignment: .leading)
                .padding(typography.body * theme.fontScale * 0.75).background(theme.color("muted"), in: RoundedRectangle(cornerRadius: theme.radius("md")))
        case .table(let table): FabricatorMarkdownTable(table: table, typography: typography)
        case .image(let image):
            AsyncImage(url: URL(string: image.source)) { phase in
                switch phase {
                case .success(let image): image.resizable().scaledToFit()
                case .failure: Text(image.alt).foregroundStyle(theme.color("muted-foreground"))
                default: Color.clear.frame(height: typography.body * theme.fontScale)
                }
            }.clipShape(RoundedRectangle(cornerRadius: theme.radius())).accessibilityLabel(image.alt).accessibilityHidden(image.alt.isEmpty)
        }
    }
}

private struct FabricatorMarkdownList: View {
    @Environment(\.fabricatorTheme) private var theme
    var list: FabricatorDocumentList
    var typography: FabricatorDocumentTypography
    private var bodySize: CGFloat { typography.body * theme.fontScale }
    var body: some View {
        VStack(alignment: .leading, spacing: bodySize * 0.25) {
            ForEach(Array(list.items.enumerated()), id: \.element.id) { index, item in
                HStack(alignment: .top, spacing: bodySize * 0.25) {
                    marker(index, item: item).frame(width: bodySize * 1.5, height: bodySize * typography.lineHeight, alignment: item.isChecked == nil ? .center : .leading)
                    VStack(alignment: .leading, spacing: bodySize * 0.25) {
                        FabricatorDocumentText(runs: item.runs, size: typography.body, lineHeight: typography.lineHeight, isMuted: item.isChecked == true, isStruck: item.isChecked == true)
                        if !item.children.isEmpty { AnyView(FabricatorMarkdownNodes(nodes: item.children, typography: typography)) }
                    }.frame(maxWidth: .infinity, alignment: .leading)
                }.accessibilityElement(children: .combine)
            }
        }
    }
    @ViewBuilder private func marker(_ index: Int, item: FabricatorDocumentList.Item) -> some View {
        if let isChecked = item.isChecked {
            RoundedRectangle(cornerRadius: bodySize * 0.375).fill(isChecked ? theme.color("primary") : .clear)
                .overlay { RoundedRectangle(cornerRadius: bodySize * 0.375).strokeBorder(isChecked ? theme.color("primary") : theme.color("foreground").opacity(0.25), lineWidth: 1.5) }
                .overlay { if isChecked { FabricatorIcon("check", size: bodySize * 0.75, strokeWidth: 3).foregroundStyle(theme.color("primary-foreground")) } }
                .frame(width: bodySize * 1.125, height: bodySize * 1.125)
                .accessibilityLabel(isChecked ? "Done" : "Not done")
        } else {
            Text(list.isOrdered ? "\(list.start + index)." : "•").font(theme.font(typography.body)).foregroundStyle(theme.color("muted-foreground")).accessibilityHidden(true)
        }
    }
}

private struct FabricatorMarkdownTable: View {
    @Environment(\.fabricatorTheme) private var theme
    @State private var viewportWidth: CGFloat = 0
    var table: FabricatorDocumentTable
    var typography: FabricatorDocumentTypography
    private var cellSize: CGFloat { typography.body * 0.875 }
    var body: some View {
        ScrollView(.horizontal) {
            Grid(alignment: .leading, horizontalSpacing: 0, verticalSpacing: 0) {
                ForEach(Array(table.rows.enumerated()), id: \.offset) { rowIndex, cells in
                    GridRow {
                        ForEach(Array(cells.enumerated()), id: \.offset) { column, runs in
                            FabricatorDocumentText(runs: runs, size: cellSize, weight: rowIndex == 0 ? FabricatorContract.shared.typography.weights.semibold : 400, lineHeight: typography.lineHeight)
                                .fixedSize(horizontal: true, vertical: false)
                                .padding(.horizontal, cellSize * theme.fontScale * 0.875).padding(.vertical, cellSize * theme.fontScale * 0.5)
                                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: alignment(column))
                                .background(rowIndex == 0 ? theme.color("muted").opacity(0.6) : .clear)
                                .overlay(alignment: .trailing) { if column < cells.count - 1 { Rectangle().fill(theme.color("border").opacity(0.5)).frame(width: 1) } }
                                .accessibilityAddTraits(rowIndex == 0 ? .isHeader : [])
                        }
                    }
                    if rowIndex < table.rows.count - 1 { Rectangle().fill(theme.color("border").opacity(rowIndex == 0 ? 0.7 : 0.5)).frame(height: 1).gridCellUnsizedAxes(.horizontal) }
                }
            }.frame(minWidth: viewportWidth)
        }.fixedSize(horizontal: false, vertical: true)
            .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { viewportWidth = $0 }
            .clipShape(RoundedRectangle(cornerRadius: theme.radius("xl")))
            .overlay { RoundedRectangle(cornerRadius: theme.radius("xl")).strokeBorder(theme.color("border").opacity(0.7), lineWidth: 1) }
            .accessibilityElement(children: .contain).accessibilityLabel("Table")
    }
    private func alignment(_ column: Int) -> Alignment {
        guard column < table.align.count else { return .topLeading }
        switch table.align[column] { case .center: return .top; case .right: return .topTrailing; default: return .topLeading }
    }
}

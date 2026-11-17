import SwiftUI
import CoreText

public struct FabricatorSyntaxHighlight: View {
    @Environment(\.fabricatorTheme) private var theme
    @State private var document: FabricatorSyntaxDocument?
    @State private var failure: String?
    public var source: String
    public var language: String?
    public var filename: String?
    public var showLineNumbers: Bool
    public var startLine: Int
    public var highlightLines: Set<Int>
    public var insertedLines: Set<Int>
    public var deletedLines: Set<Int>
    public var wrap: Bool
    public var maximumHeight: CGFloat?
    public init(_ source: String, language: String? = nil, filename: String? = nil, showLineNumbers: Bool = false, startLine: Int = 1, highlightLines: Set<Int> = [], insertedLines: Set<Int> = [], deletedLines: Set<Int> = [], wrap: Bool = false, maximumHeight: CGFloat? = nil) {
        precondition(startLine > 0, "Code line numbers must be positive")
        precondition(maximumHeight.map { $0.isFinite && $0 >= 0 } ?? true, "Code height must be finite and nonnegative")
        self.source = source; self.language = language; self.filename = filename; self.showLineNumbers = showLineNumbers; self.startLine = startLine; self.highlightLines = highlightLines; self.insertedLines = insertedLines; self.deletedLines = deletedLines; self.wrap = wrap; self.maximumHeight = maximumHeight
    }
    private struct Request: Equatable { var source: String; var language: String?; var filename: String? }
    public var body: some View {
        Group {
            if let document {
                let presentation = FabricatorCodePresentation(lines: document.lines, theme: theme, startLine: startLine)
                VStack(spacing: 0) {
                    HStack(spacing: theme.space(8)) {
                        FabricatorIcon(document.isShell ? "square-terminal" : "file-code", size: theme.icon(14)).accessibilityHidden(true)
                        Text(filename ?? document.label).font(theme.font(theme.text(12), weight: .medium)).foregroundStyle(theme.color("foreground")).lineLimit(1)
                        Spacer(minLength: 0)
                        FabricatorCodeCopy(source: source)
                    }.foregroundStyle(theme.color("muted-foreground"))
                        .padding(.leading, theme.space(12)).padding(.trailing, theme.space(4))
                        .frame(minHeight: theme.minimumControlHeight(36, textStep: 12))
                        .overlay(alignment: .bottom) { Rectangle().fill(theme.color("border").opacity(0.6)).frame(height: 1) }
                    FabricatorCodeViewport(lines: document.lines, presentation: presentation, showLineNumbers: showLineNumbers, startLine: startLine, highlightLines: highlightLines, insertedLines: insertedLines, deletedLines: deletedLines, wrap: wrap, maximumHeight: maximumHeight)
                }.background(theme.color("surface-2"), in: RoundedRectangle(cornerRadius: theme.radius("xl")))
                    .clipShape(RoundedRectangle(cornerRadius: theme.radius("xl")))
                    .overlay { RoundedRectangle(cornerRadius: theme.radius("xl")).strokeBorder(theme.color("border").opacity(0.6), lineWidth: 1) }
            } else if let failure { FabricatorDocumentFailure(message: failure) }
            else { Color.clear.frame(height: theme.space(36)).accessibilityHidden(true) }
        }.accessibilityElement(children: .contain)
        .onChange(of: Request(source: source, language: language, filename: filename), initial: true) {
            do { document = try FabricatorDocumentEngineAdapter.shared.get().syntax(source, language: language, filename: filename); failure = nil }
            catch { document = nil; failure = error.localizedDescription; FabricatorDocumentFailure.log(error, component: "Syntax Highlight") }
        }
    }
}

private struct FabricatorCodeCopy: View {
    @Environment(\.fabricatorTheme) private var theme
    @State private var isCopied = false
    @State private var revision = 0
    var source: String
    var body: some View {
        Button {
            guard FabricatorClipboard.copy(source) else { return }
            isCopied = true; revision += 1
        } label: {
            FabricatorIcon(isCopied ? "check" : "copy", size: theme.icon(14))
                .foregroundStyle(theme.color(isCopied ? "success-text" : "muted-foreground"))
                .id(isCopied).transition(.asymmetric(insertion: .opacity.combined(with: .scale(scale: theme.hasMotion ? 0.75 : 1)), removal: .identity))
        }.buttonStyle(FabricatorButtonStyle(variant: .ghost, size: .iconSm))
            .help(isCopied ? "Copied" : "Copy code")
            .accessibilityLabel(isCopied ? "Copied" : "Copy code").accessibilityValue(isCopied ? "Copied to clipboard" : "")
            .animation(theme.animation("feedback"), value: isCopied)
            .onChange(of: source) { isCopied = false; revision += 1 }
            .task(id: revision) {
                guard isCopied else { return }
                do { try await Task.sleep(for: .seconds(2)) }
                catch is CancellationError { return }
                catch { preconditionFailure("Copy feedback clock failed: \(error)") }
                isCopied = false
            }
    }
}

private struct FabricatorCodePresentation {
    var font: CTFont
    var lineHeight: CGFloat
    var extraLeading: CGFloat
    var gutterWidth: CGFloat
    var lines: [AttributedString]
    var text: AttributedString
    init(lines: [FabricatorSyntaxLine], theme: FabricatorTheme, startLine: Int) {
        let size = theme.text(14) * theme.fontScale
        font = FabricatorFontAdapter.makeMonospaceFont(size: size)
        lineHeight = size * 1.625
        extraLeading = lineHeight - CTFontGetAscent(font) - CTFontGetDescent(font) - CTFontGetLeading(font)
        gutterWidth = FabricatorFontAdapter.measureTextWidth(String(startLine + lines.count - 1), font: font)
        self.lines = lines.map { getSyntaxText($0.tokens, theme: theme, size: size) }
        text = self.lines.enumerated().reduce(into: AttributedString()) { result, line in
            if line.offset > 0 { result.append(AttributedString("\n")) }
            result.append(line.element)
        }
    }
}

private struct FabricatorCodeViewport: View {
    @Environment(\.fabricatorTheme) private var theme
    @State private var viewportWidth: CGFloat = 0
    @State private var wrappedHeight: CGFloat = 0
    @FocusState private var isFocused: Bool
    private struct Bounds: Equatable { var top: CGFloat = 0; var bottom: CGFloat = 0 }
    @State private var bounds = Bounds()
    var lines: [FabricatorSyntaxLine]
    var presentation: FabricatorCodePresentation
    var showLineNumbers: Bool
    var startLine: Int
    var highlightLines: Set<Int>
    var insertedLines: Set<Int>
    var deletedLines: Set<Int>
    var wrap: Bool
    var maximumHeight: CGFloat?
    var body: some View {
        let lineHeight = presentation.lineHeight
        let extra = presentation.extraLeading
        let contentHeight = (wrap ? wrappedHeight : CGFloat(lines.count) * lineHeight) + 2 * theme.space(12)
        let height = min(maximumHeight ?? .infinity, contentHeight)
        ScrollView(wrap ? [.vertical] : maximumHeight == nil ? [.horizontal] : [.horizontal, .vertical]) {
            Group {
                if wrap {
                    VStack(spacing: 0) {
                        ForEach(Array(lines.enumerated()), id: \.offset) { index, line in
                            HStack(alignment: .top, spacing: theme.space(16)) {
                                if showLineNumbers { number(index, line: line) }
                                Text(presentation.lines[index]).lineSpacing(extra).padding(.vertical, extra / 2).frame(maxWidth: .infinity, minHeight: lineHeight, alignment: .leading).fixedSize(horizontal: false, vertical: true).textSelection(.enabled)
                            }.padding(.horizontal, theme.space(16)).background { decoration(index, line: line) }
                        }
                    }.onGeometryChange(for: CGFloat.self) { $0.size.height } action: { wrappedHeight = $0 }
                } else {
                    HStack(alignment: .top, spacing: theme.space(16)) {
                        if showLineNumbers { VStack(spacing: 0) { ForEach(Array(lines.enumerated()), id: \.offset) { index, line in number(index, line: line).frame(height: lineHeight) } } }
                        Text(presentation.text).font(Font(presentation.font)).lineSpacing(extra).padding(.vertical, extra / 2).fixedSize(horizontal: true, vertical: true).textSelection(.enabled)
                        Spacer(minLength: 0)
                    }.padding(.horizontal, theme.space(16)).frame(minWidth: viewportWidth, alignment: .leading)
                        .background(alignment: .top) {
                            VStack(spacing: 0) { ForEach(Array(lines.enumerated()), id: \.offset) { index, line in decoration(index, line: line).frame(height: lineHeight) } }
                        }
                }
            }.padding(.vertical, theme.space(12))
                .onGeometryChange(for: Bounds.self) { geometry in
                    let frame = geometry.frame(in: .named("fabricator-code"))
                    return Bounds(top: frame.minY, bottom: frame.maxY)
                } action: { bounds = $0 }
        }.frame(height: height).coordinateSpace(name: "fabricator-code")
            .scrollBounceBehavior(.basedOnSize)
            .mask {
                VStack(spacing: 0) {
                    LinearGradient(colors: [.clear, .black], startPoint: .top, endPoint: .bottom).frame(height: fadeLength(-bounds.top, height: height))
                    Color.black
                    LinearGradient(colors: [.black, .clear], startPoint: .top, endPoint: .bottom).frame(height: fadeLength(bounds.bottom - height, height: height))
                }
            }
            .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { viewportWidth = $0 }
            .focusable().focused($isFocused).accessibilityElement(children: .contain).accessibilityLabel("Code").focusEffectDisabled()
            .accessibilityValue(maximumHeight != nil && contentHeight > height ? "\(Int((min(1, max(0, -bounds.top / (contentHeight - height))) * 100).rounded()))%" : "")
            .overlay { if isFocused { Rectangle().strokeBorder(theme.color("ring"), lineWidth: 1).allowsHitTesting(false) } }
    }
    private func fadeLength(_ distance: CGFloat, height: CGFloat) -> CGFloat {
        // shadcn/tailwind.css reveals a min(12%, 40px) mask over 96px, ease-in-out.
        let curve = FabricatorMotionTiming(duration: 1, curve: .cubicBezier(0.42, 0, 0.58, 1))
        return min(height * 0.12, 40) * curve.progress(at: Double(distance / 96))
    }
    private func diff(_ index: Int, line: FabricatorSyntaxLine) -> FabricatorSyntaxLine.Diff? {
        line.diff ?? (insertedLines.contains(startLine + index) ? .inserted : deletedLines.contains(startLine + index) ? .deleted : nil)
    }
    private func number(_ index: Int, line: FabricatorSyntaxLine) -> some View {
        let token = diff(index, line: line).map { $0 == .inserted ? "success-text" : "destructive-text" } ?? (highlightLines.contains(startLine + index) ? "foreground" : "syntax-comment")
        return Text(String(startLine + index)).font(Font(presentation.font)).foregroundStyle(theme.color(token)).frame(width: presentation.gutterWidth, alignment: .trailing).accessibilityHidden(true)
    }
    private func decoration(_ index: Int, line: FabricatorSyntaxLine) -> some View {
        let status = diff(index, line: line)
        let isHighlighted = highlightLines.contains(startLine + index)
        let color = status.map { theme.color($0 == .inserted ? "success" : "destructive") }
        return (color?.opacity(0.12) ?? (isHighlighted ? theme.color("active") : .clear))
            .overlay(alignment: .leading) { Rectangle().fill(color ?? (isHighlighted ? theme.color("foreground").opacity(0.4) : .clear)).frame(width: 2) }.allowsHitTesting(false).accessibilityHidden(true)
    }
}

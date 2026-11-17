import SwiftUI
import CoreText
#if os(iOS)
import UIKit

private struct EditorTextReplace: Decodable { var from: Int; var to: Int; var text: String; var selectionStart: Int; var selectionEnd: Int; var isComposing: Bool }
private struct EditorStructuralInput: Decodable { var kind: String; var from: Int; var to: Int }
private struct EditorSelectionInput: Decodable { var start: Int; var end: Int }
private struct EditorCommandInput: Decodable { var id: String }
private struct EditorBlockInput: Decodable { var paragraphStart: Int; var kind: String? }
struct FabricatorNativeEditor: UIViewRepresentable {
    var state: FabricatorEditorState
    var theme: FabricatorTheme
    var isReadOnly: Bool
    var placeholder: String
    var size: FabricatorDocumentSize
    var minimumHeight: CGFloat
    var maximumHeight: CGFloat?
    @Binding var isFocused: Bool
    func makeUIView(context: Context) -> EditorNativeTextView {
        let view = EditorNativeTextView(frame: .zero)
        view.backgroundColor = .clear
        view.setPlaceholder(placeholder); view.setEditable(!isReadOnly); view.setScrollEnabled(maximumHeight != nil)
        context.coordinator.connect(view)
        return view
    }
    func updateUIView(_ view: EditorNativeTextView, context: Context) {
        context.coordinator.state = state
        state.focusNativeView = { [weak coordinator = context.coordinator, weak view] in
            guard let coordinator, let view else { return }
            coordinator.focus(view)
        }
        context.coordinator.isReadOnly = isReadOnly
        context.coordinator.onFocusChange = { isFocused = $0 }
        let key = "\(theme.colorScheme):\(theme.density):\(theme.fontScale):\(size.rawValue)"
        if context.coordinator.themeKey != key {
            let presentation = FabricatorEditorUIKitPresentation(theme: theme, size: size)
            view.receiveTheme(presentation.record, fontResolver: presentation.resolveFont, codeStyle: presentation.codeStyle)
            view.setContentInsets(presentation.insets)
            view.setKeyboardAppearance(theme.colorScheme == .dark ? .dark : .light)
            context.coordinator.themeKey = key
        }
        context.coordinator.receiveSnapshot(view)
        view.setEditable(!isReadOnly); view.setPlaceholder(placeholder); view.setScrollEnabled(maximumHeight != nil)
        context.coordinator.updateKeyboardBar(view, theme: theme, isReadOnly: isReadOnly)
        context.coordinator.updateDecorationControls(view, theme: theme, size: size)
        view.setKeyCommands(state.snapshot.commands.compactMap { command in
            guard let shortcut = command.shortcut else { return nil }
            let parts = shortcut.lowercased().split(separator: "+").map(String.init)
            guard let input = parts.last else { return nil }
            var record = EditorKeyCommandRecord(); record.id = command.id; record.input = input; record.modifiers = parts.dropLast().compactMap { switch $0 { case "mod", "meta": "command"; case "shift": "shift"; case "alt": "alt"; case "ctrl": "control"; default: nil } }; return record
        })
        view.applyReceivedProps()
    }
    func sizeThatFits(_ proposal: ProposedViewSize, uiView: EditorNativeTextView, context: Context) -> CGSize? {
        guard let width = proposal.width else { return nil }
        let height = uiView.sizeThatFits(CGSize(width: width, height: .greatestFiniteMagnitude)).height
        return CGSize(width: width, height: getEditorContentHeight(height, minimum: minimumHeight, maximum: maximumHeight))
    }
    func makeCoordinator() -> Coordinator { Coordinator(state) }
    @MainActor final class Coordinator {
        var state: FabricatorEditorState
        var contentKey: String?
        private var selectionKey: String?
        private var selectionVersion = 0
        var themeKey: String?
        var isReadOnly = false
        var onFocusChange: ((Bool) -> Void)?
        private var keyboardHost: UIHostingController<AnyView>?
        private var keyboardAccessory: FabricatorEditorKeyboardAccessory?
        private var keyboardKey: String?
        private var decorationControls: [Int: (source: String, key: String, view: any UIView & UIContentView)] = [:]
        init(_ state: FabricatorEditorState) { self.state = state }
        func receiveSnapshot(_ view: EditorNativeTextView) {
            let key = "\(ObjectIdentifier(state)):\(state.snapshot.nativeContent.version)"
            if contentKey != key {
                do {
                    let data = try JSONEncoder().encode(state.snapshot.nativeContent)
                    view.receiveContent(try JSONDecoder().decode(EditorContentRecord.self, from: data))
                    contentKey = key
                } catch { state.perform { throw FabricatorEditorEngineError.invalidReply("UIKit content: \(error.localizedDescription)") } }
            }
            let nextSelectionKey = "\(ObjectIdentifier(state)):\(state.revision)"
            if selectionKey != nextSelectionKey { selectionVersion += 1; selectionKey = nextSelectionKey }
            var selection = EditorSelectionRecord(); selection.start = state.selectedRange.location; selection.end = NSMaxRange(state.selectedRange); selection.version = selectionVersion
            view.receiveSelection(selection)
        }
        func focus(_ view: EditorNativeTextView) {
            // Focus reports UIKit's caret synchronously, before SwiftUI's next update.
            receiveSnapshot(view)
            view.applyReceivedProps()
            view.focusEditor()
        }
        func updateDecorationControls(_ view: EditorNativeTextView, theme: FabricatorTheme, size: FabricatorDocumentSize) {
            let starts = Set(state.snapshot.nativeContent.paragraphs.filter { $0.kind == "code" || $0.kind == "task" }.map(\.start))
            decorationControls = decorationControls.filter { starts.contains($0.key) }
            var compact = theme; compact.density = .compact
            let fontSize = getEditorTypography(size, theme: theme).fontSize * theme.fontScale
            let key = "\(ObjectIdentifier(state)):\(theme.colorScheme):\(theme.fontScale):\(size.rawValue):\(theme.motionSpeed):\(theme.motionScale):\(theme.isMotionEnabled):\(isReadOnly)"
            view.setDecorationControlProvider(size: max(compact.minimumHitSize, compact.controlHeight)) { [weak self] paragraph, source in
                guard let self else { return nil }
                let offset = paragraph.start
                let controlKey = "\(key):\(paragraph.kind.rawValue):\(paragraph.isChecked)"
                if let cached = decorationControls[offset], cached.source == source, cached.key == controlKey { return cached.view }
                let configuration = UIHostingConfiguration {
                    Group {
                        if paragraph.kind == .task {
                            FabricatorEditorTask(isChecked: paragraph.isChecked, fontSize: fontSize, text: source, offset: offset) { [weak self] in
                                guard let self else { return }
                                state.openBlock(at: offset, kind: "task", isReadOnly: isReadOnly)
                            }.disabled(isReadOnly)
                        } else {
                            FabricatorEditorCodeCopy(source: source) { [weak self] in self?.state.copyCode(at: offset) ?? false }
                        }
                    }.environment(\.fabricatorTheme, compact)
                }.margins(.all, 0).minSize(width: 0, height: 0)
                let control: any UIView & UIContentView
                if let cached = decorationControls[offset] { control = cached.view; control.configuration = configuration }
                else { control = configuration.makeContentView() }
                control.backgroundColor = .clear
                decorationControls[offset] = (source, controlKey, control)
                return control
            }
        }
        func updateKeyboardBar(_ view: EditorNativeTextView, theme: FabricatorTheme, isReadOnly: Bool) {
            guard !isReadOnly else { view.setKeyboardAccessory(nil); return }
            var barTheme = theme; barTheme.density = .spacious
            let bar = AnyView(FabricatorEditorKeyboardBar(state: state, onDismiss: { [weak view] in view?.blurEditor() }).environment(\.fabricatorTheme, barTheme))
            let height = barTheme.controlHeight + 2 * barTheme.space(4)
            let key = "\(ObjectIdentifier(state)):\(theme.colorScheme):\(theme.fontScale):\(theme.motionSpeed):\(theme.motionScale):\(theme.isMotionEnabled)"
            if let host = keyboardHost, let accessory = keyboardAccessory {
                if keyboardKey != key { host.rootView = bar; keyboardKey = key }
                accessory.preferredHeight = height
                view.setKeyboardAccessory(accessory)
                return
            }
            let host = UIHostingController(rootView: bar)
            host.safeAreaRegions = []
            host.view.backgroundColor = .clear
            let accessory = FabricatorEditorKeyboardAccessory(height: height)
            host.view.frame = accessory.bounds
            host.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            accessory.addSubview(host.view)
            keyboardHost = host; keyboardAccessory = accessory
            keyboardKey = key
            view.setKeyboardAccessory(accessory)
        }
        func connect(_ view: EditorNativeTextView) {
            view.onEditorFocus.handler = { [weak self] _ in self?.onFocusChange?(true) }
            view.onEditorBlur.handler = { [weak self] _ in self?.onFocusChange?(false) }
            view.onTextReplace.handler = { [weak self] data in self?.receive(EditorTextReplace.self, data: data) { state, input in
                if !input.isComposing && (input.text.contains("\n") || input.text.contains("\r")) && input.text.count > 1 { state.select(NSRange(location: input.from, length: input.to - input.from)); state.paste(input.text.replacingOccurrences(of: "\r\n", with: "\n")) }
                else { state.replace(from: input.from, to: input.to, text: input.text) }
            } }
            view.onEditorInput.handler = { [weak self] data in self?.receive(EditorStructuralInput.self, data: data) { state, input in state.structuralInput(input.kind, range: NSRange(location: input.from, length: input.to - input.from)) } }
            view.onSelectionChange.handler = { [weak self] data in self?.receive(EditorSelectionInput.self, data: data) { state, input in state.select(NSRange(location: input.start, length: input.end - input.start)) } }
            view.onKeyCommand.handler = { [weak self] data in
                guard let self, !isReadOnly else { return }
                receive(EditorCommandInput.self, data: data) { state, input in state.runCommand(input.id) }
            }
            view.onTaskToggle.handler = { [weak self] data in
                guard let self else { return }
                receive(EditorBlockInput.self, data: data) { state, input in state.openBlock(at: input.paragraphStart, kind: "task", isReadOnly: self.isReadOnly) }
            }
            view.onBlockPress.handler = { [weak self] data in
                guard let self else { return }
                receive(EditorBlockInput.self, data: data) { state, input in state.openBlock(at: input.paragraphStart, kind: input.kind ?? "", isReadOnly: self.isReadOnly) }
            }
        }
        private func receive<Value: Decodable>(_ type: Value.Type, data: Data, action: (FabricatorEditorState, Value) -> Void) {
            do { action(state, try JSONDecoder().decode(type, from: data)) }
            catch { state.perform { throw FabricatorEditorEngineError.invalidReply("UIKit event: \(error.localizedDescription)") } }
        }
    }
}

private struct FabricatorEditorTask: View {
    @Environment(\.fabricatorTheme) private var theme
    var isChecked: Bool
    var fontSize: CGFloat
    var text: String
    var offset: Int
    var toggle: () -> Void
    var body: some View {
        Button(action: toggle) {
            FabricatorIcon("check", size: fontSize * 0.75, strokeWidth: 3)
                .foregroundStyle(theme.color("primary-foreground"))
                .scaleEffect(isChecked ? 1 : 0.6).opacity(isChecked ? 1 : 0)
                .animation(theme.animation(isChecked ? "move" : "feedback", easing: isChecked ? .enter : .exit, isExiting: !isChecked), value: isChecked)
        }.buttonStyle(FabricatorEditorTaskStyle(isChecked: isChecked, fontSize: fontSize))
            .accessibilityIdentifier("fabricator-editor-task-\(offset)")
            .accessibilityLabel(isChecked ? "Done" : "Not done")
            .accessibilityValue(isChecked ? "Checked" : "Unchecked")
            .accessibilityHint(text)
            .accessibilityAddTraits(.isToggle).accessibilityAddTraits(isChecked ? .isSelected : [])
    }
}

private struct FabricatorEditorTaskStyle: ButtonStyle {
    @Environment(\.fabricatorTheme) private var theme
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.isFocused) private var isFocused
    @State private var isHovered = false
    var isChecked: Bool
    var fontSize: CGFloat
    func makeBody(configuration: Configuration) -> some View {
        let side = fontSize * 1.125
        let radius = fontSize * 0.375
        let shape = RoundedRectangle(cornerRadius: radius, style: .circular)
        shape.fill(isChecked ? theme.color("primary") : .clear)
            .overlay { shape.strokeBorder(isChecked ? theme.color("primary") : theme.color("foreground").opacity(isHovered && isEnabled ? 0.45 : 0.25), lineWidth: 1.5) }
            .overlay { configuration.label }
            .frame(width: side, height: side)
            .overlay { if isFocused { RoundedRectangle(cornerRadius: radius + 3, style: .circular).strokeBorder(theme.color("focus-ring"), lineWidth: 1).padding(-3) } }
            .scaleEffect(configuration.isPressed && isEnabled && theme.hasMotion ? 0.9 : 1)
            .animation(theme.animation("feedback"), value: configuration.isPressed)
            .animation(theme.animation("feedback"), value: isChecked)
            .animation(theme.animation("feedback"), value: isHovered)
            .contentShape(Rectangle()).padding(max(0, (theme.minimumHitSize - side) / 2)).contentShape(Rectangle())
            .padding(-max(0, (theme.minimumHitSize - side) / 2))
            .onHover { isHovered = $0 }.focusEffectDisabled()
    }
}

private struct FabricatorEditorCodeCopy: View {
    @Environment(\.fabricatorTheme) private var theme
    @State private var isCopied = false
    @State private var revision = 0
    var source: String
    var copy: () -> Bool
    var body: some View {
        Button {
            guard copy() else { return }
            isCopied = true; revision += 1
        } label: {
            FabricatorIcon(isCopied ? "check" : "copy", size: theme.icon())
        }.buttonStyle(FabricatorEditorCommandStyle(foreground: isCopied ? theme.color("success-text") : nil))
            .accessibilityLabel(isCopied ? "Copied" : "Copy code")
            .accessibilityValue(isCopied ? "Copied to clipboard" : "")
            .help(isCopied ? "Copied" : "Copy code")
            .onChange(of: source) { isCopied = false; revision += 1 }
            .task(id: revision) {
                guard isCopied else { return }
                do { try await Task.sleep(for: .seconds(2)) }
                catch is CancellationError { return }
                catch { preconditionFailure("Editor copy feedback clock failed: \(error)") }
                isCopied = false
            }
    }
}

private final class FabricatorEditorKeyboardAccessory: UIInputView {
    var preferredHeight: CGFloat { didSet { if preferredHeight != oldValue { invalidateIntrinsicContentSize() } } }
    init(height: CGFloat) {
        preferredHeight = height
        super.init(frame: CGRect(x: 0, y: 0, width: 0, height: height), inputViewStyle: .keyboard)
        allowsSelfSizing = true
    }
    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("Use init(height:)") }
    override var intrinsicContentSize: CGSize { CGSize(width: UIView.noIntrinsicMetric, height: preferredHeight) }
}
#else
import AppKit

struct FabricatorNativeEditor: NSViewRepresentable {
    var state: FabricatorEditorState
    var theme: FabricatorTheme
    var isReadOnly: Bool
    var placeholder: String
    var size: FabricatorDocumentSize
    var minimumHeight: CGFloat
    var maximumHeight: CGFloat?
    @Binding var isFocused: Bool
    func makeNSView(context: Context) -> NSScrollView {
        let view = FabricatorEditorNSTextView(frame: .zero)
        view.delegate = context.coordinator; view.drawsBackground = false; view.isRichText = true; view.isEditable = !isReadOnly; view.isSelectable = true; view.setAccessibilityLabel("Rich text editor")
        view.onUndo = { [weak coordinator = context.coordinator] in coordinator?.state.runCommand("undo") }; view.onRedo = { [weak coordinator = context.coordinator] in coordinator?.state.runCommand("redo") }
        view.onBlock = { [weak state] index in state?.openBlock(at: index, kind: "", isReadOnly: isReadOnly) }
        view.onFocusChange = { [weak coordinator = context.coordinator, weak view] isFocused in
            guard let coordinator, let view else { return }
            if isFocused { coordinator.state.select(view.selectedRange()) }
            coordinator.onFocusChange?(isFocused)
        }
        view.minSize = NSSize(width: 0, height: 0); view.maxSize = NSSize(width: CGFloat.greatestFiniteMagnitude, height: CGFloat.greatestFiniteMagnitude); view.isVerticallyResizable = true; view.isHorizontallyResizable = false; view.autoresizingMask = [.width]; view.textContainer?.widthTracksTextView = true
        let scroll = NSScrollView(); scroll.documentView = view; scroll.hasVerticalScroller = maximumHeight != nil; scroll.drawsBackground = false
        return scroll
    }
    func updateNSView(_ scroll: NSScrollView, context: Context) {
        context.coordinator.state = state
        context.coordinator.onFocusChange = { isFocused = $0 }
        guard let view = scroll.documentView as? FabricatorEditorNSTextView else { return }
        state.focusNativeView = { [weak coordinator = context.coordinator, weak view] in
            guard let coordinator, let view else { return }
            coordinator.focus(view, theme: theme, size: size)
        }
        view.onBlock = { [weak state] index in state?.openBlock(at: index, kind: "", isReadOnly: isReadOnly) }
        context.coordinator.receiveSnapshot(view, theme: theme, size: size)
        view.isEditable = !isReadOnly; view.insertionPointColor = NSColor(theme.color("primary"))
    }
    func sizeThatFits(_ proposal: ProposedViewSize, nsView: NSScrollView, context: Context) -> CGSize? {
        guard let width = proposal.width, let view = nsView.documentView as? NSTextView, let container = view.textContainer, let layout = view.layoutManager else { return nil }
        container.containerSize = NSSize(width: max(0, width - 2 * view.textContainerInset.width), height: .greatestFiniteMagnitude)
        layout.ensureLayout(for: container)
        let height = layout.usedRect(for: container).height + 2 * view.textContainerInset.height
        return CGSize(width: width, height: getEditorContentHeight(height, minimum: minimumHeight, maximum: maximumHeight))
    }
    func makeCoordinator() -> Coordinator { Coordinator(state) }
    @MainActor final class Coordinator: NSObject, NSTextViewDelegate {
        var state: FabricatorEditorState
        var contentKey = ""
        var isApplying = false
        var onFocusChange: ((Bool) -> Void)?
        init(_ state: FabricatorEditorState) { self.state = state }
        func receiveSnapshot(_ view: FabricatorEditorNSTextView, theme: FabricatorTheme, size: FabricatorDocumentSize) {
            guard let storage = view.textStorage, !view.hasMarkedText() else { return }
            isApplying = true
            defer { isApplying = false }
            view.blockOffsets = state.snapshot.nativeContent.paragraphs.filter { ["table", "image", "divider", "code"].contains($0.kind) }.map { ($0.start, $0.end) }
            let key = "\(ObjectIdentifier(state)):\(state.snapshot.nativeContent.version):\(theme.colorScheme):\(theme.fontScale):\(theme.density):\(size.rawValue)"
            if contentKey != key {
                storage.setAttributedString(makeAppKitContent(state.snapshot.nativeContent, theme: theme, size: size))
                let type = getEditorTypography(size, theme: theme)
                view.textContainerInset = NSSize(width: type.fontSize * theme.fontScale, height: type.fontSize * theme.fontScale * 0.75)
                contentKey = key
            }
            let selection = NSRange(location: min(state.selectedRange.location, storage.length), length: min(state.selectedRange.length, max(0, storage.length - state.selectedRange.location)))
            if view.selectedRange() != selection { view.setSelectedRange(selection) }
        }
        func focus(_ view: FabricatorEditorNSTextView, theme: FabricatorTheme, size: FabricatorDocumentSize) {
            receiveSnapshot(view, theme: theme, size: size)
            view.window?.makeFirstResponder(view)
        }
        func textDidChange(_ notification: Notification) { guard !isApplying, let view = notification.object as? NSTextView else { return }; state.replaceNativeText(view.string, selection: view.selectedRange()) }
        func textViewDidChangeSelection(_ notification: Notification) { guard !isApplying, let view = notification.object as? NSTextView, !view.hasMarkedText() else { return }; if state.selectedRange != view.selectedRange() { state.select(view.selectedRange()) } }
        func textView(_ view: NSTextView, doCommandBy command: Selector) -> Bool {
            guard !view.hasMarkedText() else { return false }
            if command == #selector(NSResponder.insertNewline(_:)) { state.structuralInput("split", range: view.selectedRange()); return true }
            if command == #selector(NSResponder.insertLineBreak(_:)) { state.structuralInput("softBreak", range: view.selectedRange()); return true }
            if command == #selector(NSResponder.insertTab(_:)), state.snapshot.canIndent { state.runCommand("indent"); return true }
            if command == #selector(NSResponder.insertBacktab(_:)), state.snapshot.canOutdent { state.runCommand("outdent"); return true }
            return false
        }
    }
}
final class FabricatorEditorNSTextView: NSTextView {
    var onUndo: (() -> Void)?
    var onRedo: (() -> Void)?
    var onBlock: ((Int) -> Void)?
    var onFocusChange: ((Bool) -> Void)?
    var blockOffsets: [(Int, Int)] = []
    private let canonicalUndo = FabricatorEditorNSUndoManager()
    override var undoManager: UndoManager? { canonicalUndo.onUndo = onUndo; canonicalUndo.onRedo = onRedo; return canonicalUndo }
    override func becomeFirstResponder() -> Bool {
        let isFocused = super.becomeFirstResponder()
        if isFocused { onFocusChange?(true) }
        return isFocused
    }
    override func resignFirstResponder() -> Bool {
        let didResign = super.resignFirstResponder()
        if didResign { onFocusChange?(false) }
        return didResign
    }
    override func mouseDown(with event: NSEvent) { if event.clickCount == 2 { let index = characterIndexForInsertion(at: convert(event.locationInWindow, from: nil)); if let block = blockOffsets.first(where: { index >= $0.0 && index <= $0.1 }) { onBlock?(block.0); return } }; super.mouseDown(with: event) }
}
private final class FabricatorEditorNSUndoManager: UndoManager {
    var onUndo: (() -> Void)?
    var onRedo: (() -> Void)?
    override var canUndo: Bool { onUndo != nil }
    override var canRedo: Bool { onRedo != nil }
    override func undo() { onUndo?() }
    override func redo() { onRedo?() }
    override func registerUndo(withTarget target: Any, selector: Selector, object: Any?) {}
}
func makeAppKitContent(_ content: FabricatorEditorNativeContent, theme: FabricatorTheme, size: FabricatorDocumentSize) -> NSAttributedString {
    let type = getEditorTypography(size, theme: theme)
    let bodySize = type.fontSize * theme.fontScale
    let baseFont = FabricatorFontAdapter.makeFont(size: bodySize, weight: 400) as NSFont
    let string = NSMutableAttributedString(string: content.text, attributes: [.font: baseFont, .foregroundColor: NSColor(theme.color("foreground"))])
    for (index, paragraph) in content.paragraphs.enumerated() {
        let end = index + 1 < content.paragraphs.count ? content.paragraphs[index + 1].start : string.length
        let range = NSRange(location: min(paragraph.start, string.length), length: max(0, min(end, string.length) - paragraph.start))
        let style = NSMutableParagraphStyle(); style.paragraphSpacing = type.paragraphSpacing * theme.fontScale; style.headIndent = CGFloat(paragraph.indent) * type.indentWidth * theme.fontScale; style.firstLineHeadIndent = style.headIndent
        var font = baseFont
        var lineHeight = bodySize * type.lineHeight
        if ["bulleted", "numbered", "task"].contains(paragraph.kind) { style.textLists = [NSTextList(markerFormat: paragraph.kind == "numbered" ? .decimal : .disc, options: 0)]; style.headIndent += type.indentWidth * theme.fontScale }
        if paragraph.kind == "heading" {
            let headingSize = type.headingSizes[min(5, max(0, paragraph.level - 1))] * theme.fontScale
            font = FabricatorFontAdapter.makeFont(size: headingSize, weight: FabricatorContract.shared.typography.weights.semibold) as NSFont
            lineHeight = headingSize * 1.25
            style.paragraphSpacingBefore = index > 0 ? headingSize * 0.75 : 0
            string.addAttribute(.kern, value: -0.025 * headingSize, range: range)
        }
        if paragraph.kind == "code" || paragraph.kind == "raw" {
            let pointSize = paragraph.kind == "code" ? theme.text(14) * theme.fontScale : bodySize * 0.8125
            font = FabricatorFontAdapter.makeMonospaceFont(size: pointSize) as NSFont
            lineHeight = pointSize * 1.625
            string.addAttribute(.backgroundColor, value: NSColor(theme.color("surface-2")), range: range)
        }
        style.minimumLineHeight = lineHeight; style.maximumLineHeight = lineHeight
        string.addAttribute(.font, value: font, range: range)
        string.addAttribute(.paragraphStyle, value: style, range: range)
        if paragraph.kind == "quote" || paragraph.checked { string.addAttribute(.foregroundColor, value: NSColor(theme.color("muted-foreground")), range: range); if paragraph.checked { string.addAttributes([.strikethroughStyle: NSUnderlineStyle.single.rawValue, .strikethroughColor: NSColor(theme.color("muted-foreground"))], range: range) } }
        if paragraph.kind == "table", let table = paragraph.table { let image = drawAppKitTable(table, theme: theme); let attachment = NSTextAttachment(); attachment.image = image; let replacement = NSAttributedString(attachment: attachment); string.replaceCharacters(in: NSRange(location: paragraph.start, length: 1), with: replacement) }
    }
    for span in content.spans {
        let range = NSRange(location: min(span.start, string.length), length: max(0, min(span.end, string.length) - span.start))
        guard range.length > 0, let inherited = string.attribute(.font, at: range.location, effectiveRange: nil) as? NSFont else { continue }
        let isMonospace = span.code || span.raw || inherited.familyName == "Geist Mono"
        let pointSize = (span.code || span.raw) && inherited.familyName != "Geist Mono" ? inherited.pointSize * 0.875 : inherited.pointSize
        let weight = span.bold ? FabricatorContract.shared.typography.weights.semibold : CTFontCopyVariation(inherited as CTFont).flatMap { ($0 as? [NSNumber: NSNumber])?[NSNumber(value: 0x77676874)]?.doubleValue } ?? 400
        let font = (isMonospace ? FabricatorFontAdapter.makeMonospaceFont(size: pointSize, weight: weight, isItalic: span.italic) : FabricatorFontAdapter.makeFont(size: pointSize, weight: weight, isItalic: span.italic)) as NSFont
        string.addAttribute(.font, value: font, range: range)
        if span.strike { string.addAttributes([.strikethroughStyle: NSUnderlineStyle.single.rawValue, .strikethroughColor: NSColor(theme.color("foreground")).withAlphaComponent(0.5)], range: range) }
        if let link = span.link { string.addAttributes([.link: link, .foregroundColor: NSColor(theme.color("primary-text"))], range: range) }
        if span.code { string.addAttribute(.backgroundColor, value: NSColor(theme.color("hover")), range: range) }
        if let token = span.token {
            let color = NSColor(theme.color(FabricatorSyntaxStyle.getColorRole(token)))
            string.addAttribute(.foregroundColor, value: color, range: range)
            if token == "link" { string.addAttributes([.underlineStyle: NSUnderlineStyle.single.rawValue, .underlineColor: color], range: range) }
        }
    }
    return string
}
private func drawAppKitTable(_ table: FabricatorEditorNativeTable, theme: FabricatorTheme) -> NSImage {
    let columns = max(1, table.rows.map(\.count).max() ?? 1), width: CGFloat = CGFloat(columns) * 140, height: CGFloat = CGFloat(max(1, table.rows.count)) * 36
    return NSImage(size: NSSize(width: width, height: height), flipped: true) { bounds in
        NSColor(theme.color("card")).setFill(); bounds.fill()
        for (rowIndex, row) in table.rows.enumerated() { for (column, text) in row.enumerated() { let rect = NSRect(x: CGFloat(column) * 140, y: CGFloat(rowIndex) * 36, width: 140, height: 36); if rowIndex == 0 { NSColor(theme.color("hover")).setFill(); rect.fill() }; NSColor(theme.color("border")).setStroke(); NSBezierPath(rect: rect).stroke(); (text as NSString).draw(in: rect.insetBy(dx: 10, dy: 10), withAttributes: [.font: NSFont.systemFont(ofSize: 12, weight: rowIndex == 0 ? .semibold : .regular), .foregroundColor: NSColor(theme.color("foreground"))]) } }
        return true
    }
}
#endif

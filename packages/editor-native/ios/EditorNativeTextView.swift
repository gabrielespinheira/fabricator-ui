import ExpoModulesCore
import UIKit

/// The view JS renders: one text view holding the whole document. It shows the
/// document JS sends, reports edits as ranges of the flat text, and reports
/// the caret. JS owns the model; this view never restructures text itself.
final class EditorNativeTextView: ExpoView, UITextViewDelegate, NSTextLayoutManagerDelegate,
  UIGestureRecognizerDelegate, EditorDecorationSource
{
  let onTextReplace = EventDispatcher()
  let onEditorInput = EventDispatcher()
  let onSelectionChange = EventDispatcher()
  let onKeyCommand = EventDispatcher()
  let onCaretRect = EventDispatcher()
  let onContentHeight = EventDispatcher()
  let onTaskToggle = EventDispatcher()
  let onBlockPress = EventDispatcher()
  let onEditorFocus = EventDispatcher()
  let onEditorBlur = EventDispatcher()

  private let textView = EditorTextView()
  private let placeholderLabel = UILabel()
  /// Taps on a checkbox, a divider, an image or a table, which never move the caret.
  private lazy var decorationTap = UITapGestureRecognizer(
    target: self, action: #selector(handleDecorationTap(_:)))

  /// Mirrors the text storage: JS's last document, shifted by local edits since.
  private var document = EditorDocument.empty
  private var theme = EditorTheme.fallback
  private var styler: EditorStyler { EditorStyler(theme: theme) }

  // Props received in this update, applied together in `applyReceivedProps`.
  private var receivedContent: EditorContentRecord?
  private var receivedSelection: EditorSelectionRecord?
  private var appliedSelectionVersion: Int?
  private var needsRestyle = false

  /// Content JS sent while marked text was active, applied once it ends.
  private var deferredContent: (document: EditorDocument, selection: NSRange?)?
  /// The edit UIKit announced in `shouldChangeTextIn`, until it lands.
  private var pendingEdit: (range: NSRange, text: String)?
  /// True while the view changes its own text or selection, so it doesn't report them.
  private var isApplying = false
  /// Texts the view reported since JS last caught up, oldest first. Content
  /// JS rendered for one of them arrives after the view moved on, while the
  /// person types faster than the round trip, and must not rewind the text.
  private var reportedTexts: [String] = []

  private var isScrollEnabled = true
  private var autoFocus = false
  private var didAutoFocus = false
  private var lastContentHeight: CGFloat = -1
  private var lastCaretRect = CGRect.null
  private var contentInsets = UIEdgeInsets.zero
  private var decorationControlProvider: ((EditorParagraph, String) -> UIView?)?
  private var decorationControls: [Int: EditorDecorationControlHost] = [:]
  private var decorationControlSize: CGFloat = 44
  private var isLayingOutControls = false

  // MARK: Setup

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    textView.delegate = self
    textView.backgroundColor = .clear
    textView.textContainerInset = .zero
    textView.textContainer.lineFragmentPadding = 0
    textView.textLayoutManager?.delegate = self
    textView.onKeyCommand = { [weak self] id in self?.onKeyCommand(["id": id]) }
    textView.onSoftBreak = { [weak self] in self?.reportStructuralInput(.softBreak) }
    textView.onDeleteBackwardAtStart = { [weak self] in
      self?.onEditorInput(["kind": "deleteBackward", "from": 0, "to": 0])
    }
    textView.editorUndoManager.onUndo = { [weak self] in self?.onKeyCommand(["id": "undo"]) }
    textView.editorUndoManager.onRedo = { [weak self] in self?.onKeyCommand(["id": "redo"]) }
    textView.setKeyCommands([])
    addSubview(textView)

    placeholderLabel.numberOfLines = 0
    placeholderLabel.isUserInteractionEnabled = false
    textView.addSubview(placeholderLabel)

    decorationTap.delegate = self
    textView.addGestureRecognizer(decorationTap)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    if textView.frame != bounds {
      textView.frame = bounds
    }
    if decorationControlProvider != nil { textView.layoutIfNeeded() }
    layoutPlaceholder()
    layoutDecorationControls()
    reportLayout()
  }

  override func sizeThatFits(_ size: CGSize) -> CGSize {
    var measured = textView.sizeThatFits(CGSize(width: size.width, height: .greatestFiniteMagnitude))
    let last = document.paragraphs[document.paragraphs.count - 1]
    let metrics = styler.metrics(for: last)
    measured.height = ceil(measured.height + metrics.blockPaddingY + (metrics.blockPaddingY > 0 ? metrics.leading / 2 : 0))
    return measured
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    guard window != nil, autoFocus, !didAutoFocus else { return }
    didAutoFocus = true
    DispatchQueue.main.async { [weak self] in
      _ = self?.textView.becomeFirstResponder()
    }
  }

  // MARK: Props

  func receiveContent(_ content: EditorContentRecord) {
    receivedContent = content
  }

  func receiveTheme(_ record: EditorThemeRecord, fontResolver: EditorFontResolver? = nil, codeStyle: EditorCodeStyle? = nil) {
    theme = EditorTheme(record: record, fontResolver: fontResolver, codeStyle: codeStyle)
    textView.tintColor = theme.caret
    needsRestyle = true
  }

  func setContentInsets(_ insets: UIEdgeInsets) {
    guard contentInsets != insets else { return }
    contentInsets = insets
    updateContentInsets()
  }

  private func updateContentInsets() {
    let first = document.paragraphs[0]
    let metrics = styler.metrics(for: first)
    var insets = contentInsets
    if first.kind == .code || first.kind == .raw {
      // TextKit does not reserve paragraphSpacingBefore at the document start.
      insets.top += max(0, metrics.headerHeight + metrics.blockPaddingY - metrics.leading / 2)
    }
    guard textView.textContainerInset != insets else { return }
    textView.textContainerInset = insets
    lastContentHeight = -1
    setNeedsLayout()
  }

  func setKeyboardAccessory(_ accessory: UIView?) {
    guard textView.inputAccessoryView !== accessory else { return }
    textView.inputAccessoryView = accessory
    if textView.isFirstResponder { textView.reloadInputViews() }
  }

  func setKeyboardAppearance(_ appearance: UIKeyboardAppearance) {
    guard textView.keyboardAppearance != appearance else { return }
    textView.keyboardAppearance = appearance
    if textView.isFirstResponder { textView.reloadInputViews() }
  }

  /// Native embeddings can replace task and Copy artwork with accessible controls.
  func setDecorationControlProvider(size: CGFloat, _ provider: @escaping (EditorParagraph, String) -> UIView?) {
    let wasDrawingControls = decorationControlProvider == nil
    decorationControlProvider = provider
    decorationControlSize = size
    if wasDrawingControls {
      invalidateLayout(of: document.paragraphs.filter { $0.kind == .code || $0.kind == .task }.map {
        NSRange(location: $0.start, length: $0.end - $0.start)
      })
    }
    setNeedsLayout()
  }

  func receiveSelection(_ selection: EditorSelectionRecord?) {
    receivedSelection = selection
  }

  func setPlaceholder(_ placeholder: String) {
    placeholderLabel.text = placeholder
    updatePlaceholder()
  }

  func setEditable(_ isEditable: Bool) {
    guard textView.isEditable != isEditable else { return }
    textView.isEditable = isEditable
  }

  func setScrollEnabled(_ isEnabled: Bool) {
    guard isScrollEnabled != isEnabled else { return }
    isScrollEnabled = isEnabled
    textView.isScrollEnabled = isEnabled
    lastContentHeight = -1
    setNeedsLayout()
  }

  func setSmartPunctuation(_ isOn: Bool) {
    textView.smartQuotesType = isOn ? .default : .no
    textView.smartDashesType = isOn ? .default : .no
    textView.smartInsertDeleteType = isOn ? .default : .no
  }

  func setKeyCommands(_ commands: [EditorKeyCommandRecord]) {
    textView.setKeyCommands(commands)
  }

  func setAutoFocus(_ autoFocus: Bool) {
    self.autoFocus = autoFocus
  }

  func focusEditor() {
    _ = textView.becomeFirstResponder()
  }

  func blurEditor() {
    _ = textView.resignFirstResponder()
  }

  /// Applies this update's content and selection in one go, after every prop arrived.
  func applyReceivedProps() {
    let selection = takeNewSelection()
    if let record = receivedContent {
      receivedContent = nil
      needsRestyle = false
      apply(EditorDocument(record: record), selection: selection)
    } else {
      if needsRestyle {
        needsRestyle = false
        restyle()
      }
      if let selection {
        if textView.markedTextRange == nil {
          select(selection)
        } else if deferredContent != nil {
          deferredContent?.selection = selection
        }
      }
    }
    updatePlaceholder()
  }

  private func takeNewSelection() -> NSRange? {
    guard let selection = receivedSelection, selection.version != appliedSelectionVersion else {
      return nil
    }
    appliedSelectionVersion = selection.version
    let start = min(selection.start, selection.end)
    return NSRange(location: start, length: abs(selection.end - selection.start))
  }

  // MARK: Applying content

  private func apply(_ newDocument: EditorDocument, selection: NSRange?) {
    if newDocument.text != textView.textStorage.string,
      let index = reportedTexts.lastIndex(of: newDocument.text)
    {
      // JS is behind: newer edits are on their way, and its content for them follows.
      reportedTexts.removeFirst(index + 1)
      return
    }
    reportedTexts.removeAll()
    if newDocument.text == textView.textStorage.string {
      // Same characters: restyle only, so the caret and any marked text stay as they are.
      let changedTables = changedTableRanges(from: document, to: newDocument)
      document = newDocument
      deferredContent = nil
      restyle()
      invalidateLayout(of: changedTables)
      if let selection, textView.markedTextRange == nil {
        select(selection)
      }
      return
    }
    if textView.markedTextRange != nil {
      deferredContent = (newDocument, selection ?? deferredContent?.selection)
      return
    }
    replaceText(with: newDocument, selection: selection)
  }

  private func replaceText(with newDocument: EditorDocument, selection: NSRange?) {
    let previousSelection = textView.selectedRange
    let styled = NSMutableAttributedString(string: newDocument.text)
    styler.apply(newDocument, to: styled)
    isApplying = true
    document = newDocument
    deferredContent = nil
    let storage = textView.textStorage
    textView.contentStorage.performEditingTransaction {
      storage.replaceCharacters(in: NSRange(location: 0, length: storage.length), with: styled)
    }
    // Without a selection from JS the caret keeps its offset from the start.
    textView.selectedRange = clamped(selection ?? previousSelection)
    isApplying = false
    afterProgrammaticChange()
  }

  private func restyle() {
    isApplying = true
    let selection = textView.selectedRange
    let storage = textView.textStorage
    textView.contentStorage.performEditingTransaction {
      styler.apply(document, to: storage)
    }
    if textView.selectedRange != selection {
      textView.selectedRange = selection
    }
    isApplying = false
    afterProgrammaticChange()
  }

  /// Table paragraphs whose cells changed while their text (one U+FFFC) didn't.
  private func changedTableRanges(from old: EditorDocument, to new: EditorDocument) -> [NSRange] {
    new.paragraphs.compactMap { paragraph in
      guard paragraph.kind == .table,
        old.paragraph(containing: paragraph.start).table != paragraph.table
      else { return nil }
      return NSRange(location: paragraph.start, length: paragraph.end - paragraph.start)
    }
  }

  /// Lays out and redraws ranges whose drawing changed when their attributes may not have.
  private func invalidateLayout(of ranges: [NSRange]) {
    guard let layoutManager = textView.textLayoutManager, !ranges.isEmpty else { return }
    let contentManager = textView.contentStorage
    for range in ranges {
      guard
        let start = contentManager.location(
          contentManager.documentRange.location, offsetBy: range.location),
        let end = contentManager.location(start, offsetBy: range.length),
        let textRange = NSTextRange(location: start, end: end)
      else { continue }
      layoutManager.invalidateLayout(for: textRange)
    }
    textView.setNeedsLayout()
    reportLayout()
  }

  private func select(_ range: NSRange) {
    let target = clamped(range)
    guard target != textView.selectedRange else { return }
    isApplying = true
    textView.selectedRange = target
    isApplying = false
    afterProgrammaticChange()
  }

  private func afterProgrammaticChange() {
    updateContentInsets()
    if textView.markedTextRange == nil {
      updateTypingAttributes()
    }
    updatePlaceholder()
    reportLayout()
  }

  private func applyDeferredContentIfReady() {
    guard let deferred = deferredContent, textView.markedTextRange == nil else { return }
    deferredContent = nil
    apply(deferred.document, selection: deferred.selection)
  }

  private func clamped(_ range: NSRange) -> NSRange {
    let length = textView.textStorage.length
    let start = min(max(range.location, 0), length)
    return NSRange(location: start, length: min(max(range.length, 0), length - start))
  }

  private func updateTypingAttributes() {
    textView.typingAttributes = styler.typingAttributes(
      in: document, at: textView.selectedRange.location)
  }

  // MARK: Editing

  private enum StructuralInput: String {
    case split
    case softBreak
    case deleteBackward
    case deleteForward
  }

  private func reportStructuralInput(_ kind: StructuralInput, range: NSRange? = nil) {
    let range = range ?? textView.selectedRange
    onEditorInput([
      "kind": kind.rawValue, "from": range.location, "to": NSMaxRange(range),
    ])
  }

  func textView(
    _ textView: UITextView, shouldChangeTextIn range: NSRange, replacementText text: String
  ) -> Bool {
    if isApplying { return true }
    // Compositions, dictation and marked text are never cancelled.
    if textView.markedTextRange == nil {
      if text == "\n" {
        let paragraph = document.paragraph(containing: range.location)
        reportStructuralInput(paragraph.kind == .code ? .softBreak : .split, range: range)
        return false
      }
      if text.isEmpty, range.length > 0,
        (textView.textStorage.string as NSString).substring(with: range).contains("\n")
      {
        let selection = textView.selectedRange
        let isForward =
          !self.textView.isDeletingBackward && selection.length == 0
          && range.location == selection.location
        reportStructuralInput(isForward ? .deleteForward : .deleteBackward, range: range)
        return false
      }
    }
    pendingEdit = (range, text)
    return true
  }

  func textViewDidChange(_ textView: UITextView) {
    guard !isApplying else { return }
    let current = textView.textStorage.string
    let edit = resolveEdit(from: document.text, to: current, hint: pendingEdit)
    pendingEdit = nil
    document = document.replacing(
      from: edit.from, to: edit.to, with: edit.text, resultingText: current)
    reportedTexts.append(current)
    if reportedTexts.count > 64 { reportedTexts.removeFirst() }
    let selection = textView.selectedRange
    let isComposing = textView.markedTextRange != nil
    onTextReplace([
      "from": edit.from,
      "to": edit.to,
      "text": edit.text,
      "selectionStart": selection.location,
      "selectionEnd": NSMaxRange(selection),
      "isComposing": isComposing,
    ])
    updatePlaceholder()
    reportLayout()
  }

  func textViewDidChangeSelection(_ textView: UITextView) {
    guard !isApplying else { return }
    if deferredContent != nil, textView.markedTextRange == nil {
      applyDeferredContentIfReady()
      return
    }
    if textView.markedTextRange == nil {
      updateTypingAttributes()
    }
    // During an edit the selection rides along with onTextReplace.
    if pendingEdit == nil {
      let selection = textView.selectedRange
      onSelectionChange(["start": selection.location, "end": NSMaxRange(selection)])
    }
    reportCaret()
  }

  func textViewDidBeginEditing(_ textView: UITextView) {
    // A caret placed where the selection already was reports no change, so
    // JS hears where it is now, or it has none until the first move.
    let selection = textView.selectedRange
    onSelectionChange(["start": selection.location, "end": NSMaxRange(selection)])
    onEditorFocus([:])
  }

  func textViewDidEndEditing(_ textView: UITextView) {
    applyDeferredContentIfReady()
    onEditorBlur([:])
  }

  func scrollViewDidScroll(_ scrollView: UIScrollView) {
    if decorationControlProvider != nil { setNeedsLayout() }
    reportCaret()
  }

  /// The replaced range of `previous` and its replacement. Trusts UIKit's
  /// announced edit when it explains the change; otherwise (marked text,
  /// dictation) diffs the two strings.
  private func resolveEdit(
    from previous: String, to current: String, hint: (range: NSRange, text: String)?
  ) -> (from: Int, to: Int, text: String) {
    let before = previous as NSString
    if let hint, NSMaxRange(hint.range) <= before.length,
      before.replacingCharacters(in: hint.range, with: hint.text) == current
    {
      return (hint.range.location, NSMaxRange(hint.range), hint.text)
    }
    let old = Array(previous.utf16)
    let new = Array(current.utf16)
    let shorter = min(old.count, new.count)
    var prefix = 0
    while prefix < shorter && old[prefix] == new[prefix] { prefix += 1 }
    // Never split a surrogate pair.
    if prefix > 0 && UTF16.isLeadSurrogate(old[prefix - 1]) && prefix < shorter { prefix -= 1 }
    var suffix = 0
    while suffix < shorter - prefix
      && old[old.count - 1 - suffix] == new[new.count - 1 - suffix]
    {
      suffix += 1
    }
    if suffix > 0 && UTF16.isTrailSurrogate(old[old.count - suffix]) { suffix -= 1 }
    let inserted = (current as NSString).substring(
      with: NSRange(location: prefix, length: new.count - suffix - prefix))
    return (prefix, old.count - suffix, inserted)
  }

  // MARK: Tasks and blocks

  func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldReceive touch: UITouch)
    -> Bool
  {
    guard gestureRecognizer === decorationTap else { return true }
    if let touched = touch.view, decorationControls.values.contains(where: { touched.isDescendant(of: $0) }) { return false }
    let point = touch.location(in: textView)
    return taskParagraphStart(at: point) != nil || codeControl(at: point) != nil
      || blockParagraph(at: point) != nil
  }

  func gestureRecognizer(
    _ gestureRecognizer: UIGestureRecognizer,
    shouldBeRequiredToFailBy otherGestureRecognizer: UIGestureRecognizer
  ) -> Bool {
    // A tap on a checkbox or a block wins over the text view's own taps, so the caret stays put.
    gestureRecognizer === decorationTap
  }

  @objc private func handleDecorationTap(_ recognizer: UITapGestureRecognizer) {
    guard recognizer.state == .ended else { return }
    let point = recognizer.location(in: textView)
    if let start = taskParagraphStart(at: point) {
      guard textView.isEditable else { return }
      onTaskToggle(["paragraphStart": start])
    } else if let control = codeControl(at: point) {
      guard textView.isEditable || control.kind == "code-copy" else { return }
      onBlockPress(["paragraphStart": control.start, "kind": control.kind])
    } else if let paragraph = blockParagraph(at: point) {
      guard textView.isEditable else { return }
      onBlockPress(["paragraphStart": paragraph.start, "kind": paragraph.kind.rawValue])
    }
  }

  /// The code block whose language or Copy is under a point of the text view,
  /// and which: "code-language" or "code-copy".
  private func codeControl(at point: CGPoint) -> (start: Int, kind: String)? {
    guard let layoutManager = textView.textLayoutManager else { return nil }
    let inset = textView.textContainerInset
    let containerPoint = CGPoint(x: point.x - inset.left, y: point.y - inset.top)
    // The strip sits above the block's lines, in its paragraph spacing, which
    // may be read as the fragment above, so the one below is asked too.
    let candidates = [containerPoint, CGPoint(x: containerPoint.x, y: containerPoint.y + theme.codeStyle.headerHeight + theme.codeStyle.paddingY)]
    for candidate in candidates {
      guard let fragment = layoutManager.textLayoutFragment(for: candidate)
        as? EditorLayoutFragment,
        let decoration = fragment.decoration,
        decoration.paragraph.kind == .code,
        let lines = fragment.lineBounds(decoration)
      else { continue }
      let frame = fragment.layoutFragmentFrame
      let block = EditorLayoutFragment.codeBlockRect(
        decoration, first: lines.first, last: lines.last, left: -frame.minX
      ).offsetBy(dx: frame.minX, dy: frame.minY)
      let chrome = EditorCodeChrome(decoration: decoration, block: block)
      // Only within the strip: a tap on the code still places the caret.
      let strip = CGRect(
        x: block.minX, y: block.minY, width: block.width, height: decoration.metrics.headerHeight)
      guard strip.contains(containerPoint) else { continue }
      let start = decoration.paragraph.start
      if decorationControlProvider == nil, chrome.copyRect.insetBy(dx: -15, dy: -15).contains(containerPoint) {
        return (start, "code-copy")
      }
      if let language = chrome.languageRect, language.insetBy(dx: -8, dy: -15).contains(containerPoint) {
        return (start, "code-language")
      }
    }
    return nil
  }

  private func layoutDecorationControls() {
    guard !isLayingOutControls, let provider = decorationControlProvider, let layoutManager = textView.textLayoutManager else { return }
    isLayingOutControls = true
    defer { isLayingOutControls = false }
    let inset = textView.textContainerInset
    // A restyled fragment can exist before its document position is resolved.
    layoutManager.ensureLayout(for: textView.bounds.offsetBy(dx: -inset.left, dy: -inset.top))
    let paragraphs = document.paragraphs.filter { $0.kind == .code || $0.kind == .task }
    let starts = Set(paragraphs.map(\.start))
    for start in decorationControls.keys.filter({ !starts.contains($0) }) {
      decorationControls.removeValue(forKey: start)?.removeFromSuperview()
    }
    var visible: Set<Int> = []
    let storage = textView.contentStorage
    for paragraph in paragraphs {
      guard let location = storage.location(storage.documentRange.location, offsetBy: paragraph.start),
        let fragment = layoutManager.textLayoutFragment(for: location) as? EditorLayoutFragment,
        fragment.state == .layoutAvailable,
        let decoration = fragment.decoration, let lines = fragment.lineBounds(decoration)
      else { continue }
      let frame = fragment.layoutFragmentFrame
      let artwork: CGRect
      if paragraph.kind == .code {
        let block = EditorLayoutFragment.codeBlockRect(decoration, first: lines.first, last: lines.last, left: -frame.minX)
        artwork = EditorCodeChrome(decoration: decoration, block: block).copyRect
      } else {
        artwork = EditorLayoutFragment.checkboxRect(decoration, firstLine: lines.first, left: -frame.minX)
      }
      let center = CGPoint(x: artwork.midX + frame.minX + inset.left, y: artwork.midY + frame.minY + inset.top)
      let side = max(decorationControlSize, artwork.width, artwork.height)
      let controlFrame = CGRect(x: center.x - side / 2, y: center.y - side / 2, width: side, height: side)
      guard controlFrame.intersects(textView.bounds) else { continue }
      let source = (document.text as NSString).substring(with: NSRange(location: paragraph.start, length: paragraph.end - paragraph.start))
      guard let control = provider(paragraph, source) else { continue }
      let host: EditorDecorationControlHost
      if let current = decorationControls[paragraph.start] { host = current }
      else {
        host = EditorDecorationControlHost()
        decorationControls[paragraph.start] = host
        textView.addSubview(host)
      }
      host.frame = controlFrame
      host.receiveControl(control)
      host.hitBounds = host.bounds
      if paragraph.kind == .task {
        // The expanded checkbox target stops where editable text begins.
        host.hitBounds.size.width = min(side, max(0, decoration.metrics.leadingIndent + inset.left - controlFrame.minX))
      }
      host.isHidden = false
      textView.bringSubviewToFront(host)
      visible.insert(paragraph.start)
    }
    for (start, host) in decorationControls where !visible.contains(start) { host.isHidden = true }
  }

  /// The divider, image or table drawn under a point of the text view.
  private func blockParagraph(at point: CGPoint) -> EditorParagraph? {
    guard let layoutManager = textView.textLayoutManager else { return nil }
    let inset = textView.textContainerInset
    let containerPoint = CGPoint(x: point.x - inset.left, y: point.y - inset.top)
    guard let fragment = layoutManager.textLayoutFragment(for: containerPoint)
      as? EditorLayoutFragment,
      let decoration = fragment.decoration,
      decoration.paragraph.isBlockObject,
      let lines = fragment.lineBounds(decoration)
    else { return nil }
    let frame = fragment.layoutFragmentFrame
    let top = frame.minY + lines.first.minY
    // A divider is a hairline: its whole line is the target.
    return containerPoint.y >= top && containerPoint.y <= top + lines.first.height
      ? decoration.paragraph : nil
  }

  /// The start of the task whose checkbox is under a point of the text view.
  private func taskParagraphStart(at point: CGPoint) -> Int? {
    guard decorationControlProvider == nil else { return nil }
    guard let layoutManager = textView.textLayoutManager else { return nil }
    let inset = textView.textContainerInset
    let containerPoint = CGPoint(x: point.x - inset.left, y: point.y - inset.top)
    guard let fragment = layoutManager.textLayoutFragment(for: containerPoint)
      as? EditorLayoutFragment,
      let decoration = fragment.decoration,
      decoration.paragraph.kind == .task,
      let lines = fragment.lineBounds(decoration)
    else { return nil }
    let frame = fragment.layoutFragmentFrame
    let box = EditorLayoutFragment.checkboxRect(decoration, firstLine: lines.first, left: -frame.minX)
      .offsetBy(dx: frame.minX, dy: frame.minY)
    // A 44pt target, not past the text.
    let target = box.insetBy(
      dx: -max(0, (44 - box.width) / 2), dy: -max(0, (44 - box.height) / 2))
    let reach = CGRect(
      x: target.minX, y: target.minY,
      width: min(target.width, frame.minX + decoration.metrics.leadingIndent - target.minX),
      height: target.height)
    return reach.contains(containerPoint) ? decoration.paragraph.start : nil
  }

  // MARK: Layout reports

  private func reportLayout() {
    reportContentHeight()
    reportCaret()
  }

  private func reportContentHeight() {
    guard !isScrollEnabled, bounds.width > 0 else { return }
    // Without scrolling the text container is only as tall as the view, so its
    // usage bounds stop at the view's edge; sizeThatFits measures it unbounded.
    var height = textView.sizeThatFits(
      CGSize(width: bounds.width, height: .greatestFiniteMagnitude)
    ).height
    // A code block's background reaches below its last line.
    let last = document.paragraphs[document.paragraphs.count - 1]
    let lastMetrics = styler.metrics(for: last)
    height += lastMetrics.blockPaddingY + (lastMetrics.blockPaddingY > 0 ? lastMetrics.leading / 2 : 0)
    height = ceil(height)
    guard abs(height - lastContentHeight) > 0.5 else { return }
    lastContentHeight = height
    setViewSize(CGSize(width: bounds.width, height: height))
    onContentHeight(["height": height])
  }

  private func reportCaret() {
    guard let range = textView.selectedTextRange else { return }
    let caret = textView.caretRect(for: range.end)
    guard caret.origin.x.isFinite, caret.origin.y.isFinite else { return }
    let rect = textView.convert(caret, to: self)
    guard rect != lastCaretRect else { return }
    lastCaretRect = rect
    onCaretRect([
      "x": rect.origin.x, "y": rect.origin.y, "width": rect.width, "height": rect.height,
    ])
  }

  // MARK: Placeholder

  private func updatePlaceholder() {
    let isHidden = textView.textStorage.length > 0 || (placeholderLabel.text ?? "").isEmpty
    placeholderLabel.isHidden = isHidden
    guard !isHidden else { return }
    var attributes = styler.typingAttributes(in: document, at: 0)
    attributes[.foregroundColor] = theme.placeholder
    placeholderLabel.attributedText = NSAttributedString(
      string: placeholderLabel.text ?? "", attributes: attributes)
    layoutPlaceholder()
  }

  private func layoutPlaceholder() {
    guard !placeholderLabel.isHidden else { return }
    let inset = textView.textContainerInset
    let width = max(textView.bounds.width - inset.left - inset.right, 0)
    let size = placeholderLabel.sizeThatFits(CGSize(width: width, height: .greatestFiniteMagnitude))
    placeholderLabel.frame = CGRect(x: inset.left, y: inset.top, width: width, height: size.height)
  }

  // MARK: Decorations

  func textLayoutManager(
    _ textLayoutManager: NSTextLayoutManager, textLayoutFragmentFor location: NSTextLocation,
    in textElement: NSTextElement
  ) -> NSTextLayoutFragment {
    let range = textElement.elementRange ?? NSTextRange(location: location)
    let fragment = EditorLayoutFragment(textElement: textElement, range: range)
    fragment.decorationSource = self
    return fragment
  }

  func decoration(atParagraphOffset offset: Int) -> EditorDecoration? {
    let paragraph = document.paragraph(containing: offset)
    let isText = paragraph.kind != .code && paragraph.kind != .raw
    let inlineCode =
      isText
      ? document.spans.compactMap { span -> NSRange? in
        guard span.isCode, span.start >= paragraph.start, span.end <= paragraph.end,
          span.end > span.start
        else { return nil }
        return NSRange(location: span.start - paragraph.start, length: span.end - span.start)
      } : []
    if (paragraph.kind == .paragraph || paragraph.kind == .heading) && inlineCode.isEmpty {
      return nil
    }
    let inset = textView.textContainerInset
    return EditorDecoration(
      paragraph: paragraph,
      metrics: styler.metrics(for: paragraph),
      theme: theme,
      containerWidth: max(textView.bounds.width - inset.left - inset.right, 0),
      inlineCode: inlineCode, drawsCodeCopy: decorationControlProvider == nil, drawsTaskCheckbox: decorationControlProvider == nil)
  }
}

private final class EditorDecorationControlHost: UIView {
  var hitBounds = CGRect.zero
  private var control: UIView?

  func receiveControl(_ next: UIView) {
    guard control !== next else { return }
    control?.removeFromSuperview()
    control = next
    next.frame = bounds
    next.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    addSubview(next)
  }

  override func point(inside point: CGPoint, with event: UIEvent?) -> Bool {
    hitBounds.contains(point)
  }
}

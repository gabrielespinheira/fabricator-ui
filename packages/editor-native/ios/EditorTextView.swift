import UIKit

/// The UITextView the host wraps: TextKit 2, key commands from JS, and an
/// undo manager that hands undo to JS instead of editing behind its back.
final class EditorTextView: UITextView {
  /// Fires with a key command's id from JS.
  var onKeyCommand: ((String) -> Void)?
  /// Shift+Return, unless JS registered its own command for it.
  var onSoftBreak: (() -> Void)?
  /// Backspace with the caret at the document's start.
  var onDeleteBackwardAtStart: (() -> Void)?

  /// True while Backspace (or its key) is deleting, so the delegate can tell it from Delete.
  private(set) var isDeletingBackward = false

  /// TextKit 2's storage; the layout manager only holds it weakly.
  let contentStorage = NSTextContentStorage()
  let editorUndoManager = EditorUndoManager()

  private var editorKeyCommands: [UIKeyCommand] = []
  private static let softBreakId = "\u{0}softBreak"

  init() {
    let layoutManager = NSTextLayoutManager()
    contentStorage.addTextLayoutManager(layoutManager)
    let container = NSTextContainer(size: CGSize(width: 0, height: CGFloat.greatestFiniteMagnitude))
    container.widthTracksTextView = true
    layoutManager.textContainer = container
    super.init(frame: .zero, textContainer: container)
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  // MARK: Undo

  override var undoManager: UndoManager? { editorUndoManager }

  // MARK: Deleting

  override func deleteBackward() {
    // UIKit asks nothing when there's nothing before the caret, but a heading
    // or a list item at the very start still turns back into a paragraph.
    if selectedRange == NSRange(location: 0, length: 0) && markedTextRange == nil {
      onDeleteBackwardAtStart?()
      return
    }
    isDeletingBackward = true
    defer { isDeletingBackward = false }
    super.deleteBackward()
  }

  // MARK: Key commands

  func setKeyCommands(_ records: [EditorKeyCommandRecord]) {
    var commands = records.map { record in
      Self.makeCommand(
        input: record.input, modifiers: record.modifiers, id: record.id)
    }
    let hasOwnSoftBreak = records.contains { $0.input == "enter" && $0.modifiers == ["shift"] }
    if !hasOwnSoftBreak {
      commands.append(Self.makeCommand(input: "enter", modifiers: ["shift"], id: Self.softBreakId))
    }
    editorKeyCommands = commands
  }

  override var keyCommands: [UIKeyCommand]? {
    editorKeyCommands + (super.keyCommands ?? [])
  }

  @objc private func performEditorKeyCommand(_ command: UIKeyCommand) {
    guard let id = command.propertyList as? String else { return }
    if id == Self.softBreakId {
      onSoftBreak?()
    } else {
      onKeyCommand?(id)
    }
  }

  private static func makeCommand(input: String, modifiers: [String], id: String) -> UIKeyCommand {
    let command = UIKeyCommand(
      title: "", image: nil, action: #selector(performEditorKeyCommand(_:)),
      input: keyInput(input), modifierFlags: modifierFlags(modifiers), propertyList: id)
    // Otherwise the text system takes Tab, the arrows and Return first.
    command.wantsPriorityOverSystemBehavior = true
    return command
  }

  private static func keyInput(_ input: String) -> String {
    switch input {
    case "up": return UIKeyCommand.inputUpArrow
    case "down": return UIKeyCommand.inputDownArrow
    case "left": return UIKeyCommand.inputLeftArrow
    case "right": return UIKeyCommand.inputRightArrow
    case "tab": return "\t"
    case "escape": return UIKeyCommand.inputEscape
    case "enter": return "\r"
    case "backspace": return "\u{8}"
    default: return input
    }
  }

  private static func modifierFlags(_ modifiers: [String]) -> UIKeyModifierFlags {
    modifiers.reduce(into: UIKeyModifierFlags()) { flags, modifier in
      switch modifier {
      case "command": flags.insert(.command)
      case "shift": flags.insert(.shift)
      case "alt": flags.insert(.alternate)
      case "control": flags.insert(.control)
      default: break
      }
    }
  }
}

/// Records nothing, so the text view's own undo (shake, Cmd+Z, the iPad
/// shortcuts bar) can't change the text behind JS; undo and redo go to JS.
final class EditorUndoManager: UndoManager {
  var onUndo: (() -> Void)?
  var onRedo: (() -> Void)?

  override init() {
    super.init()
    disableUndoRegistration()
  }

  // The host can't know whether JS has history, so these stay on while it listens.
  override var canUndo: Bool { onUndo != nil }
  override var canRedo: Bool { onRedo != nil }

  override func undo() { onUndo?() }
  override func redo() { onRedo?() }

  override func registerUndo(withTarget target: Any, selector: Selector, object anObject: Any?) {}
}

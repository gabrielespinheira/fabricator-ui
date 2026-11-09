import ExpoModulesCore

public final class EditorNativeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("EditorNative")

    View(EditorNativeTextView.self) {
      Events(
        "onTextReplace",
        "onEditorInput",
        "onSelectionChange",
        "onKeyCommand",
        "onCaretRect",
        "onContentHeight",
        "onTaskToggle",
        "onBlockPress",
        "onEditorFocus",
        "onEditorBlur"
      )

      // Props arrive one by one in no particular order; the view holds them
      // and applies content and selection together once all have arrived.
      Prop("content") { (view, content: EditorContentRecord) in
        view.receiveContent(content)
      }

      Prop("theme") { (view, theme: EditorThemeRecord) in
        view.receiveTheme(theme)
      }

      Prop("selection") { (view, selection: EditorSelectionRecord?) in
        view.receiveSelection(selection)
      }

      Prop("placeholder") { (view, placeholder: String?) in
        view.setPlaceholder(placeholder ?? "")
      }

      Prop("editable", true) { (view, isEditable: Bool) in
        view.setEditable(isEditable)
      }

      Prop("scrollEnabled", true) { (view, isScrollEnabled: Bool) in
        view.setScrollEnabled(isScrollEnabled)
      }

      Prop("smartPunctuation", true) { (view, isOn: Bool) in
        view.setSmartPunctuation(isOn)
      }

      Prop("keyCommands") { (view, commands: [EditorKeyCommandRecord]?) in
        view.setKeyCommands(commands ?? [])
      }

      Prop("autoFocus", false) { (view, autoFocus: Bool) in
        view.setAutoFocus(autoFocus)
      }

      OnViewDidUpdateProps { (view: EditorNativeTextView) in
        view.applyReceivedProps()
      }

      AsyncFunction("focus") { (view: EditorNativeTextView) in
        view.focusEditor()
      }.runOnQueue(.main)

      AsyncFunction("blur") { (view: EditorNativeTextView) in
        view.blurEditor()
      }.runOnQueue(.main)
    }
  }
}

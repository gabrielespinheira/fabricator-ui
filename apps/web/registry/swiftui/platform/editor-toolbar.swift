import SwiftUI

struct FabricatorEditorToolbar: View {
    @Environment(\.fabricatorTheme) private var theme
    @Bindable var state: FabricatorEditorState
    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: theme.space(4)) {
                ForEach(Array(FabricatorEditorCommandLayout.groups.enumerated()), id: \.offset) { index, ids in
                    if index > 0 { Rectangle().fill(theme.color("border").opacity(0.7)).frame(width: 1, height: theme.space(20)) }
                    HStack(spacing: 2) { ForEach(ids, id: \.self) { id in FabricatorEditorCommandButton(state: state, id: id) } }
                }
            }.padding(theme.space(4))
        }.scrollBounceBehavior(.basedOnSize).accessibilityElement(children: .contain).accessibilityLabel("Formatting")
    }
}

struct FabricatorEditorCommandButton: View {
    @Environment(\.fabricatorTheme) private var theme
    @Bindable var state: FabricatorEditorState
    var id: String
    private var command: FabricatorEditorCommandInfo? { state.snapshot.commands.first { $0.id == id } }
    var body: some View {
        if let command {
            Button { state.runCommand(id) } label: { FabricatorIcon(FabricatorEditorCommandLayout.getIcon(id), size: theme.icon(), strokeWidth: command.isActive ? 2 : 1.5) }
                .buttonStyle(FabricatorEditorCommandStyle(isActive: command.isActive))
                .accessibilityLabel(command.label).accessibilityValue(command.isActive ? "On" : "Off")
                .accessibilityAddTraits(command.isActive ? .isSelected : [])
                .help(command.label).disabled(!command.canRun)
        }
    }
}

struct FabricatorEditorKeyboardBar: View {
    @Environment(\.fabricatorTheme) private var theme
    @Bindable var state: FabricatorEditorState
    var onDismiss: () -> Void
    private var ids: [String] {
        state.selectedRange.length > 0 ? FabricatorEditorCommandLayout.selectionCommands : FabricatorEditorCommandLayout.caretCommands
    }
    var body: some View {
        HStack(spacing: 2) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 2) { ForEach(ids, id: \.self) { id in FabricatorEditorCommandButton(state: state, id: id) } }
            }.scrollBounceBehavior(.basedOnSize).accessibilityIdentifier("fabricator-editor-keyboard-commands")
            Button(action: onDismiss) { FabricatorIcon("keyboard-off", size: theme.icon()) }
                .buttonStyle(FabricatorEditorCommandStyle()).accessibilityLabel("Hide keyboard")
        }.padding(theme.space(4)).background(theme.color("surface-3"))
            .overlay(alignment: .top) { Rectangle().fill(theme.color("border").opacity(0.6)).frame(height: 1) }
            .accessibilityElement(children: .contain).accessibilityLabel("Keyboard formatting")
    }
}

struct FabricatorEditorCommandStyle: ButtonStyle {
    @Environment(\.fabricatorTheme) private var theme
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.isFocused) private var isFocused
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var isHovered = false
    var isActive = false
    var foreground: Color?
    func makeBody(configuration: Configuration) -> some View {
        let isPressed = isEnabled && configuration.isPressed
        return configuration.label
            .foregroundStyle(foreground ?? theme.color(isActive || isHovered ? "foreground" : "muted-foreground"))
            .frame(width: theme.controlHeight, height: theme.controlHeight)
            .background(isActive || isPressed ? theme.color("active") : isHovered ? theme.color("hover") : .clear, in: RoundedRectangle(cornerRadius: theme.radius()))
            .overlay { if isFocused { RoundedRectangle(cornerRadius: theme.radius()).strokeBorder(theme.color("ring"), lineWidth: 1) } }
            .opacity(isEnabled ? 1 : 0.4)
            .scaleEffect(isPressed && !reduceMotion ? theme.pressScale : 1)
            .animation(reduceMotion ? nil : theme.animation("feedback"), value: isPressed)
            .animation(reduceMotion ? nil : theme.animation("feedback"), value: isHovered)
            .animation(reduceMotion ? nil : theme.animation("feedback"), value: isActive)
            .contentShape(Rectangle())
            .padding(max(0, (theme.minimumHitSize - theme.controlHeight) / 2)).contentShape(Rectangle())
            .padding(-max(0, (theme.minimumHitSize - theme.controlHeight) / 2))
            .onHover { isHovered = $0 }.focusEffectDisabled()
    }
}

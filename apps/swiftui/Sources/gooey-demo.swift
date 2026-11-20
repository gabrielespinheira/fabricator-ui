import FabricatorUI
import SwiftUI

struct GooeyDemo: View {
    @Environment(\.fabricatorTheme) private var theme
    @State private var mode = FabricatorGooeyMode.expressive
    @State private var waviness = 35.0
    @State private var selected = "Overview"
    @State private var volume = 45.0
    @State private var morph = 0.0
    @State private var melt = 0.0

    var body: some View {
        VStack(alignment: .leading, spacing: theme.space(16)) {
            Picker("Gooey", selection: $mode) {
                Text("Off").tag(FabricatorGooeyMode.off)
                Text("Subtle").tag(FabricatorGooeyMode.subtle)
                Text("Expressive").tag(FabricatorGooeyMode.expressive)
            }.pickerStyle(.segmented)
            FabricatorSlider("Waviness", value: $waviness, gooey: .init(isEnabled: false))
            FabricatorText("Move · Tabs", role: .caption)
            FabricatorTabs(["Overview", "Activity", "Files"], selection: $selected) {
                FabricatorText(selected)
            }
            FabricatorText("Bend · Slider", role: .caption)
            FabricatorSlider("Volume", value: $volume)
            FabricatorText("Morph · Button", role: .caption)
            ZStack {
                FabricatorGooey(effect: .morph, progress: morph, fill: theme.color("muted"))
                HStack {
                    FabricatorButton("Add", variant: .ghost) {
                        withAnimation(theme.animation("move")) { morph = morph > 0 ? 0 : 1 }
                    }
                    if morph > 0 {
                        FabricatorButton("Import", variant: .ghost) { withAnimation(theme.animation("move")) { morph = 0 } }
                    }
                }
            }.frame(width: 176, height: 64)
            FabricatorText("Melt · Badge", role: .caption)
            ZStack {
                FabricatorGooey(effect: .melt, progress: melt, fill: theme.color("info-surface-4"), accentFill: theme.color("success-surface-4"))
                HStack { FabricatorBadge("Draft", variant: .outline); FabricatorBadge("Ready", variant: .outline) }
            }.frame(width: 176, height: 64)
            FabricatorButton("Blend badges", variant: .outline) {
                withAnimation(theme.animation("move")) { melt = melt > 0 ? 0 : 1 }
            }
        }.fabricatorGooey(mode, waviness: waviness / 100)
    }
}

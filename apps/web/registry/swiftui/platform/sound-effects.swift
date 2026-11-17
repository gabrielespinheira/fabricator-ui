import AVFoundation
import OSLog
import SwiftUI
#if os(iOS)
import UIKit
#else
import AppKit
#endif

@MainActor @Observable public final class FabricatorSoundEffects {
    public static let shared = FabricatorSoundEffects()
    public var isEnabled = false
    public var isHapticsEnabled = false
    public var volume: Float = 0.7
    private var players: [AVAudioPlayer] = []
    private let logger = Logger(subsystem: "app.fabricator-ui", category: "sound-effects")
    public init() {}
    public var definitions: [FabricatorSoundDefinition] { FabricatorContract.shared.sounds }
    public func play(_ name: String) {
        guard isEnabled || isHapticsEnabled else { return }
        guard let definition = definitions.first(where: { $0.name == name }) else { logger.error("Unknown Fabricator sound: \(name)"); return }
        if isHapticsEnabled { playHaptic(category: definition.category, name: name) }
        guard isEnabled else { return }
        do {
            let data = FabricatorSoundSynthesizer.encodeWav(FabricatorSoundSynthesizer.render(definition.partials, masterLevel: FabricatorContract.shared.soundMasterLevel))
            let player = try AVAudioPlayer(data: data)
            player.volume = max(0, min(1, volume)); player.prepareToPlay(); players.removeAll { !$0.isPlaying }; players.append(player); player.play()
        } catch { logger.error("Fabricator sound \(name) failed: \(error.localizedDescription)") }
    }
    private func playHaptic(category: String, name: String) {
        #if os(iOS)
        switch name {
        case "success": UINotificationFeedbackGenerator().notificationOccurred(.success)
        case "error", "deny": UINotificationFeedbackGenerator().notificationOccurred(.error)
        case "warning": UINotificationFeedbackGenerator().notificationOccurred(.warning)
        default: if category == "Selection" { UISelectionFeedbackGenerator().selectionChanged() } else { UIImpactFeedbackGenerator(style: .light).impactOccurred() }
        }
        #else
        NSHapticFeedbackManager.defaultPerformer.perform(category == "Selection" ? .levelChange : .alignment, performanceTime: .now)
        #endif
    }
}

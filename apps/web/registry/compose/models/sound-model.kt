package dev.fabricator.ui

import kotlin.math.PI
import kotlin.math.exp
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin
import kotlin.math.tanh

data class FabricatorSoundPartial(val wave: String, val frequency: Float, val lengthMilliseconds: Float, val gain: Float, val endFrequency: Float, val startMilliseconds: Float, val attackMilliseconds: Float, val lowpass: Float)
data class FabricatorSoundRecipe(val name: String, val description: String, val partials: List<FabricatorSoundPartial>)

/** PCM generation consumes the same oscillator recipes as the web audio adapter. */
fun synthesizeFabricatorSound(recipe: FabricatorSoundRecipe, masterLevel: Float, sampleRate: Int = 44100): ShortArray {
    require(masterLevel in 0f..1f)
    val duration = recipe.partials.maxOfOrNull { it.startMilliseconds + it.lengthMilliseconds } ?: 0f
    val samples = FloatArray((duration / 1000 * sampleRate).toInt() + 1)
    var noise = 17L
    for (partial in recipe.partials) {
        val length = max(1, (partial.lengthMilliseconds / 1000 * sampleRate).toInt())
        val start = (partial.startMilliseconds / 1000 * sampleRate).toInt()
        val attack = max(1f, partial.attackMilliseconds / 1000 * sampleRate)
        var phase = 0.0
        var filtered = 0f
        val lowpass = (1 - exp(-2 * PI * partial.lowpass / sampleRate)).toFloat()
        for (index in 0 until length) {
            val progress = index.toFloat() / length
            val frequency = partial.frequency + (partial.endFrequency - partial.frequency) * progress
            phase += frequency / sampleRate
            noise = (noise * 1103515245 + 12345) and 0x7fffffff
            val wave = when (partial.wave) {
                "sine" -> sin(phase * 2 * PI).toFloat()
                "triangle" -> (2 / PI * kotlin.math.asin(sin(phase * 2 * PI))).toFloat()
                "square" -> if (sin(phase * 2 * PI) >= 0) 1f else -1f
                "sawtooth" -> (2 * (phase - kotlin.math.floor(phase)) - 1).toFloat()
                "noise" -> noise.toFloat() / 0x7fffffff * 2 - 1
                else -> error("Unsupported Fabricator oscillator: ${partial.wave}")
            }
            filtered += lowpass * (wave - filtered)
            val envelope = min(1f, index / attack) * (1f - progress) * (1f - progress)
            if (start + index < samples.size) samples[start + index] += filtered * envelope * partial.gain
        }
    }
    return ShortArray(samples.size) { (tanh(samples[it].toDouble()) * masterLevel * Short.MAX_VALUE).toInt().toShort() }
}

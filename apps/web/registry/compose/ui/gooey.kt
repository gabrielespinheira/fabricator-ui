package dev.fabricator.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.MotionDurationScale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import dev.fabricator.ui.generated.FabricatorGenerated
import kotlin.math.sin
import kotlinx.coroutines.currentCoroutineContext

enum class FabricatorGooeyEffect(val key: String) { Move("move"), Morph("morph"), Bend("bend"), Melt("melt") }
enum class FabricatorGooeyMode { Off, Subtle, Expressive }
enum class FabricatorGooeyDirection { Right, Left, Down, Up }

data class FabricatorGooeyOptions(
    val effect: FabricatorGooeyEffect? = null,
    val intensity: Float? = null,
    val waviness: Float? = null,
    val isEnabled: Boolean = true,
)

private data class GooeySettings(val mode: FabricatorGooeyMode, val waviness: Float?)
private val LocalGooey = compositionLocalOf<GooeySettings?> { null }

@Composable
fun FabricatorGooeyProvider(mode: FabricatorGooeyMode, waviness: Float? = null, content: @Composable () -> Unit) {
    val parent = LocalGooey.current
    val resolvedMode = if (parent?.mode == FabricatorGooeyMode.Off) FabricatorGooeyMode.Off else mode
    CompositionLocalProvider(LocalGooey provides GooeySettings(resolvedMode, waviness ?: parent?.waviness), content = content)
}

private fun clampUnit(value: Float) = if (value.isFinite()) value.coerceIn(0f, 1f) else 0f

private fun getGooeyPath(effect: FabricatorGooeyEffect, amount: Float, waviness: Float, direction: FabricatorGooeyDirection, origin: Offset, size: Size): Path {
    val resting = FabricatorGenerated.gooeyResting
    val target = FabricatorGenerated.gooeyEffects.getValue(effect.key)
    val ripple = 4f * amount * clampUnit(waviness)
    fun point(index: Int): Offset {
        val startX = resting[index]
        val startY = resting[index + 1]
        val x = startX + (target[index] - startX) * amount
        val y = startY + (target[index + 1] - startY) * amount + sin(startX * 0.13f + startY * 0.18f) * ripple
        val (px, py) = when (direction) {
            FabricatorGooeyDirection.Right -> x to y
            FabricatorGooeyDirection.Left -> 100f - x to y
            FabricatorGooeyDirection.Down -> 100f - y * 2.5f to x * 0.4f
            FabricatorGooeyDirection.Up -> y * 2.5f to 40f - x * 0.4f
        }
        return Offset(origin.x + size.width * (px + 30f) / 160f, origin.y + size.height * (py + 16f) / 72f)
    }
    return Path().apply {
        val start = point(0)
        moveTo(start.x, start.y)
        for (index in 2 until resting.size step 6) {
            val first = point(index)
            val second = point(index + 2)
            val end = point(index + 4)
            cubicTo(first.x, first.y, second.x, second.y, end.x, end.y)
        }
        close()
    }
}

@Composable
fun FabricatorGooey(
    modifier: Modifier = Modifier,
    effect: FabricatorGooeyEffect = FabricatorGooeyEffect.Move,
    progress: Float = 0f,
    intensity: Float? = null,
    waviness: Float? = null,
    direction: FabricatorGooeyDirection = FabricatorGooeyDirection.Right,
    fill: Color = LocalFabricatorTheme.current.color("primary"),
    accentFill: Color? = null,
) {
    val settings = LocalGooey.current
    val theme = LocalFabricatorTheme.current
    val motionScale = rememberCoroutineScope().coroutineContext[MotionDurationScale]?.scaleFactor
    val amount = if (settings?.mode == FabricatorGooeyMode.Off || theme.duration("move") <= 0 || motionScale == 0f) 0f else clampUnit(progress) * clampUnit(intensity ?: defaultIntensity(settings?.mode))
    val waves = waviness ?: settings?.waviness ?: FabricatorGenerated.gooeyWaviness
    Canvas(modifier) {
        val path = getGooeyPath(effect, amount, waves, direction, Offset.Zero, size)
        if (effect == FabricatorGooeyEffect.Melt && accentFill != null && amount > 0f) {
            val (start, end) = when (direction) {
                FabricatorGooeyDirection.Right -> Offset(0f, size.height / 4) to Offset(size.width, size.height * .75f)
                FabricatorGooeyDirection.Left -> Offset(size.width, size.height / 4) to Offset(0f, size.height * .75f)
                FabricatorGooeyDirection.Down -> Offset(size.width * .75f, 0f) to Offset(size.width / 4, size.height)
                FabricatorGooeyDirection.Up -> Offset(size.width / 4, size.height) to Offset(size.width * .75f, 0f)
            }
            drawPath(path, Brush.linearGradient(.25f to fill, .75f to accentFill, start = start, end = end))
        } else drawPath(path, fill)
    }
}

private fun defaultIntensity(mode: FabricatorGooeyMode?) = if (mode == FabricatorGooeyMode.Expressive) FabricatorGenerated.gooeyExpressive else FabricatorGenerated.gooeySubtle

internal class GooeyPulse(
    private val progress: Animatable<Float, *>,
    private val direction: () -> FabricatorGooeyDirection,
    private val effect: FabricatorGooeyEffect,
    private val intensity: Float,
    private val waviness: Float,
) {
    fun draw(scope: DrawScope, fill: Color, origin: Offset, body: Size) = with(scope) {
        val value = progress.value
        if (value <= 0f) return@with
        val path = getGooeyPath(effect, value * intensity, waviness, direction(), origin - Offset(body.width * .30f, body.height * .40f), Size(body.width * 1.60f, body.height * 1.80f))
        drawPath(path, fill, alpha = (value * 2).coerceAtMost(1f))
    }
}

@Composable
internal fun rememberGooeyPulse(value: Float, options: FabricatorGooeyOptions?, effect: FabricatorGooeyEffect, isEnabled: Boolean = true): GooeyPulse? {
    val settings = LocalGooey.current
    val theme = LocalFabricatorTheme.current
    val duration = theme.duration("move")
    if ((settings == null && options == null) || !isEnabled || options?.isEnabled == false || settings?.mode == FabricatorGooeyMode.Off || duration <= 0) return null
    val progress = remember { Animatable(0f) }
    val lastValue = remember { mutableFloatStateOf(value) }
    val isForward = remember { mutableFloatStateOf(1f) }
    val isRightToLeft = LocalLayoutDirection.current == LayoutDirection.Rtl
    LaunchedEffect(value, duration, isRightToLeft) {
        val previous = lastValue.floatValue
        lastValue.floatValue = value
        if (previous == value || currentCoroutineContext()[MotionDurationScale]?.scaleFactor == 0f) return@LaunchedEffect
        isForward.floatValue = if ((value > previous) != isRightToLeft) 1f else -1f
        progress.snapTo(1f)
        progress.animateTo(0f, tween(duration, easing = theme.easing("move")))
    }
    return GooeyPulse(progress, { if (isForward.floatValue > 0) FabricatorGooeyDirection.Right else FabricatorGooeyDirection.Left }, options?.effect ?: effect, clampUnit(options?.intensity ?: defaultIntensity(settings?.mode)), options?.waviness ?: settings?.waviness ?: FabricatorGenerated.gooeyWaviness)
}

package dev.fabricator.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.MotionDurationScale
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.platform.LocalWindowInfo
import androidx.compose.ui.semantics.ProgressBarRangeInfo
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.progressBarRangeInfo
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import dev.fabricator.ui.generated.FabricatorGenerated
import dev.fabricator.ui.generated.FabricatorSpinnerVariant

@Composable
fun FabricatorSpinner(modifier: Modifier = Modifier, color: Color = LocalFabricatorTheme.current.color("foreground"), variant: FabricatorSpinnerVariant = FabricatorSpinnerVariant.Orbit, speed: Float = 1f, animated: Boolean = true, size: Dp = LocalFabricatorTheme.current.icon()) {
    val theme = LocalFabricatorTheme.current
    val active = LocalWindowInfo.current.isWindowFocused
    var clock by remember { mutableFloatStateOf(0f) }
    var isAnimated by remember { mutableStateOf(false) }
    val definition = remember(variant) { FabricatorGenerated.spinners.first { it.value == variant.key } }
    val duration = FabricatorGenerated.spinnerDurationMilliseconds / if (speed.isFinite() && speed > 0) speed else 1f
    LaunchedEffect(active, animated, theme.motion, duration) {
        if (!active || !animated || theme.motion == FabricatorMotion.Off) { isAnimated = false; clock = 0f; return@LaunchedEffect }
        var start = withFrameNanos { it }
        while (true) withFrameNanos { time ->
            if (coroutineContext[MotionDurationScale]?.scaleFactor == 0f) { isAnimated = false; clock = 0f; start = time }
            else { isAnimated = true; clock = ((time - start) / 1e6 / duration % 1).toFloat() }
        }
    }
    Canvas(modifier.size(size).semantics { contentDescription = "Loading"; progressBarRangeInfo = ProgressBarRangeInfo.Indeterminate }) {
        scale(this.size.width / 24, this.size.height / 24, Offset.Zero) {
            if (variant == FabricatorSpinnerVariant.Ring) {
                rotate(if (isAnimated) clock * 360 else 0f, Offset(12f, 12f)) { drawCircle(color.copy(alpha = color.alpha * .16f), 9f, Offset(12f, 12f), style = Stroke(2f)); drawArc(color, -90f, 90f, false, Offset(3f, 3f), Size(18f, 18f), style = Stroke(2f, cap = StrokeCap.Round)) }
            } else definition.dots.forEach { dot ->
                val frame = sampleFabricatorSpinner(definition.motion, (clock + dot.phase) % 1)
                val alpha = dot.opacity * if (isAnimated) frame.opacity else .3f + dot.phase * .6f
                val center = Offset(dot.x + if (isAnimated) frame.translateX * dot.travelX else 0f, dot.y + if (isAnimated) frame.translateY * dot.travelY else 0f)
                translate(center.x, center.y) {
                    rotate(if (isAnimated) frame.rotation else 0f, Offset.Zero) {
                        scale(if (isAnimated) frame.scaleX else 1f, if (isAnimated) frame.scaleY else 1f, Offset.Zero) {
                            val fill = color.copy(alpha = color.alpha * alpha)
                            val origin = Offset(-dot.width / 2, -dot.height / 2)
                            when (dot.shape) {
                                "circle" -> drawOval(fill, origin, Size(dot.width, dot.height))
                                "square" -> drawRoundRect(fill, origin, Size(dot.width, dot.height), CornerRadius(.6f))
                                "triangle", "hexagon" -> {
                                    val coordinates = if (dot.shape == "triangle") listOf(Offset(.5f, 0f), Offset(1f, 1f), Offset(0f, 1f)) else listOf(Offset(.5f, 0f), Offset(1f, .25f), Offset(1f, .75f), Offset(.5f, 1f), Offset(0f, .75f), Offset(0f, .25f))
                                    val path = Path().apply { coordinates.forEachIndexed { index, point -> val x = point.x * dot.width + origin.x; val y = point.y * dot.height + origin.y; if (index == 0) moveTo(x, y) else lineTo(x, y) }; close() }
                                    drawPath(path, fill)
                                }
                                else -> error("Unsupported canonical spinner shape: ${dot.shape}")
                            }
                        }
                    }
                }
            }
        }
    }
}

package dev.fabricator.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.MotionDurationScale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalWindowInfo
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import dev.fabricator.ui.resources.Res
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.max
import kotlin.random.Random

enum class FabricatorBotFaceState(val key: String) { Idle("idle"), Listening("listening"), Thinking("thinking"), Working("working"), Speaking("speaking"), Happy("happy"), Sad("sad"), Questioning("questioning"), AwaitingPermission("awaiting-permission"), Error("error") }
enum class FabricatorBotFaceShape(val key: String) { Circle("circle"), Blob("blob"), Square("square"), Star("star"), Clover("clover"), Heart("heart"), Flower("flower"), Droplet("droplet"), Pill("pill"), Triangle("triangle"), Pentagon("pentagon"), Burst("burst"), Hexagon("hexagon"), Squircle("squircle") }
enum class FabricatorBotFaceEyes(val key: String) { Slant("slant"), Dots("dots"), Square("square") }
private var cachedBotFace: FabricatorBotFaceData? = null

@Composable
fun FabricatorBotFace(
    state: FabricatorBotFaceState = FabricatorBotFaceState.Idle,
    modifier: Modifier = Modifier, shape: FabricatorBotFaceShape = FabricatorBotFaceShape.Squircle,
    eyes: FabricatorBotFaceEyes = FabricatorBotFaceEyes.Slant,
    color: String = "primary", size: Dp = 80.dp, animated: Boolean = true, blink: Boolean = true,
) {
    val theme = LocalFabricatorTheme.current
    val active = LocalWindowInfo.current.isWindowFocused
    var contract by remember { mutableStateOf(cachedBotFace) }
    var elapsed by remember(state) { mutableDoubleStateOf(0.0) }
    var gaze by remember { mutableStateOf(Offset.Zero) }
    val phase = remember { Random.nextInt(4700) }
    LaunchedEffect(Unit) { if (contract == null) { val loaded = decodeFabricatorBotFace(Res.readBytes("files/fabricator-bot-face.bin")); cachedBotFace = loaded; contract = loaded } }
    LaunchedEffect(active, animated, theme.motion, state) {
        if (!active || !animated || theme.motion == FabricatorMotion.Off || coroutineContext[MotionDurationScale]?.scaleFactor == 0f) { elapsed = 0.0; return@LaunchedEffect }
        val start = withFrameNanos { it }
        while (true) withFrameNanos { elapsed = (it - start) / 1e9 }
    }
    val data = contract ?: return
    val frames = data.frames.getValue(state.key).getValue(eyes.key)
    val frame = interpolateFabricatorBotFace(frames, elapsed, data.framesPerSecond)
    val fill = if (color.startsWith('#')) parseFabricatorColor(color) else theme.color("bot-face-$color-fill")
    val eyeColor = if (color.startsWith('#')) theme.color(if (fill.luminance() > .4f) "primary" else "primary-foreground") else theme.color("bot-face-$color-eyes")
    val phaseTime = ((elapsed * 1000 + phase) % 4700).toFloat()
    val opening = if (!blink || !animated || theme.motion == FabricatorMotion.Off || phaseTime < 3200 || phaseTime > 3380 || state == FabricatorBotFaceState.Speaking || state == FabricatorBotFaceState.Error) 1f else max(.08f, abs(phaseTime - 3280) / if (phaseTime < 3280) 80 else 100)
    Canvas(modifier.size(size).semantics { contentDescription = "Assistant ${state.key}" }.pointerInput(Unit) {
        awaitPointerEventScope { while (true) { val event = awaitPointerEvent(); val point = event.changes.lastOrNull()?.position; gaze = if (point == null) Offset.Zero else Offset(((point.x - this.size.width / 2) / (this.size.width * 1.5f)).coerceIn(-1f, 1f), ((point.y - this.size.height / 2) / (this.size.height * 1.5f)).coerceIn(-1f, 1f)) } }
    }) {
        scale(this.size.width / 100, this.size.height / 100, Offset.Zero) {
            rotate(frame.tilt, Offset(50f, 50f)) {
                scale(cos(frame.yaw * PI / 180).toFloat(), cos(frame.pitch * PI / 180).toFloat(), Offset(50f, 50f)) {
                    drawPath(PathParser().parsePathString(data.shapes.getValue(shape.key)).toPath(), fill)
                    translate((gaze.x + frame.gazeX) * 6, (gaze.y + frame.gazeY) * 6) {
                        scale(1f, opening, Offset(50f, 50f)) {
                            (frame.left + frame.right).forEach { contour ->
                                val path = Path().apply { moveTo(contour[0], contour[1]); for (index in 2..contour.size - 6 step 6) cubicTo(contour[index], contour[index + 1], contour[index + 2], contour[index + 3], contour[index + 4], contour[index + 5]); close() }
                                drawPath(path, eyeColor)
                            }
                        }
                    }
                }
            }
        }
    }
}

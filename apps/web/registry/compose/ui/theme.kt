package dev.fabricator.ui

import androidx.compose.foundation.background
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.Easing
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.fabricator.ui.generated.FabricatorGenerated

enum class FabricatorDensity(val key: String) { Compact("compact"), Default("default"), Spacious("spacious") }
enum class FabricatorMotion(val key: String) { Smooth("smooth"), Default("default"), Snappy("snappy"), Instant("instant"), Off("off") }
enum class FabricatorVariant { Default, Secondary, Outline, Ghost, Destructive, Link }
enum class FabricatorSize { ExtraSmall, Small, Default, Large, Icon }
enum class FabricatorRole(val key: String) { Primary("primary"), Secondary("secondary"), Info("info"), Success("success"), Warning("warning"), Destructive("destructive") }
data class FabricatorDensityValues(val space: Map<String, Float>, val text: Map<String, Float>, val icon: Map<String, Float>)
data class FabricatorEasingValues(val x1: Float, val y1: Float, val x2: Float, val y2: Float)
private val parsedLightColors by lazy { FabricatorGenerated.lightColors.mapValues { parseFabricatorColor(it.value) } }
private val parsedDarkColors by lazy { FabricatorGenerated.darkColors.mapValues { parseFabricatorColor(it.value) } }

data class FabricatorThemeValues(
    val isDark: Boolean,
    val density: FabricatorDensity = FabricatorDensity.Default,
    val motion: FabricatorMotion = FabricatorMotion.Default,
    val fontFamily: FontFamily = FontFamily.SansSerif,
    val radiusScale: Float = 1f,
    val colorOverrides: Map<String, Color> = emptyMap(),
) {
    private val colors get() = if (isDark) parsedDarkColors else parsedLightColors
    private val sizes get() = FabricatorGenerated.densities.getValue(density.key)
    fun color(name: String): Color = colorOverrides[name] ?: colors.getValue(name)
    fun space(step: Int): Dp = sizes.space.getValue(step.toString()).dp
    fun text(step: Int) = (sizes.text[step.toString()] ?: step.toFloat()).sp
    fun icon(step: Int = 16): Dp = sizes.icon.getValue(step.toString()).dp
    fun radius(name: String = "lg"): Dp = (FabricatorGenerated.radius.getValue(name) * radiusScale).dp
    fun duration(role: String = "feedback"): Int = if (motion == FabricatorMotion.Off) 0 else FabricatorGenerated.durations.getValue(motion.key).getValue(role)
    fun pressScale(): Float = if (motion == FabricatorMotion.Off) 1f else FabricatorGenerated.pressScales.getValue(motion.key)
    fun easing(role: String = "feedback"): Easing {
        val values = FabricatorGenerated.easings.getValue(if (motion == FabricatorMotion.Off) FabricatorMotion.Default.key else motion.key).getValue(role)
        return CubicBezierEasing(values.x1, values.y1, values.x2, values.y2)
    }
}

val LocalFabricatorTheme = staticCompositionLocalOf<FabricatorThemeValues> { error("Wrap components in FabricatorTheme.") }

@Composable
fun FabricatorTheme(
    isDark: Boolean = false,
    density: FabricatorDensity = FabricatorDensity.Default,
    motion: FabricatorMotion = FabricatorMotion.Default,
    fontFamily: FontFamily = rememberFabricatorFont(),
    radiusScale: Float = 1f,
    colorOverrides: Map<String, Color> = emptyMap(),
    content: @Composable () -> Unit,
) {
    CompositionLocalProvider(LocalFabricatorTheme provides FabricatorThemeValues(isDark, density, motion, fontFamily, radiusScale, colorOverrides), content = content)
}

@Composable
fun FabricatorRoot(modifier: Modifier = Modifier, content: @Composable BoxScope.() -> Unit) {
    Box(modifier.fillMaxSize().background(LocalFabricatorTheme.current.color("background"))) { content() }
}

/** The generator preserves CSS alpha values. Conversion happens once at the native boundary. */
fun parseFabricatorColor(value: String): Color {
    if (value.startsWith('#')) {
        val hex = value.drop(1)
        require(hex.length == 6 || hex.length == 8) { "Unsupported native color: $value" }
        val number = hex.toLong(16)
        return Color(if (hex.length == 6) number or 0xff000000 else number)
    }
    val components = value.substringAfter('(').substringBefore(')').split(',').map { it.trim().toFloat() }
    require((value.startsWith("rgb(") && components.size == 3) || (value.startsWith("rgba(") && components.size == 4)) { "Unresolved native color: $value" }
    return Color(components[0] / 255f, components[1] / 255f, components[2] / 255f, components.getOrElse(3) { 1f })
}

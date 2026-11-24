package dev.fabricator.ui

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.semantics.*
import androidx.compose.ui.state.ToggleableState
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun FabricatorText(
    text: String, modifier: Modifier = Modifier, muted: Boolean = false,
    weight: FontWeight = FontWeight.Normal, size: Int = 13,
    color: Color? = null, textAlign: TextAlign? = null, maxLines: Int = Int.MAX_VALUE,
    overflow: TextOverflow = TextOverflow.Clip,
) {
    val theme = LocalFabricatorTheme.current
    BasicText(text, modifier, style = TextStyle(color = color ?: theme.color(if (muted) "muted-foreground" else "foreground"), fontFamily = theme.fontFamily, fontSize = theme.text(size), fontWeight = weight, textAlign = textAlign ?: TextAlign.Unspecified, lineHeight = theme.text(size) * 1.45f), maxLines = maxLines, overflow = overflow)
}

@Composable
fun FabricatorLabel(text: String, modifier: Modifier = Modifier, required: Boolean = false) {
    FabricatorText(if (required) "$text *" else text, modifier, weight = FontWeight.Medium)
}

@Composable
fun FabricatorButton(
    onClick: () -> Unit, modifier: Modifier = Modifier,
    variant: FabricatorVariant = FabricatorVariant.Default, size: FabricatorSize = FabricatorSize.Default,
    enabled: Boolean = true, isLoading: Boolean = false,
    content: @Composable RowScope.() -> Unit,
) {
    val inheritedTheme = LocalFabricatorTheme.current
    val theme = inheritedTheme.copy(density = when (size) { FabricatorSize.Small -> FabricatorDensity.Compact; FabricatorSize.Large -> FabricatorDensity.Spacious; else -> inheritedTheme.density })
    val source = remember { MutableInteractionSource() }
    val pressed by source.collectIsPressedAsState()
    val hovered by source.collectIsHoveredAsState()
    var focused by remember { mutableStateOf(false) }
    val background = when (variant) {
        FabricatorVariant.Default -> theme.color("primary").copy(alpha = if (pressed) .8f else if (hovered) .9f else 1f)
        FabricatorVariant.Secondary -> theme.color("secondary")
        FabricatorVariant.Destructive -> theme.color("destructive").copy(alpha = if (pressed) .2f else if (hovered) .16f else .12f)
        else -> if (pressed) theme.color("active") else if (hovered) theme.color("hover") else Color.Transparent
    }
    val foreground = when (variant) {
        FabricatorVariant.Default -> theme.color("primary-foreground")
        FabricatorVariant.Secondary -> theme.color("secondary-foreground")
        FabricatorVariant.Destructive -> theme.color("destructive-text")
        FabricatorVariant.Ghost -> theme.color(if (hovered) "foreground" else "muted-foreground")
        else -> theme.color("foreground")
    }
    val fill by animateColorAsState(background, tween(theme.duration(), easing = theme.easing()))
    val scale by animateFloatAsState(if (pressed) theme.pressScale() else 1f, tween(theme.duration(), easing = theme.easing()))
    val height = if (size == FabricatorSize.ExtraSmall) 24.dp else theme.space(36)
    val shape = RoundedCornerShape(theme.radius())
    Layout(content = {
        Row(Modifier.scale(scale).height(height).then(if (size == FabricatorSize.Icon) Modifier.width(height) else Modifier)
            .clip(shape).background(fill).border(if (focused || variant == FabricatorVariant.Outline) 1.dp else 0.dp, if (focused) theme.color("ring") else if (variant == FabricatorVariant.Outline) theme.color("border") else Color.Transparent, shape)
            .padding(horizontal = if (size == FabricatorSize.Icon) 0.dp else theme.space(16)), horizontalArrangement = Arrangement.spacedBy(theme.space(6), Alignment.CenterHorizontally), verticalAlignment = Alignment.CenterVertically) {
            CompositionLocalProvider(LocalFabricatorTheme provides theme.copy(colorOverrides = theme.colorOverrides + ("foreground" to foreground))) {
                if (isLoading) FabricatorSpinner(Modifier.size(theme.icon()), foreground) else content()
            }
        }
    }, modifier = modifier.defaultMinSize(minWidth = 48.dp, minHeight = 48.dp).alpha(if (enabled) 1f else .45f)
        .onFocusChanged { focused = it.isFocused }
        .clickable(interactionSource = source, indication = null, enabled = enabled && !isLoading, role = Role.Button, onClick = onClick)) { measurables, constraints ->
        val minimumWidth = if (constraints.minWidth > 48.dp.roundToPx()) constraints.minWidth else 0
        val visual = measurables.single().measure(constraints.copy(minWidth = minimumWidth, minHeight = 0))
        val width = maxOf(constraints.minWidth, visual.width).coerceAtMost(constraints.maxWidth)
        val height = maxOf(constraints.minHeight, visual.height).coerceAtMost(constraints.maxHeight)
        layout(width, height) { visual.placeRelative((width - visual.width) / 2, (height - visual.height) / 2) }
    }
}

@Composable
fun FabricatorButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, variant: FabricatorVariant = FabricatorVariant.Default, enabled: Boolean = true, size: FabricatorSize = FabricatorSize.Default, isLoading: Boolean = false) {
    FabricatorButton(onClick, modifier, variant, size, enabled, isLoading) { FabricatorText(text, weight = FontWeight.Medium) }
}

@Composable
fun FabricatorButtonGroup(modifier: Modifier = Modifier, content: @Composable RowScope.() -> Unit) {
    Row(modifier, horizontalArrangement = Arrangement.spacedBy(0.dp), verticalAlignment = Alignment.CenterVertically, content = content)
}

@Composable
fun FabricatorInput(
    value: String, onValueChange: (String) -> Unit, modifier: Modifier = Modifier,
    placeholder: String = "", enabled: Boolean = true, readOnly: Boolean = false,
    isInvalid: Boolean = false, isPassword: Boolean = false, singleLine: Boolean = true,
    keyboardType: KeyboardType = KeyboardType.Text,
    leading: (@Composable () -> Unit)? = null, trailing: (@Composable () -> Unit)? = null,
) {
    val theme = LocalFabricatorTheme.current
    var focused by remember { mutableStateOf(false) }
    val shape = RoundedCornerShape(theme.radius())
    val verticalTargetPadding = if (singleLine) ((48.dp - theme.space(36)) / 2).coerceAtLeast(0.dp) else 0.dp
    BasicTextField(value, onValueChange, modifier.defaultMinSize(minHeight = 48.dp).padding(vertical = verticalTargetPadding).onFocusChanged { focused = it.isFocused }
        .semantics { if (isInvalid) error("Invalid input") }, enabled, readOnly,
        textStyle = TextStyle(theme.color("foreground"), fontSize = theme.text(13), fontFamily = theme.fontFamily),
        keyboardOptions = KeyboardOptions(keyboardType = if (isPassword) KeyboardType.Password else keyboardType),
        singleLine = singleLine, visualTransformation = if (isPassword) PasswordVisualTransformation() else VisualTransformation.None,
        cursorBrush = SolidColor(theme.color("foreground")), decorationBox = { input ->
            Row((if (singleLine) Modifier.height(theme.space(36)) else Modifier.defaultMinSize(minHeight = theme.space(36))).clip(shape).background(Color.Transparent)
                .border(1.dp, theme.color(if (isInvalid) "destructive" else if (focused) "ring" else "border"), shape)
                .padding(horizontal = theme.space(12), vertical = if (singleLine) 0.dp else theme.space(8)), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(theme.space(8))) {
                leading?.invoke()
                Box(Modifier.weight(1f)) { if (value.isEmpty()) FabricatorText(placeholder, muted = true); input() }
                trailing?.invoke()
            }
        })
}

@Composable
fun FabricatorTextarea(value: String, onValueChange: (String) -> Unit, modifier: Modifier = Modifier, placeholder: String = "", isInvalid: Boolean = false, enabled: Boolean = true) {
    FabricatorInput(value, onValueChange, modifier.heightIn(min = 96.dp), placeholder = placeholder, singleLine = false, isInvalid = isInvalid, enabled = enabled)
}

@Composable
fun FabricatorSearch(value: String, onValueChange: (String) -> Unit, modifier: Modifier = Modifier, placeholder: String = "Search…") {
    FabricatorInput(value, onValueChange, modifier, placeholder, leading = { FabricatorIcon("search") }, trailing = { if (value.isNotEmpty()) FabricatorButton({ onValueChange("") }, Modifier.size(28.dp).semantics { contentDescription = "Clear search" }, FabricatorVariant.Ghost, FabricatorSize.Icon) { FabricatorIcon("x", size = 12.dp) } })
}

@Composable
fun FabricatorCheckbox(state: ToggleableState, onStateChange: (ToggleableState) -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true, label: String? = null) {
    val theme = LocalFabricatorTheme.current
    Row(modifier.defaultMinSize(minHeight = 48.dp, minWidth = 48.dp).toggleable(state != ToggleableState.Off, enabled = enabled, role = Role.Checkbox) { onStateChange(if (state == ToggleableState.On) ToggleableState.Off else ToggleableState.On) }.semantics { toggleableState = state }, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(theme.space(8))) {
        val selected = state != ToggleableState.Off
        Box(Modifier.size(theme.space(16)).clip(RoundedCornerShape(theme.radius("sm"))).background(if (selected) theme.color("primary") else Color.Transparent).border(1.dp, theme.color(if (selected) "primary" else "border"), RoundedCornerShape(theme.radius("sm"))), contentAlignment = Alignment.Center) {
            if (selected) FabricatorIcon(if (state == ToggleableState.Indeterminate) "minus" else "check", color = theme.color("primary-foreground"), size = theme.space(12), strokeWidth = 2f)
        }
        if (label != null) FabricatorText(label)
    }
}

@Composable
fun FabricatorCheckbox(checked: Boolean, onCheckedChange: (Boolean) -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true, label: String? = null) {
    FabricatorCheckbox(if (checked) ToggleableState.On else ToggleableState.Off, { onCheckedChange(it == ToggleableState.On) }, modifier, enabled, label)
}

@Composable
fun FabricatorSwitch(checked: Boolean, onCheckedChange: (Boolean) -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true, label: String? = null) {
    val theme = LocalFabricatorTheme.current
    val offset by animateFloatAsState(if (checked) 1f else 0f, tween(theme.duration("move"), easing = theme.easing("move")))
    Row(modifier.defaultMinSize(minWidth = 48.dp, minHeight = 48.dp).toggleable(checked, enabled, role = Role.Switch, onValueChange = onCheckedChange).alpha(if (enabled) 1f else .45f), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(theme.space(8))) {
        Box(Modifier.width(theme.space(20) + theme.space(14)).height(theme.space(20)).clip(CircleShape).background(theme.color(if (checked) "primary" else "accent"))) {
            Box(Modifier.offset(x = 2.dp + theme.space(14) * offset, y = 2.dp).size(theme.space(20) - 4.dp).clip(CircleShape).background(if (checked) theme.color("primary-foreground") else Color.White))
        }
        if (label != null) FabricatorText(label)
    }
}

@Composable
fun FabricatorRadioGroup(value: String, onValueChange: (String) -> Unit, options: List<Pair<String, String>>, modifier: Modifier = Modifier, enabled: Boolean = true) {
    val theme = LocalFabricatorTheme.current
    Column(modifier.selectableGroup()) {
        options.forEach { (id, title) -> Row(Modifier.defaultMinSize(minHeight = 48.dp).fillMaxWidth().selectable(value == id, enabled, role = Role.RadioButton) { onValueChange(id) }, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(theme.space(8))) {
            Box(Modifier.size(theme.space(16)).border(1.dp, theme.color(if (value == id) "primary" else "border"), CircleShape), contentAlignment = Alignment.Center) { if (value == id) Box(Modifier.size(theme.space(8)).background(theme.color("primary"), CircleShape)) }
            FabricatorText(title)
        } }
    }
}

@Composable
fun FabricatorToggle(pressed: Boolean, onPressedChange: (Boolean) -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true, content: @Composable RowScope.() -> Unit) {
    FabricatorButton({ onPressedChange(!pressed) }, modifier.semantics { selected = pressed }, if (pressed) FabricatorVariant.Secondary else FabricatorVariant.Ghost, enabled = enabled, content = content)
}

@Composable
fun FabricatorToggleGroup(values: Set<String>, onValuesChange: (Set<String>) -> Unit, options: List<Pair<String, String>>, modifier: Modifier = Modifier, multiple: Boolean = false) {
    Row(modifier.selectableGroup()) { options.forEach { (id, title) -> FabricatorToggle(id in values, { isPressed -> onValuesChange(if (multiple) { if (isPressed) values + id else values - id } else if (isPressed) setOf(id) else emptySet()) }) { FabricatorText(title) } } }
}

@Composable
fun FabricatorSlider(value: Float, onValueChange: (Float) -> Unit, modifier: Modifier = Modifier, range: ClosedFloatingPointRange<Float> = 0f..1f, steps: Int = 0, enabled: Boolean = true, label: String = "Value") {
    val theme = LocalFabricatorTheme.current
    fun change(fraction: Float) {
        val normalized = fraction.coerceIn(0f, 1f)
        val stepped = if (steps > 0) kotlin.math.round(normalized * (steps + 1)) / (steps + 1) else normalized
        onValueChange(range.start + stepped * (range.endInclusive - range.start))
    }
    val fraction = ((value - range.start) / (range.endInclusive - range.start)).coerceIn(0f, 1f)
    val track = theme.color("accent")
    val fill = theme.color("primary")
    Canvas(modifier.heightIn(min = 48.dp).fillMaxWidth().semantics {
        contentDescription = label
        progressBarRangeInfo = ProgressBarRangeInfo(value, range, steps)
        if (enabled) setProgress { change((it - range.start) / (range.endInclusive - range.start)); true }
    }.onKeyEvent { event ->
        if (!enabled || event.type != KeyEventType.KeyDown) false else when (event.key) {
            Key.DirectionLeft, Key.DirectionDown -> { change(fraction - if (steps > 0) 1f / (steps + 1) else .01f); true }
            Key.DirectionRight, Key.DirectionUp -> { change(fraction + if (steps > 0) 1f / (steps + 1) else .01f); true }
            else -> false
        }
    }.focusable(enabled).pointerInput(enabled, range, steps) { if (enabled) detectTapGestures { change(it.x / size.width) } }
        .pointerInput(enabled, range, steps) { if (enabled) detectDragGestures { pointer, _ -> pointer.consume(); change(pointer.position.x / size.width) } }) {
        val radius = 3.dp.toPx()
        drawLine(track, Offset(radius, size.height / 2), Offset(size.width - radius, size.height / 2), radius * 2, StrokeCap.Round)
        val x = radius + fraction * (size.width - radius * 2)
        drawLine(fill, Offset(radius, size.height / 2), Offset(x, size.height / 2), radius * 2, StrokeCap.Round)
        drawCircle(fill, 7.dp.toPx(), Offset(x, size.height / 2))
        drawCircle(Color.White, 4.dp.toPx(), Offset(x, size.height / 2))
    }
}

@Composable
fun FabricatorRating(value: Int, onValueChange: (Int) -> Unit, modifier: Modifier = Modifier, maximum: Int = 5, readOnly: Boolean = false) {
    Row(modifier.selectableGroup()) { repeat(maximum) { index ->
        Box(Modifier.size(48.dp).selectable(index < value, enabled = !readOnly, role = Role.RadioButton) { onValueChange(index + 1) }.semantics { contentDescription = "${index + 1} of $maximum stars" }, contentAlignment = Alignment.Center) {
            FabricatorIcon("star", color = LocalFabricatorTheme.current.color(if (index < value) "rating-stroke" else "muted-foreground"), fillColor = if (index < value) LocalFabricatorTheme.current.color("rating-fill") else null)
        }
    } }
}

@Composable
fun FabricatorBadge(text: String, modifier: Modifier = Modifier, variant: FabricatorVariant = FabricatorVariant.Secondary) {
    val theme = LocalFabricatorTheme.current
    val background = when (variant) { FabricatorVariant.Default -> theme.color("primary"); FabricatorVariant.Destructive -> theme.color("destructive").copy(alpha = .12f); FabricatorVariant.Outline -> Color.Transparent; else -> theme.color("secondary") }
    val foreground = when (variant) { FabricatorVariant.Default -> theme.color("primary-foreground"); FabricatorVariant.Destructive -> theme.color("destructive-text"); else -> theme.color("foreground") }
    Box(modifier.clip(RoundedCornerShape(theme.radius("md"))).background(background).then(if (variant == FabricatorVariant.Outline) Modifier.border(1.dp, theme.color("border"), RoundedCornerShape(theme.radius("md"))) else Modifier).padding(horizontal = theme.space(8), vertical = 3.dp)) { FabricatorText(text, size = 11, weight = FontWeight.Medium, color = foreground) }
}

@Composable
fun FabricatorAvatar(initials: String, modifier: Modifier = Modifier, size: Dp = 36.dp, image: (@Composable () -> Unit)? = null) {
    val theme = LocalFabricatorTheme.current
    Box(modifier.size(size).clip(CircleShape).background(theme.color("accent")), contentAlignment = Alignment.Center) { if (image == null) FabricatorText(initials.take(2), weight = FontWeight.Medium) else image() }
}

@Composable
fun FabricatorKbd(text: String, modifier: Modifier = Modifier) {
    val theme = LocalFabricatorTheme.current
    Box(modifier.border(1.dp, theme.color("border"), RoundedCornerShape(theme.radius("sm"))).background(theme.color("muted"), RoundedCornerShape(theme.radius("sm"))).padding(horizontal = 5.dp, vertical = 2.dp)) { BasicText(text, style = TextStyle(color = theme.color("muted-foreground"), fontFamily = FontFamily.Monospace, fontSize = 11.sp)) }
}

@Composable
fun FabricatorSeparator(modifier: Modifier = Modifier, vertical: Boolean = false) {
    Box((if (vertical) modifier.width(1.dp).fillMaxHeight() else modifier.height(1.dp).fillMaxWidth()).background(LocalFabricatorTheme.current.color("border")))
}

@Composable
fun FabricatorAspectRatio(ratio: Float, modifier: Modifier = Modifier, content: @Composable BoxScope.() -> Unit) { Box(modifier.aspectRatio(ratio), content = content) }

@Composable
fun FabricatorScrollArea(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) { Column(modifier.verticalScroll(rememberScrollState()), content = content) }

@Composable
fun FabricatorSkeleton(modifier: Modifier = Modifier) {
    val theme = LocalFabricatorTheme.current
    if (theme.motion == FabricatorMotion.Off) { Box(modifier.clip(RoundedCornerShape(theme.radius("md"))).background(theme.color("hover"))); return }
    val transition = rememberInfiniteTransition()
    val alpha by transition.animateFloat(1f, .5f, infiniteRepeatable(tween(1000, easing = androidx.compose.animation.core.CubicBezierEasing(.4f, 0f, .6f, 1f)), RepeatMode.Reverse))
    Box(modifier.clip(RoundedCornerShape(theme.radius("md"))).background(theme.color("hover")).alpha(alpha))
}

@Composable
fun FabricatorProgress(value: Float, modifier: Modifier = Modifier, label: String = "Progress") {
    val theme = LocalFabricatorTheme.current
    val progress by animateFloatAsState(value.coerceIn(0f, 1f), tween(theme.duration("move"), easing = theme.easing("move")))
    Box(modifier.fillMaxWidth().height(6.dp).clip(CircleShape).background(theme.color("accent")).semantics { contentDescription = label; progressBarRangeInfo = ProgressBarRangeInfo(value, 0f..1f) }) { Box(Modifier.fillMaxHeight().fillMaxWidth(progress).background(theme.color("primary"))) }
}

@Composable
fun FabricatorThemeToggle(isDark: Boolean, onDarkChange: (Boolean) -> Unit, modifier: Modifier = Modifier) {
    FabricatorButton({ onDarkChange(!isDark) }, modifier.semantics { contentDescription = if (isDark) "Use light theme" else "Use dark theme" }, FabricatorVariant.Ghost, FabricatorSize.Icon) { FabricatorIcon(if (isDark) "sun" else "moon") }
}

@Composable
fun FabricatorDensity(density: FabricatorDensity, content: @Composable () -> Unit) { CompositionLocalProvider(LocalFabricatorTheme provides LocalFabricatorTheme.current.copy(density = density), content = content) }

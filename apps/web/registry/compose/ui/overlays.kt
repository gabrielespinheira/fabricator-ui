package dev.fabricator.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.foundation.hoverable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.input.key.*
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.PointerEventType
import androidx.compose.ui.input.pointer.isSecondaryPressed
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.semantics.*
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.window.Popup
import androidx.compose.ui.window.PopupProperties

@Composable
fun FabricatorPopupSurface(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    val theme = LocalFabricatorTheme.current
    Column(modifier.widthIn(min = 180.dp).shadow(if (theme.isDark) 18.dp else 12.dp, RoundedCornerShape(theme.radius("xl"))).clip(RoundedCornerShape(theme.radius("xl"))).background(theme.color("popover")).padding(theme.space(6)), content = content)
}

@Composable
fun FabricatorDropdownMenu(expanded: Boolean, onDismissRequest: () -> Unit, modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    if (!expanded) return
    val focus = LocalFocusManager.current
    Popup(Alignment.TopStart, IntOffset(0, 48), onDismissRequest = onDismissRequest, properties = PopupProperties(focusable = true)) {
        FabricatorPopupSurface(modifier.widthIn(max = 360.dp).heightIn(max = 400.dp).verticalScroll(rememberScrollState()).onPreviewKeyEvent { event ->
            if (event.type != KeyEventType.KeyDown) false else when (event.key) {
                Key.DirectionDown -> focus.moveFocus(FocusDirection.Down)
                Key.DirectionUp -> focus.moveFocus(FocusDirection.Up)
                Key.Escape -> { onDismissRequest(); true }
                else -> false
            }
        }, content)
    }
}

@Composable
fun FabricatorMenuItem(title: String, onClick: () -> Unit, modifier: Modifier = Modifier, description: String? = null, selected: Boolean = false, enabled: Boolean = true, destructive: Boolean = false, shortcut: String? = null, icon: String? = null) {
    FabricatorButton(onClick, modifier.fillMaxWidth().semantics { this.selected = selected }, if (destructive) FabricatorVariant.Destructive else if (selected) FabricatorVariant.Secondary else FabricatorVariant.Ghost, enabled = enabled) {
        if (icon != null) FabricatorIcon(icon)
        Column(Modifier.weight(1f)) { FabricatorText(title); if (description != null) FabricatorText(description, muted = true, size = 11) }
        if (selected) FabricatorIcon("check")
        if (shortcut != null) FabricatorKbd(shortcut)
    }
}

@Composable
fun FabricatorPopover(expanded: Boolean, onDismissRequest: () -> Unit, modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    if (!expanded) return
    Popup(Alignment.TopStart, IntOffset(0, 48), onDismissRequest = onDismissRequest, properties = PopupProperties(focusable = true)) { FabricatorPopupSurface(modifier.widthIn(max = 360.dp).padding(12.dp), content) }
}

@Composable
fun FabricatorDialog(open: Boolean, onDismissRequest: () -> Unit, title: String, modifier: Modifier = Modifier, description: String? = null, dismissible: Boolean = true, maxWidth: Dp = 480.dp, content: @Composable ColumnScope.() -> Unit) {
    if (!open) return
    val theme = LocalFabricatorTheme.current
    Dialog(onDismissRequest, DialogProperties(dismissOnBackPress = dismissible, dismissOnClickOutside = dismissible, usePlatformDefaultWidth = false)) {
        FabricatorPopupSurface(modifier.widthIn(max = maxWidth).fillMaxWidth(.92f).padding(18.dp).semantics { paneTitle = title }) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                FabricatorText(title, Modifier.weight(1f).semantics { heading() }, weight = FontWeight.SemiBold, size = 16)
                if (dismissible) FabricatorButton(onDismissRequest, Modifier.semantics { contentDescription = "Close dialog" }, FabricatorVariant.Ghost, FabricatorSize.Icon) { FabricatorIcon("x") }
            }
            if (description != null) FabricatorText(description, muted = true)
            Spacer(Modifier.height(theme.space(16)))
            content()
        }
    }
}

@Composable
fun FabricatorAlertDialog(open: Boolean, onDismissRequest: () -> Unit, title: String, description: String, confirmLabel: String, onConfirm: () -> Unit, modifier: Modifier = Modifier, cancelLabel: String = "Cancel", destructive: Boolean = false) {
    FabricatorDialog(open, onDismissRequest, title, modifier, description, dismissible = false) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
            FabricatorButton(cancelLabel, onDismissRequest, variant = FabricatorVariant.Outline)
            FabricatorButton(confirmLabel, onConfirm, variant = if (destructive) FabricatorVariant.Destructive else FabricatorVariant.Default)
        }
    }
}

enum class FabricatorSheetSide { Bottom, Left, Right, Top }

@Composable
fun FabricatorSheet(open: Boolean, onDismissRequest: () -> Unit, title: String, modifier: Modifier = Modifier, side: FabricatorSheetSide = FabricatorSheetSide.Right, content: @Composable ColumnScope.() -> Unit) {
    if (!open) return
    val theme = LocalFabricatorTheme.current
    Dialog(onDismissRequest, DialogProperties(usePlatformDefaultWidth = false)) {
        val alignment = when (side) { FabricatorSheetSide.Bottom -> Alignment.BottomCenter; FabricatorSheetSide.Top -> Alignment.TopCenter; FabricatorSheetSide.Left -> Alignment.CenterStart; FabricatorSheetSide.Right -> Alignment.CenterEnd }
        Box(Modifier.fillMaxSize(), contentAlignment = alignment) {
            val sizing = if (side == FabricatorSheetSide.Left || side == FabricatorSheetSide.Right) Modifier.widthIn(max = 360.dp).fillMaxHeight() else Modifier.fillMaxWidth().heightIn(max = 680.dp)
            Column(modifier.then(sizing).clip(RoundedCornerShape(theme.radius("2xl"))).background(theme.color("popover")).padding(20.dp).semantics { paneTitle = title }, verticalArrangement = Arrangement.spacedBy(theme.space(12))) {
                Row(verticalAlignment = Alignment.CenterVertically) { FabricatorText(title, Modifier.weight(1f).semantics { heading() }, weight = FontWeight.SemiBold, size = 16); FabricatorButton(onDismissRequest, Modifier.semantics { contentDescription = "Close $title" }, FabricatorVariant.Ghost, FabricatorSize.Icon) { FabricatorIcon("x") } }
                content()
            }
        }
    }
}

@Composable
fun FabricatorDrawer(open: Boolean, onDismissRequest: () -> Unit, title: String, modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) { FabricatorSheet(open, onDismissRequest, title, modifier, FabricatorSheetSide.Bottom, content) }

@Composable
fun FabricatorTooltip(text: String, modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    val source = remember { MutableInteractionSource() }
    val hovered by source.collectIsHoveredAsState()
    var focused by remember { mutableStateOf(false) }
    Box(modifier.hoverable(source).onFocusChanged { focused = it.hasFocus }.semantics { contentDescription = text }) {
        content()
        if (hovered || focused) Popup(Alignment.TopCenter, IntOffset(0, -40)) { FabricatorPopupSurface(Modifier.padding(4.dp)) { FabricatorText(text, size = 12) } }
    }
}

@Composable
fun FabricatorHoverCard(modifier: Modifier = Modifier, trigger: @Composable () -> Unit, content: @Composable ColumnScope.() -> Unit) {
    val source = remember { MutableInteractionSource() }
    val hovered by source.collectIsHoveredAsState()
    var open by remember { mutableStateOf(false) }
    Box(modifier.hoverable(source).onFocusChanged { open = it.hasFocus }.pointerInput(Unit) { detectTapGestures(onLongPress = { open = true }) }) {
        trigger()
        FabricatorPopover(hovered || open, { open = false }, content = content)
    }
}

@Composable
fun FabricatorContextMenu(modifier: Modifier = Modifier, content: @Composable () -> Unit, menu: @Composable ColumnScope.() -> Unit) {
    var open by remember { mutableStateOf(false) }
    Box(modifier.pointerInput(Unit) { detectTapGestures(onLongPress = { open = true }) }.pointerInput(Unit) {
        awaitPointerEventScope { while (true) { val event = awaitPointerEvent(); if (event.type == PointerEventType.Press && event.buttons.isSecondaryPressed) { open = true; event.changes.forEach { it.consume() } } } }
    }.onPreviewKeyEvent { if (it.type == KeyEventType.KeyDown && it.key == Key.Menu) { open = true; true } else false }) {
        content()
        FabricatorDropdownMenu(open, { open = false }) { menu(); FabricatorMenuItem("Close", { open = false }) }
    }
}

@Composable
fun FabricatorMenubar(menus: List<Pair<String, @Composable ColumnScope.() -> Unit>>, modifier: Modifier = Modifier) {
    var active by remember { mutableStateOf<String?>(null) }
    Row(modifier) { menus.forEach { (label, content) -> Box { FabricatorButton(label, { active = if (active == label) null else label }, variant = FabricatorVariant.Ghost); FabricatorDropdownMenu(active == label, { active = null }, content = content) } } }
}

data class FabricatorCommandItem(val id: String, val title: String, val group: String = "", val icon: String? = null, val shortcut: String? = null, val onSelect: () -> Unit)

@Composable
fun FabricatorCommand(items: List<FabricatorCommandItem>, modifier: Modifier = Modifier, onSelect: ((String) -> Unit)? = null) {
    var query by remember { mutableStateOf("") }
    Column(modifier.heightIn(max = 440.dp)) {
        FabricatorSearch(query, { query = it }, placeholder = "Type a command or search…")
        val filtered = items.filter { it.title.contains(query, true) || it.group.contains(query, true) }
        Column(Modifier.verticalScroll(rememberScrollState())) {
            filtered.groupBy { it.group }.forEach { (group, commands) ->
                if (group.isNotEmpty()) FabricatorText(group, Modifier.padding(12.dp), muted = true, size = 11, weight = FontWeight.Medium)
                commands.forEach { command -> FabricatorMenuItem(command.title, { command.onSelect(); onSelect?.invoke(command.id) }, icon = command.icon, shortcut = command.shortcut) }
            }
            if (filtered.isEmpty()) FabricatorText("No results found. Try another search.", Modifier.padding(16.dp), muted = true)
        }
    }
}

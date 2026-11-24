package dev.fabricator.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.semantics.*
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch

@Composable
fun FabricatorCard(modifier: Modifier = Modifier, title: String? = null, description: String? = null, content: @Composable ColumnScope.() -> Unit) {
    val theme = LocalFabricatorTheme.current
    Column(modifier.shadow(if (theme.isDark) 4.dp else 2.dp, RoundedCornerShape(theme.radius("2xl"))).clip(RoundedCornerShape(theme.radius("2xl"))).background(theme.color("card")).padding(theme.space(20)), verticalArrangement = Arrangement.spacedBy(theme.space(12))) {
        if (title != null) FabricatorText(title, Modifier.semantics { heading() }, weight = FontWeight.SemiBold, size = 16)
        if (description != null) FabricatorText(description, muted = true)
        content()
    }
}

@Composable
fun FabricatorItem(title: String, modifier: Modifier = Modifier, description: String? = null, leading: (@Composable () -> Unit)? = null, trailing: (@Composable () -> Unit)? = null, onClick: (() -> Unit)? = null) {
    val body: @Composable RowScope.() -> Unit = {
        leading?.invoke()
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) { FabricatorText(title, weight = FontWeight.Medium); if (description != null) FabricatorText(description, muted = true, size = 12) }
        trailing?.invoke()
    }
    if (onClick != null) FabricatorButton(onClick, modifier.fillMaxWidth(), FabricatorVariant.Ghost, content = body)
    else Row(modifier.fillMaxWidth().padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp), content = body)
}

data class FabricatorAccordionItem(val id: String, val title: String, val content: @Composable () -> Unit)
@Composable
fun FabricatorAccordion(items: List<FabricatorAccordionItem>, expandedIds: Set<String>, onExpandedChange: (Set<String>) -> Unit, modifier: Modifier = Modifier, multiple: Boolean = false) {
    Column(modifier) { items.forEach { item ->
        val expanded = item.id in expandedIds
        FabricatorButton({ onExpandedChange(if (expanded) expandedIds - item.id else if (multiple) expandedIds + item.id else setOf(item.id)) }, Modifier.fillMaxWidth().semantics { stateDescription = if (expanded) "Expanded" else "Collapsed" }, FabricatorVariant.Ghost) {
            FabricatorText(item.title, Modifier.weight(1f), weight = FontWeight.Medium); FabricatorIcon(if (expanded) "chevron-up" else "chevron-down")
        }
        FabricatorCollapsible(expanded, Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) { item.content() }
        FabricatorSeparator()
    } }
}

@Composable
fun FabricatorCollapsible(expanded: Boolean, modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    val duration = LocalFabricatorTheme.current.duration("disclosure")
    AnimatedVisibility(expanded, modifier, enter = expandVertically(tween(duration, easing = LocalFabricatorTheme.current.easing("enter"))), exit = shrinkVertically(tween(duration, easing = LocalFabricatorTheme.current.easing("exit")))) { content() }
}

data class FabricatorTab(val id: String, val title: String, val icon: String? = null, val canClose: Boolean = false)
@Composable
fun FabricatorTabs(value: String, onValueChange: (String) -> Unit, tabs: List<FabricatorTab>, modifier: Modifier = Modifier, content: @Composable (String) -> Unit) {
    Column(modifier) { FabricatorTabStrip(value, onValueChange, tabs); Spacer(Modifier.height(12.dp)); content(value) }
}

@Composable
fun FabricatorTabStrip(value: String, onValueChange: (String) -> Unit, tabs: List<FabricatorTab>, modifier: Modifier = Modifier, onClose: ((String) -> Unit)? = null, onMove: ((String, Int) -> Unit)? = null) {
    val theme = LocalFabricatorTheme.current
    Row(modifier.horizontalScroll(rememberScrollState()).clip(RoundedCornerShape(theme.radius())).background(theme.color("muted")).padding(3.dp), verticalAlignment = Alignment.CenterVertically) {
        tabs.forEachIndexed { index, tab ->
            FabricatorButton({ onValueChange(tab.id) }, Modifier.semantics { role = Role.Tab; selected = value == tab.id }, if (value == tab.id) FabricatorVariant.Outline else FabricatorVariant.Ghost) { if (tab.icon != null) FabricatorIcon(tab.icon); FabricatorText(tab.title) }
            if (tab.canClose && onClose != null) FabricatorButton({ onClose(tab.id) }, Modifier.semantics { contentDescription = "Close ${tab.title}" }, FabricatorVariant.Ghost, FabricatorSize.Icon) { FabricatorIcon("x", size = 12.dp) }
            if (onMove != null && index > 0) FabricatorButton({ onMove(tab.id, index - 1) }, Modifier.semantics { contentDescription = "Move ${tab.title} left" }, FabricatorVariant.Ghost, FabricatorSize.Icon) { FabricatorIcon("chevron-left", size = 12.dp) }
        }
    }
}

@Composable
fun FabricatorBreadcrumb(items: List<Pair<String, (() -> Unit)?>>, modifier: Modifier = Modifier) {
    Row(modifier.horizontalScroll(rememberScrollState()), verticalAlignment = Alignment.CenterVertically) { items.forEachIndexed { index, (title, action) ->
        if (index > 0) FabricatorIcon("chevron-right", color = LocalFabricatorTheme.current.color("muted-foreground"), size = 12.dp)
        if (action == null) FabricatorText(title, Modifier.padding(horizontal = 8.dp), weight = FontWeight.Medium) else FabricatorButton(title, action, variant = FabricatorVariant.Ghost)
    } }
}

@Composable
fun FabricatorPagination(page: Int, pageCount: Int, onPageChange: (Int) -> Unit, modifier: Modifier = Modifier) {
    Row(modifier, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Center) {
        FabricatorButton("Previous", { onPageChange(page - 1) }, variant = FabricatorVariant.Outline, enabled = page > 0)
        val visible = (maxOf(0, page - 2)..minOf(pageCount - 1, page + 2)).toList()
        visible.forEach { index -> FabricatorButton((index + 1).toString(), { onPageChange(index) }, Modifier.semantics { selected = index == page }, if (index == page) FabricatorVariant.Secondary else FabricatorVariant.Ghost) }
        FabricatorButton("Next", { onPageChange(page + 1) }, variant = FabricatorVariant.Outline, enabled = page + 1 < pageCount)
    }
}

@Composable
fun FabricatorCarousel(count: Int, modifier: Modifier = Modifier, item: @Composable (Int) -> Unit) {
    val state = rememberLazyListState()
    val scope = rememberCoroutineScope()
    Column(modifier) {
        LazyRow(state = state, horizontalArrangement = Arrangement.spacedBy(12.dp)) { items(count) { index -> Box(Modifier.width(280.dp)) { item(index) } } }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
            FabricatorButton("Previous", { scope.launch { state.animateScrollToItem(maxOf(0, state.firstVisibleItemIndex - 1)) } }, variant = FabricatorVariant.Outline, enabled = state.firstVisibleItemIndex > 0)
            FabricatorButton("Next", { scope.launch { state.animateScrollToItem(minOf(count - 1, state.firstVisibleItemIndex + 1)) } }, variant = FabricatorVariant.Outline, enabled = state.canScrollForward)
        }
    }
}

@Composable
fun FabricatorResizable(fraction: Float, onFractionChange: (Float) -> Unit, modifier: Modifier = Modifier, first: @Composable () -> Unit, second: @Composable () -> Unit) {
    BoxWithConstraints(modifier) {
        val width = constraints.maxWidth.toFloat()
        Row {
            Box(Modifier.weight(fraction.coerceIn(.15f, .85f))) { first() }
            Box(Modifier.width(16.dp).fillMaxHeight().semantics {
                contentDescription = "Resize panels"
                progressBarRangeInfo = ProgressBarRangeInfo(fraction, .15f.. .85f)
                setProgress { onFractionChange(it.coerceIn(.15f, .85f)); true }
            }.pointerInput(width, fraction) { detectDragGestures { change, drag -> change.consume(); onFractionChange((fraction + drag.x / width).coerceIn(.15f, .85f)) } }, contentAlignment = Alignment.Center) { FabricatorIcon("grip-vertical", size = 12.dp) }
            Box(Modifier.weight(1f - fraction.coerceIn(.15f, .85f))) { second() }
        }
    }
}

@Composable
fun FabricatorDirection(direction: LayoutDirection = LayoutDirection.Ltr, content: @Composable () -> Unit) { CompositionLocalProvider(LocalLayoutDirection provides direction, content = content) }

data class FabricatorNavItem(val id: String, val title: String, val icon: String = "circle", val group: String = "")

@Composable
fun FabricatorNavigationMenu(items: List<FabricatorNavItem>, selectedId: String, onNavigate: (String) -> Unit, modifier: Modifier = Modifier) {
    Row(modifier.horizontalScroll(rememberScrollState())) { items.forEach { item -> FabricatorButton({ onNavigate(item.id) }, variant = if (selectedId == item.id) FabricatorVariant.Secondary else FabricatorVariant.Ghost) { FabricatorIcon(item.icon); FabricatorText(item.title) } } }
}

@Composable
fun FabricatorAppNav(items: List<FabricatorNavItem>, selectedId: String, onNavigate: (String) -> Unit, modifier: Modifier = Modifier) {
    LazyColumn(modifier) {
        items.groupBy { it.group }.forEach { (group, entries) ->
            if (group.isNotBlank()) item(key = "group:$group") { FabricatorText(group, Modifier.padding(horizontal = 16.dp, vertical = 12.dp), muted = true, size = 11, weight = FontWeight.Medium) }
            items(entries, key = { it.id }) { item -> FabricatorMenuItem(item.title, { onNavigate(item.id) }, selected = selectedId == item.id, icon = item.icon) }
        }
    }
}

@Composable
fun FabricatorSidebar(items: List<FabricatorNavItem>, selectedId: String, onNavigate: (String) -> Unit, modifier: Modifier = Modifier, header: (@Composable () -> Unit)? = null, footer: (@Composable () -> Unit)? = null) {
    val theme = LocalFabricatorTheme.current
    FabricatorSidebarContent(items, selectedId, onNavigate, modifier.width(248.dp).background(theme.color("sidebar")), header, footer)
}

@Composable
private fun FabricatorSidebarContent(items: List<FabricatorNavItem>, selectedId: String, onNavigate: (String) -> Unit, modifier: Modifier, header: (@Composable () -> Unit)?, footer: (@Composable () -> Unit)?) {
    Column(modifier.fillMaxHeight().padding(LocalFabricatorTheme.current.space(8))) {
        header?.invoke()
        FabricatorAppNav(items, selectedId, onNavigate, Modifier.weight(1f))
        footer?.invoke()
    }
}

enum class FabricatorShellVariant { Inset, Sidebar, Floating }

@Composable
fun FabricatorAppShell(
    title: String, items: List<FabricatorNavItem>, selectedId: String, onNavigate: (String) -> Unit,
    modifier: Modifier = Modifier, variant: FabricatorShellVariant = FabricatorShellVariant.Inset,
    showsSidebar: Boolean = true, bottomNavigation: List<FabricatorNavItem> = emptyList(),
    sidebarHeader: (@Composable () -> Unit)? = null, sidebarFooter: (@Composable () -> Unit)? = null,
    actions: (@Composable RowScope.() -> Unit)? = null, status: (@Composable () -> Unit)? = null,
    panel: (@Composable () -> Unit)? = null, content: @Composable () -> Unit,
) {
    val theme = LocalFabricatorTheme.current
    var sidebarOpen by remember { mutableStateOf(false) }
    var panelOpen by remember { mutableStateOf(false) }
    val sidebarWidth = 256.dp
    val panelWidth = 320.dp
    val gap = theme.space(8)
    val shape = RoundedCornerShape(theme.radius("xl"))
    BoxWithConstraints(modifier.fillMaxSize().windowInsetsPadding(WindowInsets.safeDrawing)) {
        val isWide = maxWidth >= 768.dp
        val hasSidebar = isWide && showsSidebar
        val canDockPanel = isWide && maxWidth - (if (hasSidebar) sidebarWidth else 0.dp) - panelWidth >= 520.dp
        val isInset = isWide && variant == FabricatorShellVariant.Inset
        val showStatus = isWide && status != null
        Row(Modifier.fillMaxSize().background(theme.color("app-shell-frame"))) {
            if (hasSidebar) FabricatorSidebarContent(items, selectedId, onNavigate, Modifier.width(sidebarWidth), sidebarHeader, sidebarFooter)
            Column(Modifier.weight(1f).fillMaxHeight()) {
                val inset = if (isInset) {
                    Modifier.padding(start = if (hasSidebar) 0.dp else gap, top = gap, end = gap, bottom = if (showStatus) 0.dp else gap)
                } else Modifier
                Row(Modifier.weight(1f).fillMaxWidth().then(inset), horizontalArrangement = Arrangement.spacedBy(if (isInset) gap else 0.dp)) {
                    val mainSurface = if (isInset) Modifier.shadow(1.dp, shape).clip(shape) else Modifier
                    Column(Modifier.weight(1f).fillMaxHeight().then(mainSurface).background(theme.color("app-shell-main"))) {
                        Row(Modifier.fillMaxWidth().heightIn(min = theme.space(48)).padding(horizontal = theme.space(12)), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(gap)) {
                            if (!isWide && showsSidebar) FabricatorButton({ sidebarOpen = true }, Modifier.semantics { contentDescription = "Open navigation" }, FabricatorVariant.Ghost, FabricatorSize.Icon) { FabricatorIcon("panel-left") }
                            FabricatorText(title, Modifier.weight(1f).semantics { heading() }, weight = FontWeight.Medium, size = 13, maxLines = 1)
                            actions?.invoke(this)
                            if (panel != null) FabricatorButton({ panelOpen = !panelOpen }, Modifier.semantics { contentDescription = if (panelOpen) "Close details" else "Open details" }, FabricatorVariant.Ghost, FabricatorSize.Icon) { FabricatorIcon("panel-right") }
                        }
                        Box(Modifier.weight(1f).fillMaxWidth()) { content() }
                        if (!isWide && bottomNavigation.isNotEmpty()) { FabricatorSeparator(); Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) { bottomNavigation.forEach { item -> FabricatorButton({ onNavigate(item.id) }, Modifier.semantics { selected = item.id == selectedId }, if (item.id == selectedId) FabricatorVariant.Secondary else FabricatorVariant.Ghost) { Column(horizontalAlignment = Alignment.CenterHorizontally) { FabricatorIcon(item.icon); FabricatorText(item.title, size = 11) } } } } }
                    }
                    if (canDockPanel && panelOpen && panel != null) {
                        if (!isInset) FabricatorSeparator(vertical = true)
                        Box(Modifier.width(panelWidth).fillMaxHeight().then(mainSurface).background(theme.color("app-shell-panel")).padding(theme.space(16))) { panel() }
                    }
                }
                if (isWide && status != null) {
                    Box(Modifier.fillMaxWidth().heightIn(min = theme.space(36)).padding(horizontal = theme.space(12)), contentAlignment = Alignment.CenterStart) { status() }
                }
            }
        }
        if (!isWide) {
            FabricatorSheet(sidebarOpen, { sidebarOpen = false }, "Navigation", side = FabricatorSheetSide.Left) { FabricatorSidebar(items, selectedId, { onNavigate(it); sidebarOpen = false }, header = sidebarHeader, footer = sidebarFooter) }
        }
        if (!canDockPanel && panel != null) FabricatorDrawer(panelOpen, { panelOpen = false }, "Details") { panel() }
    }
}

@Composable
fun FabricatorUserMenu(name: String, email: String, modifier: Modifier = Modifier, onSettings: () -> Unit = {}, onSignOut: () -> Unit = {}) {
    var open by remember { mutableStateOf(false) }
    Box(modifier) {
        FabricatorButton({ open = true }, Modifier.fillMaxWidth(), FabricatorVariant.Ghost) { FabricatorAvatar(name.take(2)); Column(Modifier.weight(1f)) { FabricatorText(name, weight = FontWeight.Medium); FabricatorText(email, muted = true, size = 11) }; FabricatorIcon("chevrons-up-down") }
        FabricatorDropdownMenu(open, { open = false }) { FabricatorMenuItem("Settings", { open = false; onSettings() }, icon = "settings"); FabricatorMenuItem("Sign out", { open = false; onSignOut() }, icon = "log-out") }
    }
}

@Composable
fun FabricatorPreviewRail(items: List<FabricatorNavItem>, value: String, onValueChange: (String) -> Unit, modifier: Modifier = Modifier, preview: @Composable (String) -> Unit) {
    Row(modifier) { FabricatorAppNav(items, value, onValueChange, Modifier.width(160.dp)); FabricatorSeparator(vertical = true); Box(Modifier.weight(1f).padding(16.dp)) { preview(value) } }
}

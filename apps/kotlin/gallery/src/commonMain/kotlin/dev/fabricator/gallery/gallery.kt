package dev.fabricator.gallery

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import dev.fabricator.ui.*
import dev.fabricator.ui.generated.FabricatorGenerated
import dev.fabricator.ui.generated.FabricatorSpinnerVariant
import dev.fabricator.ui.models.*

private val demoOptions = listOf(FabricatorOption("design", "Design", "Shape the experience"), FabricatorOption("engineering", "Engineering", "Build the product"), FabricatorOption("product", "Product", "Plan the next release"))
private val demoNavigation = listOf(FabricatorNavItem("overview", "Overview", "house"), FabricatorNavItem("projects", "Projects", "folder"), FabricatorNavItem("activity", "Activity", "activity"), FabricatorNavItem("settings", "Settings", "settings"))
private val demoMarkdown = "# A quieter workspace\nComponents that feel familiar, across every platform.\n\nUse **strong emphasis**, _a softer note_ and `inline code`.\n\n- Consistent tokens\n- Native keyboard and text editing\n- [Fabricator UI](https://fabricator-ui.vercel.app)\n\n```kotlin\nFabricatorButton(\"Create project\", onClick = ::createProject)\n```"

@Composable
fun FabricatorGallery() {
    var isDark by remember { mutableStateOf(false) }
    var density by remember { mutableStateOf(FabricatorDensity.Default) }
    var motion by remember { mutableStateOf(FabricatorMotion.Default) }
    var route by remember { mutableStateOf("button") }
    var query by remember { mutableStateOf("") }
    var settings by remember { mutableStateOf(false) }
    val services = rememberFabricatorServices()
    val font = rememberFabricatorFont()
    val toast = rememberFabricatorToastState()
    val catalog = FabricatorGenerated.catalog
    val navigation = remember(query) { catalog.filter { it.title.contains(query, true) || it.group.contains(query, true) }.map { FabricatorNavItem(it.name, it.title, if (it.type == "registry:block") "layout-template" else "component", it.group) } }
    FabricatorTheme(isDark, density, motion, font) {
        CompositionLocalProvider(LocalFabricatorServices provides services) {
            FabricatorRoot {
                FabricatorAppShell(
                    catalog.firstOrNull { it.name == route }?.title ?: "Fabricator UI", navigation, route, { route = it },
                    sidebarHeader = {
                        FabricatorItem("Fabricator UI", description = "Kotlin · Compose", leading = { FabricatorIcon("blocks") })
                        FabricatorSearch(query, { query = it }, placeholder = "Find a component…")
                    },
                    sidebarFooter = { FabricatorText("${catalog.count { it.type != "registry:block" }} components · ${catalog.count { it.type == "registry:block" }} blocks", Modifier.padding(12.dp), muted = true, size = 11) },
                    actions = {
                        FabricatorBadge("Compose", variant = FabricatorVariant.Outline)
                        FabricatorThemeToggle(isDark, { isDark = it })
                        FabricatorButton({ settings = true }, variant = FabricatorVariant.Ghost, size = FabricatorSize.Icon) { FabricatorIcon("sliders-horizontal", description = "Open design settings") }
                    },
                    status = { FabricatorText("Native Android and desktop · ${density.name} density", muted = true, size = 11) },
                    bottomNavigation = listOf(FabricatorNavItem("button", "Components", "component"), FabricatorNavItem("app-shell", "App Shell", "panel-left"), FabricatorNavItem("login-01", "Blocks", "layout-template")),
                ) { key(route) { GalleryRoute(route, toast) } }
                FabricatorSonner(toast, Modifier.align(Alignment.BottomEnd).padding(20.dp))
                FabricatorSheet(settings, { settings = false }, "Design settings") {
                    FabricatorField("Density") { FabricatorSelect(density.name, { density = FabricatorDensity.valueOf(it) }, FabricatorDensity.entries.map { FabricatorOption(it.name, it.name) }) }
                    FabricatorField("Motion") { FabricatorSelect(motion.name, { motion = FabricatorMotion.valueOf(it) }, FabricatorMotion.entries.map { FabricatorOption(it.name, it.name) }) }
                    FabricatorSwitch(isDark, { isDark = it }, label = "Dark theme")
                    FabricatorText("Colors, radii, icon geometry and sound recipes come from the web design system.", muted = true)
                }
            }
        }
    }
}

@Composable
private fun GalleryRoute(route: String, toast: FabricatorToastState) {
    if (route.startsWith("login-")) { FabricatorLoginBlock(route.takeLast(2).toInt(), onLogin = { toast.show("Form submitted", it["email"]) }, onProviderLogin = { toast.show("Provider selected", it) }, onForgotPassword = { toast.show("Password recovery selected") }, onSignup = { toast.show("Sign up selected") }); return }
    if (route.startsWith("signup-")) { FabricatorSignupBlock(route.takeLast(2).toInt(), onSignup = { toast.show("Form submitted", it["email"]) }, onProviderSignup = { toast.show("Provider selected", it) }, onLogin = { toast.show("Login selected") }); return }
    if (route.startsWith("sidebar-")) { FabricatorSidebarBlock(route.takeLast(2).toInt(), onAction = { toast.show(it) }); return }
    if (route.startsWith("app-shell-")) { FabricatorAppShellBlock(route.takeLast(2).toInt(), onAction = { toast.show(it) }); return }
    if (route == "preview-03") { FabricatorPreviewBlock(Modifier.fillMaxSize()); return }
    val catalog = FabricatorGenerated.catalog.first { it.name == route }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            FabricatorText(catalog.group.uppercase(), muted = true, size = 11, weight = FontWeight.Medium)
            FabricatorText(catalog.title, weight = FontWeight.SemiBold, size = 16)
            FabricatorText("Fabricator UI · native Compose components", muted = true)
        }
        FabricatorCard(Modifier.fillMaxWidth()) { ComponentExample(route, toast) }
    }
}

@Composable
private fun ComponentExample(route: String, toast: FabricatorToastState) {
    val services = LocalFabricatorServices.current
    var text by remember { mutableStateOf("") }
    var checked by remember { mutableStateOf(true) }
    var number by remember { mutableDoubleStateOf(24.0) }
    var fraction by remember { mutableFloatStateOf(.55f) }
    var choice by remember { mutableStateOf("design") }
    var choices by remember { mutableStateOf(setOf("design")) }
    var open by remember { mutableStateOf(false) }
    var selectedDate by remember { mutableStateOf<CivilDate?>(services.today()) }
    var time by remember { mutableIntStateOf(570) }
    var files by remember { mutableStateOf<List<FabricatorFile>>(emptyList()) }
    var color by remember { mutableStateOf(Color(.2f, .4f, .8f)) }
    val theme = LocalFabricatorTheme.current
    when (route) {
        "button" -> { FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) { FabricatorVariant.entries.forEach { variant -> FabricatorButton(variant.name, { toast.show("${variant.name} pressed") }, variant = variant) } }; Row { FabricatorButton("Disabled", {}, enabled = false); FabricatorButton("Saving", {}, isLoading = true) }; FlowRow { listOf(FabricatorSize.ExtraSmall, FabricatorSize.Small, FabricatorSize.Default, FabricatorSize.Large).forEach { FabricatorButton(it.name, { toast.show(it.name) }, size = it) } } }
        "input" -> { FabricatorInput(text, { text = it }, Modifier.fillMaxWidth(), "Your email", leading = { FabricatorIcon("mail") }); FabricatorInput("Invalid value", {}, isInvalid = true); FabricatorInput("Read only", {}, readOnly = true) }
        "textarea" -> FabricatorTextarea(text, { text = it }, Modifier.fillMaxWidth(), "Share a thought…")
        "checkbox" -> { FabricatorCheckbox(checked, { checked = it }, label = "Accept terms and conditions"); FabricatorCheckbox(androidx.compose.ui.state.ToggleableState.Indeterminate, {}, label = "Some items selected"); FabricatorCheckbox(false, {}, enabled = false, label = "Disabled") }
        "switch" -> { FabricatorSwitch(checked, { checked = it }, label = "Enable notifications"); FabricatorSwitch(false, {}, enabled = false, label = "Disabled") }
        "radio-group" -> FabricatorRadioGroup(choice, { choice = it }, demoOptions.map { it.value to it.label })
        "slider" -> { FabricatorSlider(fraction, { fraction = it }, gooey = FabricatorGooeyOptions(effect = FabricatorGooeyEffect.Bend, intensity = 1f, waviness = .6f)); FabricatorText("${(fraction * 100).toInt()}%"); FabricatorSlider(.3f, {}, enabled = false) }
        "gooey" -> GooeyDemo()
        "rating" -> FabricatorRating(number.toInt().coerceIn(0, 5), { number = it.toDouble() })
        "toggle" -> FabricatorToggle(checked, { checked = it }) { FabricatorIcon("bold"); FabricatorText("Bold") }
        "toggle-group" -> FabricatorToggleGroup(choices, { choices = it }, demoOptions.map { it.value to it.label }, multiple = true)
        "button-group" -> FabricatorButtonGroup { FabricatorButton("Save", { toast.show("Saved") }); FabricatorButton("Export", { toast.show("Export selected") }, variant = FabricatorVariant.Outline); FabricatorButton("Share", { toast.show("Share selected") }, variant = FabricatorVariant.Outline) }
        "avatar" -> Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) { FabricatorAvatar("AM"); FabricatorAvatar("JD", size = 48.dp); FabricatorAvatar("KT", size = 64.dp) }
        "badge" -> FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) { FabricatorVariant.entries.take(5).forEach { FabricatorBadge(it.name, variant = it) } }
        "label" -> FabricatorLabel("Email address", required = true)
        "kbd" -> Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) { FabricatorKbd("⌘"); FabricatorKbd("K"); FabricatorKbd("Enter") }
        "separator" -> { FabricatorText("Workspace"); FabricatorSeparator(); FabricatorText("Settings", muted = true) }
        "aspect-ratio" -> FabricatorAspectRatio(16f / 9f, Modifier.fillMaxWidth().background(theme.color("muted"))) { LandscapeExample() }
        "scroll-area" -> FabricatorScrollArea(Modifier.height(220.dp).fillMaxWidth()) { repeat(40) { FabricatorItem("Item ${it + 1}", description = "Native scrolling and keyboard focus"); FabricatorSeparator() } }
        "skeleton" -> Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) { FabricatorSkeleton(Modifier.size(40.dp)); Column(verticalArrangement = Arrangement.spacedBy(8.dp)) { FabricatorSkeleton(Modifier.width(180.dp).height(14.dp)); FabricatorSkeleton(Modifier.width(120.dp).height(12.dp)) } }
        "spinner" -> { var variant by remember { mutableStateOf(FabricatorSpinnerVariant.Orbit) }; FabricatorSelect(variant.key, { key -> variant = FabricatorSpinnerVariant.entries.first { it.key == key } }, FabricatorGenerated.spinners.map { FabricatorOption(it.value, it.label, it.description) }); Row(horizontalArrangement = Arrangement.spacedBy(16.dp), verticalAlignment = Alignment.CenterVertically) { FabricatorSpinner(variant = variant, size = 48.dp); FabricatorText("Loading your workspace", muted = true) }; FlowRow(horizontalArrangement = Arrangement.spacedBy(20.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) { FabricatorSpinnerVariant.entries.forEach { pattern -> Column(horizontalAlignment = Alignment.CenterHorizontally) { FabricatorSpinner(variant = pattern, size = 32.dp); FabricatorText(pattern.key, muted = true, size = 11) } } } }
        "progress" -> { FabricatorProgress(fraction); FabricatorSlider(fraction, { fraction = it }) }
        "density" -> FabricatorDensity.entries.forEach { density -> FabricatorDensity(density) { Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) { FabricatorText(density.name); FabricatorButton("Create project", { toast.show(density.name) }); FabricatorInput("", {}, placeholder = "Project name") } } }
        "theme-toggle" -> { FabricatorThemeToggle(checked, { checked = it }); FabricatorText("Use the app toolbar to apply the theme to the gallery.", muted = true) }
        "text", "typography" -> { FabricatorText("Build with clarity", weight = FontWeight.SemiBold, size = 16); FabricatorText("A consistent type scale, native text rendering."); FabricatorText("Secondary information stays quiet.", muted = true, size = 12); FabricatorText("Small labels", weight = FontWeight.Medium, size = 11) }
        "fabricator-root" -> FabricatorTheme(theme.isDark, fontFamily = theme.fontFamily) { Box(Modifier.fillMaxWidth().height(180.dp).background(theme.color("background")), contentAlignment = Alignment.Center) { FabricatorButton("A themed native surface", { toast.show("Native root") }) } }
        "select" -> FabricatorSelect(choice, { choice = it }, demoOptions)
        "combobox" -> FabricatorCombobox(choice, { choice = it }, demoOptions)
        "multi-select" -> FabricatorMultiSelect(choices, { choices = it }, demoOptions)
        "search" -> { FabricatorSearch(text, { text = it }); demoOptions.filter { it.label.contains(text, true) }.forEach { FabricatorItem(it.label, description = it.description) } }
        "number-field" -> FabricatorNumberField(number, { number = it }, minimum = 0.0, maximum = 100.0, step = .5)
        "input-otp" -> { FabricatorInputOtp(text, { text = it }); FabricatorText("${text.length} of 6 digits", muted = true) }
        "input-group" -> FabricatorInputGroup(leading = { FabricatorIcon("link") }, trailing = { FabricatorKbd("↵") }) { FabricatorInput(text, { text = it }, Modifier.weight(1f), "https://example.com") }
        "calendar" -> FabricatorCalendar(selectedDate, { selectedDate = it }, initialMonth = services.today())
        "date-picker" -> FabricatorDatePicker(selectedDate, { selectedDate = it })
        "time-input" -> FabricatorTimeInput(time, { time = it })
        "time-wheel" -> FabricatorTimeWheel(time, { time = it })
        "color-picker" -> FabricatorColorPicker(color, { color = it })
        "file-upload" -> FabricatorFileUpload(files, { files = it })
        "field", "form" -> { var form by remember { mutableStateOf(FormState()) }; FabricatorForm(form, { form = it }, mapOf("email" to listOf(FormRule.Required, FormRule.Email)), { toast.show("Form submitted", it["email"]) }) { submit -> FabricatorField("Email", error = form.errors["email"], description = "We'll never share your email.", required = true) { FabricatorInput(form.values["email"].orEmpty(), { form = form.change("email", it) }, Modifier.fillMaxWidth(), "you@example.com", isInvalid = "email" in form.errors) }; FabricatorButton("Submit", submit) } }
        "dialog" -> { FabricatorButton("Edit profile", { open = true }); FabricatorDialog(open, { open = false }, "Edit profile", description = "Make changes to your profile here.") { FabricatorField("Name") { FabricatorInput(text, { text = it }, placeholder = "Alex Morgan") }; FabricatorButton("Save changes", { open = false; toast.show("Profile saved") }) } }
        "alert-dialog" -> { FabricatorButton("Delete project", { open = true }, variant = FabricatorVariant.Destructive); FabricatorAlertDialog(open, { open = false }, "Delete project?", "This action cannot be undone.", "Delete project", { open = false; toast.show("Project deleted") }, destructive = true) }
        "sheet", "drawer" -> { FabricatorButton("Open ${route}", { open = true }); if (route == "sheet") FabricatorSheet(open, { open = false }, "Project settings") { FabricatorField("Project name") { FabricatorInput(text, { text = it }) }; FabricatorButton("Save", { open = false }) } else FabricatorDrawer(open, { open = false }, "Move goal") { FabricatorNumberField(number, { number = it }, minimum = 0.0); FabricatorButton("Set goal", { open = false }) } }
        "popover" -> Box { FabricatorButton("Dimensions", { open = true }, variant = FabricatorVariant.Outline); FabricatorPopover(open, { open = false }) { FabricatorField("Width") { FabricatorNumberField(number, { number = it }, minimum = 0.0) } } }
        "dropdown-menu" -> Box { FabricatorButton("Open menu", { open = true }, variant = FabricatorVariant.Outline); FabricatorDropdownMenu(open, { open = false }) { FabricatorMenuItem("Profile", { open = false; toast.show("Profile selected") }, icon = "user"); FabricatorMenuItem("Settings", { open = false; toast.show("Settings selected") }, icon = "settings", shortcut = "⌘,"); FabricatorSeparator(); FabricatorMenuItem("Sign out", { open = false; toast.show("Sign out selected") }, icon = "log-out") } }
        "tooltip" -> FabricatorTooltip("Add to your library") { FabricatorButton("Hover or focus", { toast.show("Added to library") }, variant = FabricatorVariant.Outline) }
        "hover-card" -> FabricatorHoverCard(trigger = { FabricatorButton("@fabricator", {}, variant = FabricatorVariant.Link) }) { FabricatorAvatar("FU"); FabricatorText("Fabricator UI", weight = FontWeight.Medium); FabricatorText("Components for every platform.", muted = true) }
        "context-menu" -> FabricatorContextMenu(content = { Box(Modifier.fillMaxWidth().height(180.dp), contentAlignment = Alignment.Center) { FabricatorText("Long press, or use the menu key", muted = true) } }, menu = { FabricatorMenuItem("Copy", { services.writeClipboard("Fabricator UI"); toast.show("Copied") }, icon = "copy"); FabricatorMenuItem("Share", { toast.show("Share selected") }, icon = "share") })
        "command" -> FabricatorCommand(demoNavigation.map { item -> FabricatorCommandItem(item.id, item.title, "Workspace", item.icon, onSelect = { toast.show("${item.title} selected") }) })
        "menubar" -> MenubarExample(toast)
        "accordion" -> FabricatorAccordion(listOf(FabricatorAccordionItem("design", "Does it share the web design system?") { FabricatorText("Yes. Tokens, icons and sound recipes are generated from the same canonical source.") }, FabricatorAccordionItem("native", "Is text editing native?") { FabricatorText("Compose Foundation preserves the native IME, focus and selection path.") }), choices, { choices = it })
        "collapsible" -> { FabricatorButton(if (open) "Hide details" else "Show details", { open = !open }, variant = FabricatorVariant.Outline); FabricatorCollapsible(open) { FabricatorItem("@fabricator-ui/registry", description = "Copy-in source. Your code, your application.") } }
        "card" -> FabricatorCard(title = "Create a project", description = "Bring your next idea to life.") { FabricatorField("Name") { FabricatorInput(text, { text = it }, placeholder = "My project") }; FabricatorButton("Create project", { toast.show("Project created", text) }, enabled = text.isNotBlank()) }
        "item" -> FabricatorItem("Project invitation", description = "Alex invited you to Fabricator UI.", leading = { FabricatorAvatar("AM") }, trailing = { FabricatorButton("Accept", { toast.show("Invitation accepted") }) })
        "tabs", "tab-strip" -> FabricatorTabs(choice, { choice = it }, demoOptions.map { FabricatorTab(it.value, it.label, canClose = false) }, gooey = FabricatorGooeyOptions(effect = FabricatorGooeyEffect.Move, intensity = 1f, waviness = .35f)) { selected -> FabricatorText(demoOptions.first { it.value == selected }.description.orEmpty()) }
        "breadcrumb" -> FabricatorBreadcrumb(listOf("Workspace" to { toast.show("Workspace selected") }, "Projects" to { toast.show("Projects selected") }, "Fabricator UI" to null))
        "pagination" -> FabricatorPagination(number.toInt().coerceIn(0, 9), 10, { number = it.toDouble() })
        "carousel" -> FabricatorCarousel(5) { index -> FabricatorCard(Modifier.height(180.dp), title = "Project ${index + 1}") { FabricatorText("Swipe or use the navigation buttons.", muted = true) } }
        "resizable" -> FabricatorResizable(fraction, { fraction = it }, Modifier.fillMaxWidth().height(180.dp), { FabricatorCard(Modifier.fillMaxSize()) { FabricatorText("Sidebar") } }, { FabricatorCard(Modifier.fillMaxSize()) { FabricatorText("Content") } })
        "direction" -> FabricatorDirection { Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { FabricatorIcon("arrow-right"); FabricatorText("Left-to-right layout") } }
        "navigation-menu" -> FabricatorNavigationMenu(demoNavigation, choice, { choice = it })
        "app-nav" -> FabricatorAppNav(demoNavigation, choice, { choice = it }, Modifier.height(260.dp))
        "sidebar" -> FabricatorSidebar(demoNavigation, choice, { choice = it }, Modifier.height(380.dp), header = { FabricatorText("Workspace", Modifier.padding(16.dp), weight = FontWeight.Medium) }, footer = { FabricatorUserMenu("Alex Morgan", "alex@example.com") })
        "app-shell" -> FabricatorAppShellBlock(5, Modifier.fillMaxWidth().height(560.dp), onAction = { toast.show(it) })
        "preview-rail" -> FabricatorPreviewRail(demoNavigation, choice, { choice = it }, Modifier.height(300.dp)) { FabricatorText("Selected: $it") }
        "workspace-switcher" -> FabricatorWorkspaceSwitcher(choice, { choice = it }, demoOptions)
        "user-menu" -> FabricatorUserMenu("Alex Morgan", "alex@example.com", onSettings = { toast.show("Settings selected") }, onSignOut = { toast.show("Sign out selected") })
        "alert" -> { FabricatorAlert("Your project is ready", "You can now invite your team.", role = FabricatorRole.Success, icon = "circle-check"); FabricatorAlert("Payment failed", "Check your billing details.", role = FabricatorRole.Destructive, icon = "circle-alert") }
        "empty" -> FabricatorEmpty("No projects yet", "Create your first project to get started.", action = { FabricatorButton("Create project", { toast.show("Project created") }) })
        "toast", "sonner" -> { FabricatorButton("Show notification", { toast.show("Project created", "Your workspace is ready.", actionLabel = "Undo", action = { toast.show("Creation undone") }) }); FabricatorButton("Show success", { toast.show("Changes saved", role = FabricatorRole.Success) }, variant = FabricatorVariant.Outline) }
        "markdown" -> FabricatorMarkdown(demoMarkdown)
        "syntax-highlight" -> FabricatorSyntaxHighlight("data class Project(val id: String, val name: String)\n\nfun createProject(name: String) {\n    val project = Project(\"new\", name)\n    return project\n}")
        "table" -> FabricatorTable(listOf("Invoice", "Status", "Amount"), listOf(listOf("INV001", "Paid", "$250.00"), listOf("INV002", "Pending", "$150.00"), listOf("INV003", "Paid", "$350.00")), caption = "Recent invoices")
        "data-table" -> DataTableExample()
        "editor" -> { var editor by remember { mutableStateOf(EditorHistory(createEditorStateFromMarkdown("# Project notes\n\nSelect text, then choose **Bold** or _Italic_.\n\n- Native text editing\n- Type / for commands"))) }; FabricatorEditor(editor, { editor = it }, onExportMarkdown = { services.writeClipboard(it); toast.show("Markdown copied") }, onExportJson = { services.writeClipboard(it); toast.show("Document JSON copied") }) }
        "event-calendar" -> { var events by remember { mutableStateOf(listOf(CalendarEvent("review", "Design review", services.today(), 600, recurrence = EventRecurrence.Weekly), CalendarEvent("release", "Release planning", services.today(), 840))) }; FabricatorEventCalendar(events, { events = it }, initialDate = services.today()) }
        "file-tree" -> { var expanded by remember { mutableStateOf(setOf("src")) }; FabricatorFileTree(listOf(FileNode("src", "src", listOf(FileNode("ui", "ui", listOf(FileNode("button", "button.kt"), FileNode("theme", "theme.kt"))), FileNode("main", "main.kt"))), FileNode("readme", "README.md")), expanded, { expanded = it }, choice, { choice = it }) }
        "image-compare" -> FabricatorImageCompare(fraction, { fraction = it }, before = { LandscapeExample() }, after = { LandscapeExample(true) })
        "audio-player", "video-player" -> { FabricatorFileUpload(files, { files = it }, multiple = false, mimeTypes = listOf(if (route == "audio-player") "audio/*" else "video/*")); files.firstOrNull()?.let { file -> if (route == "audio-player") FabricatorAudioPlayer(file.uri, file.name) else FabricatorVideoPlayer(file.uri) } }
        "attachment" -> FabricatorAttachment(FabricatorFile("project-notes.pdf", "", 128000, "application/pdf"), onOpen = { toast.show("Attachment selected") }, onRemove = { toast.show("Attachment removed") })
        "bubble" -> { FabricatorBubble(FabricatorMessageRole.User) { FabricatorText("Can you help me design a project page?") }; FabricatorBubble(FabricatorMessageRole.Assistant) { FabricatorText("Let's start with a clear layout and a few useful components.") } }
        "message" -> FabricatorMessage(FabricatorChatMessage("one", FabricatorMessageRole.Assistant, "Here is a **first draft** of your project page.\n\n- A useful overview\n- Recent activity\n- A clear next action", "Fabricator"), onCopy = { services.writeClipboard(it); toast.show("Copied") })
        "chat-input" -> FabricatorChatInput(text, { text = it }, { toast.show("Message sent", text); text = "" })
        "message-scroller" -> { var messages by remember { mutableStateOf(listOf(FabricatorChatMessage("1", FabricatorMessageRole.User, "What's new?"), FabricatorChatMessage("2", FabricatorMessageRole.Assistant, "A native component gallery, using the same Fabricator UI design system."))) }; FabricatorMessageScroller(messages, Modifier.fillMaxWidth().height(380.dp)); FabricatorChatInput(text, { text = it }, { messages = messages + FabricatorChatMessage((messages.size + 1).toString(), FabricatorMessageRole.User, text); text = "" }) }
        "marker" -> { FabricatorMarker("Reviewing project files"); FabricatorMarker("Design review complete", isComplete = true) }
        "model-picker" -> FabricatorModelPicker(choice, { choice = it }, demoOptions)
        "questionnaire" -> { var answers by remember { mutableStateOf<Map<String, Set<String>>>(emptyMap()) }; FabricatorQuestionnaire(listOf(FabricatorQuestion("role", "What do you work on?", demoOptions), FabricatorQuestion("goal", "What would you like to build?")), answers, { answers = it }, { toast.show("Answers submitted") }) }
        "bot-face" -> { var state by remember { mutableStateOf(FabricatorBotFaceState.Idle) }; var shape by remember { mutableStateOf(FabricatorBotFaceShape.Squircle) }; FabricatorBotFace(state, shape = shape); FabricatorSelect(state.name, { state = FabricatorBotFaceState.valueOf(it) }, FabricatorBotFaceState.entries.map { FabricatorOption(it.name, it.name) }); FabricatorSelect(shape.name, { shape = FabricatorBotFaceShape.valueOf(it) }, FabricatorBotFaceShape.entries.map { FabricatorOption(it.name, it.name) }) }
        "sounds" -> FabricatorSounds()
        "area-chart", "bar-chart", "bump-chart", "candlestick-chart", "composition-chart", "donut-chart", "funnel-chart", "heat-calendar", "line-chart", "pie-chart", "radar-chart", "radial-chart", "sankey-chart", "status-bar", "treemap" -> ChartExample(route)
        else -> error("Missing Compose gallery route: $route")
    }
}

@Composable
private fun MenubarExample(toast: FabricatorToastState) {
    val file: @Composable ColumnScope.() -> Unit = { FabricatorMenuItem("New project", { toast.show("New project") }, shortcut = "⌘N"); FabricatorMenuItem("Open…", { toast.show("Open selected") }, shortcut = "⌘O") }
    val edit: @Composable ColumnScope.() -> Unit = { FabricatorMenuItem("Undo", { toast.show("Undo") }, shortcut = "⌘Z"); FabricatorMenuItem("Redo", { toast.show("Redo") }, shortcut = "⌘⇧Z") }
    FabricatorMenubar(listOf("File" to file, "Edit" to edit))
}

@Composable
private fun DashboardExample() {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        FabricatorText("Good morning, Alex", weight = FontWeight.SemiBold, size = 16)
        FabricatorText("Here's what's happening in your workspace.", muted = true)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            listOf("Active projects" to "12", "Tasks completed" to "48", "Team members" to "8").forEach { (title, value) -> FabricatorCard(Modifier.widthIn(min = 180.dp), title = title) { FabricatorText(value, weight = FontWeight.SemiBold, size = 16); FabricatorBadge("+12% this month") } }
        }
        FabricatorCard(Modifier.fillMaxWidth(), title = "Recent activity") { FabricatorItem("Design system updated", description = "Alex · 2 hours ago", leading = { FabricatorAvatar("AM") }); FabricatorSeparator(); FabricatorItem("Mobile gallery ready for review", description = "Jamie · 3 hours ago", leading = { FabricatorAvatar("JD") }) }
    }
}

private data class DemoInvoice(val id: String, val email: String, val status: String, val amount: Double)
@Composable
private fun DataTableExample() {
    var state by remember { mutableStateOf(TableState(pageSize = 5, pinnedColumns = mapOf("id" to TablePinSide.Start))) }
    var rows by remember { mutableStateOf(List(24) { index -> DemoInvoice("INV${(index + 1).toString().padStart(3, '0')}", listOf("alex@example.com", "jamie@example.com", "taylor@example.com")[index % 3], listOf("Paid", "Pending", "Processing")[index % 3], (index + 1) * 24.5) }) }
    val columns = remember { listOf(TableColumn<DemoInvoice>("id", "Invoice", { it.id }), TableColumn("email", "Email", { it.email }, update = { row, value -> row.copy(email = value) }, validate = { value -> if ('@' in value) null else "Enter a valid email." }), TableColumn("status", "Status", { it.status }, update = { row, value -> row.copy(status = value) }), TableColumn("amount", "Amount", { "$${it.amount}" }, { it.amount }, editValue = { it.amount.toString() }, update = { row, value -> row.copy(amount = value.toDouble()) }, validate = { value -> if (value.toDoubleOrNull()?.let { it >= 0 && it.isFinite() } == true) null else "Enter a positive amount." })) }
    FabricatorDataTable(rows, columns, { it.id }, state, { state = it }, onRowsChange = { rows = it })
}

@Composable
private fun ChartExample(route: String) {
    var selected by remember { mutableStateOf<Int?>(null) }
    val labels = listOf("Jan", "Feb", "Mar", "Apr", "May", "Jun")
    val series = listOf(FabricatorChartSeries("desktop", "Desktop", listOf(186.0, 305.0, 237.0, 73.0, 209.0, 214.0)), FabricatorChartSeries("mobile", "Mobile", listOf(80.0, 200.0, 120.0, 190.0, 130.0, 140.0)))
    val data = listOf(FabricatorChartDatum("Direct", 275.0), FabricatorChartDatum("Search", 200.0), FabricatorChartDatum("Social", 187.0), FabricatorChartDatum("Referral", 173.0))
    when (route) {
        "line-chart" -> FabricatorLineChart(labels, series, selectedIndex = selected, onSelect = { selected = it })
        "area-chart" -> FabricatorAreaChart(labels, series, selectedIndex = selected, onSelect = { selected = it })
        "bar-chart" -> FabricatorBarChart(labels, series, selectedIndex = selected, onSelect = { selected = it })
        "composition-chart" -> FabricatorCompositionChart(labels, series, selectedIndex = selected, onSelect = { selected = it })
        "bump-chart" -> FabricatorBumpChart(labels, series, selectedIndex = selected, onSelect = { selected = it })
        "pie-chart" -> FabricatorPieChart(data, selectedIndex = selected, onSelect = { selected = it })
        "donut-chart" -> FabricatorDonutChart(data, selectedIndex = selected, onSelect = { selected = it })
        "radar-chart" -> FabricatorRadarChart(labels, series)
        "radial-chart" -> FabricatorRadialChart(data, maximum = 300.0)
        "funnel-chart" -> FabricatorFunnelChart(data, onSelect = { selected = it })
        "status-bar" -> { val first = CivilDate(2026, 8, 18); val periods = List(90) { index -> val day = first.plusDays(index); FabricatorStatusPeriod(day.toString(), day.toString(), when (index) { 22, 23 -> "degraded"; 45 -> "outage"; 60 -> "maintenance"; in 0..3 -> null; else -> "operational" }, if (index == 45) "Database connection incident, resolved in 24 minutes." else null) }; FabricatorStatusBar(periods, label = "API availability", onSelect = { selected = it }) }
        "treemap" -> FabricatorTreemap(data, onSelect = { selected = it })
        "heat-calendar" -> { val start = CivilDate(2026, 1, 1); FabricatorHeatCalendar(List(180) { FabricatorHeatDay(start.plusDays(it), ((it * 7) % 11).toDouble()) }) }
        "candlestick-chart" -> FabricatorCandlestickChart(labels.mapIndexed { index, label -> FabricatorCandle(label, 100.0 + index * 5, 104.0 + index * 3, 95.0 + index * 3, 110.0 + index * 5) }, selectedIndex = selected, onSelect = { selected = it })
        "sankey-chart" -> FabricatorSankeyChart(listOf(FabricatorSankeyNode("visit", "Visitors", 0), FabricatorSankeyNode("trial", "Trials", 1), FabricatorSankeyNode("paid", "Customers", 2), FabricatorSankeyNode("exit", "Exit", 2)), listOf(FabricatorSankeyLink("visit", "trial", 120.0), FabricatorSankeyLink("trial", "paid", 80.0), FabricatorSankeyLink("trial", "exit", 40.0)))
    }
}

@Composable
private fun LandscapeExample(isAfter: Boolean = false) {
    val theme = LocalFabricatorTheme.current
    val colors = if (isAfter) listOf(theme.color("info").copy(alpha = .35f), theme.color("success").copy(alpha = .4f)) else listOf(theme.color("muted"), theme.color("accent"))
    Box(Modifier.fillMaxSize().background(Brush.verticalGradient(colors)), contentAlignment = Alignment.Center) { FabricatorIcon("mountain", size = 80.dp, color = theme.color("foreground").copy(alpha = .4f)) }
}

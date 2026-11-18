package dev.fabricator.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.*
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import dev.fabricator.ui.models.*

private enum class BlockAuthLayout { Card, Split, ProviderCard, ImageCard, EmailOnly }
private data class BlockAuthSpecification(val name: String, val signup: Boolean, val layout: BlockAuthLayout, val title: String, val description: String) {
    val hasName get() = name in listOf("signup-01", "signup-02", "signup-03")
    val hasPassword get() = layout != BlockAuthLayout.EmailOnly
    val hasConfirmation get() = signup && hasPassword
}
private fun getBlockAuthSpecification(name: String): BlockAuthSpecification {
    val signup = name.startsWith("signup-")
    val variant = name.substringAfterLast('-').toIntOrNull()
    require((signup || name.startsWith("login-")) && variant != null && variant in 1..5) { "Unknown authentication block: $name" }
    val layout = when (variant) { 1 -> BlockAuthLayout.Card; 2 -> BlockAuthLayout.Split; 3 -> BlockAuthLayout.ProviderCard; 4 -> BlockAuthLayout.ImageCard; else -> BlockAuthLayout.EmailOnly }
    val title = when { variant == 5 -> "Welcome to Acme Inc."; signup && variant == 1 -> "Create an account"; signup -> "Create your account"; variant in listOf(3, 4) -> "Welcome back"; else -> "Login to your account" }
    val description = when { variant == 5 -> ""; signup && variant == 1 -> "Enter your information below to create your account"; signup && variant == 2 -> "Fill in the form below to create your account"; signup -> "Enter your email below to create your account"; variant == 3 -> "Login with your Apple or Google account"; variant == 4 -> "Login to your Acme Inc account"; else -> "Enter your email below to login to your account" }
    return BlockAuthSpecification(name, signup, layout, title, description)
}

/** Required fields follow each published template, including its email-only flow. */
fun validateFabricatorAuthValues(values: Map<String, String>, template: String): Map<String, String> {
    val specification = getBlockAuthSpecification(template)
    val errors = mutableMapOf<String, String>()
    val email = values["email"].orEmpty().trim()
    val parts = email.split('@')
    if (parts.size != 2 || parts[0].isEmpty() || !parts[1].contains('.') || parts[1].split('.').any { it.isEmpty() } || email.any { it.isWhitespace() }) errors["email"] = "Enter a valid email address."
    if (specification.hasName && values["name"].isNullOrBlank()) errors["name"] = "Enter your full name."
    val password = values["password"].orEmpty()
    if (specification.hasPassword) {
        if (password.isEmpty()) errors["password"] = "Enter your password."
        else if (specification.signup && password.length < 8) errors["password"] = "Must be at least 8 characters long."
    }
    if (specification.hasConfirmation && values["confirmPassword"].orEmpty() != password) errors["confirmPassword"] = "Passwords must match."
    return errors
}

@Composable
fun FabricatorLoginBlock(variant: Int = 1, modifier: Modifier = Modifier, onLogin: (Map<String, String>) -> Unit, onProviderLogin: (String) -> Unit, onForgotPassword: () -> Unit = {}, onSignup: () -> Unit = {}) {
    require(variant in 1..5)
    BlockAuthentication(getBlockAuthSpecification("login-0$variant"), modifier, onLogin, onProviderLogin, onSignup, onForgotPassword)
}

@Composable
fun FabricatorSignupBlock(variant: Int = 1, modifier: Modifier = Modifier, onSignup: (Map<String, String>) -> Unit, onProviderSignup: (String) -> Unit, onLogin: () -> Unit = {}) {
    require(variant in 1..5)
    BlockAuthentication(getBlockAuthSpecification("signup-0$variant"), modifier, onSignup, onProviderSignup, onLogin, {})
}

@Composable
private fun BlockAuthentication(specification: BlockAuthSpecification, modifier: Modifier, onSubmit: (Map<String, String>) -> Unit, onProvider: (String) -> Unit, onSwitchAccount: () -> Unit, onForgotPassword: () -> Unit) {
    val theme = LocalFabricatorTheme.current
    var values by remember(specification.name) { mutableStateOf<Map<String, String>>(emptyMap()) }
    var hasSubmitted by remember(specification.name) { mutableStateOf(false) }
    val errors = if (hasSubmitted) validateFabricatorAuthValues(values, specification.name) else emptyMap()
    val submit = { hasSubmitted = true; if (validateFabricatorAuthValues(values, specification.name).isEmpty()) onSubmit(values) }
    val fields: @Composable () -> Unit = { BlockAuthFields(specification, values, { key, value -> values = values + (key to value) }, errors, submit, onProvider, onSwitchAccount, onForgotPassword) }
    BoxWithConstraints(modifier.fillMaxWidth().imePadding().verticalScroll(rememberScrollState()).heightIn(min = 540.dp).background(theme.color(if (specification.layout in listOf(BlockAuthLayout.ProviderCard, BlockAuthLayout.ImageCard)) "muted" else "background"))) {
        val wide = maxWidth >= 768.dp
        val headingContent: @Composable () -> Unit = { Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) { FabricatorText(specification.title, Modifier.semantics { heading() }, weight = FontWeight.SemiBold, size = 24, textAlign = TextAlign.Center); if (specification.description.isNotEmpty()) FabricatorText(specification.description, muted = true, textAlign = TextAlign.Center) } }
        val form: @Composable () -> Unit = { Column(verticalArrangement = Arrangement.spacedBy(24.dp)) { headingContent(); fields() } }
        when (specification.layout) {
            BlockAuthLayout.Card -> Box(Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) { FabricatorCard(Modifier.widthIn(max = 384.dp), title = specification.title, description = specification.description) { fields() } }
            BlockAuthLayout.Split -> Row(Modifier.fillMaxWidth().heightIn(min = if (specification.signup) 760.dp else 620.dp)) {
                Column(Modifier.weight(1f).padding(if (wide) 40.dp else 24.dp), verticalArrangement = Arrangement.spacedBy(40.dp), horizontalAlignment = Alignment.CenterHorizontally) { BlockAuthBrand(); Box(Modifier.widthIn(max = 320.dp)) { form() } }
                if (wide) BlockAuthIllustration(Modifier.weight(1f).height(if (specification.signup) 760.dp else 620.dp))
            }
            BlockAuthLayout.ProviderCard -> Column(Modifier.fillMaxWidth().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(24.dp)) {
                BlockAuthBrand()
                FabricatorCard(Modifier.widthIn(max = 384.dp)) { headingContent(); if (!specification.signup) { BlockAuthProvider("apple", "Login with Apple", onProvider); BlockAuthProvider("google", "Login with Google", onProvider); BlockAuthSeparator("Or continue with") }; fields() }
                BlockAuthLegal(Modifier.widthIn(max = 384.dp))
            }
            BlockAuthLayout.ImageCard -> Column(Modifier.fillMaxWidth().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(24.dp)) {
                Row(Modifier.widthIn(max = 896.dp).clip(RoundedCornerShape(theme.radius("2xl"))).background(theme.color("card"))) {
                    Box(Modifier.weight(1f).padding(32.dp)) { form() }
                    if (wide) BlockAuthIllustration(Modifier.weight(1f).height(if (specification.signup) 670.dp else 590.dp))
                }
                BlockAuthLegal(Modifier.widthIn(max = 768.dp))
            }
            BlockAuthLayout.EmailOnly -> Column(Modifier.fillMaxWidth().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Column(Modifier.widthIn(max = 384.dp), verticalArrangement = Arrangement.spacedBy(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    FabricatorIcon("gallery-vertical-end", size = 24.dp)
                    FabricatorText(specification.title, Modifier.semantics { heading() }, weight = FontWeight.SemiBold, size = 20)
                    BlockAuthAccountPrompt(specification.signup, onSwitchAccount); fields(); BlockAuthSeparator("Or")
                    if (this@BoxWithConstraints.maxWidth >= 430.dp) Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) { Box(Modifier.weight(1f)) { BlockAuthProvider("apple", "Continue with Apple", onProvider) }; Box(Modifier.weight(1f)) { BlockAuthProvider("google", "Continue with Google", onProvider) } }
                    else { BlockAuthProvider("apple", "Continue with Apple", onProvider); BlockAuthProvider("google", "Continue with Google", onProvider) }
                    BlockAuthLegal()
                }
            }
        }
    }
}

@Composable
private fun BlockAuthFields(specification: BlockAuthSpecification, values: Map<String, String>, onChange: (String, String) -> Unit, errors: Map<String, String>, submit: () -> Unit, onProvider: (String) -> Unit, onSwitchAccount: () -> Unit, onForgotPassword: () -> Unit) {
    val variant = specification.name.takeLast(2).toInt()
    val password: @Composable (Modifier) -> Unit = { modifier ->
        Column(modifier, verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) { FabricatorLabel("Password", Modifier.weight(1f)); if (!specification.signup) FabricatorButton("Forgot your password?", onForgotPassword, variant = FabricatorVariant.Link, size = FabricatorSize.ExtraSmall) }
            FabricatorInput(values["password"].orEmpty(), { onChange("password", it) }, Modifier.fillMaxWidth(), isPassword = true, isInvalid = "password" in errors)
            if (errors["password"] != null) FabricatorText(errors.getValue("password"), color = LocalFabricatorTheme.current.color("destructive-text"), size = 12)
            else if (specification.signup && variant in listOf(1, 2)) FabricatorText("Must be at least 8 characters long.", muted = true, size = 12)
        }
    }
    val confirmation: @Composable (Modifier) -> Unit = { modifier -> FabricatorField("Confirm Password", modifier, description = if (variant in listOf(1, 2)) "Please confirm your password." else null, error = errors["confirmPassword"]) { FabricatorInput(values["confirmPassword"].orEmpty(), { onChange("confirmPassword", it) }, Modifier.fillMaxWidth(), isPassword = true, isInvalid = "confirmPassword" in errors) } }
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        if (specification.hasName) FabricatorField("Full Name", error = errors["name"]) { FabricatorInput(values["name"].orEmpty(), { onChange("name", it) }, Modifier.fillMaxWidth(), "John Doe", isInvalid = "name" in errors) }
        FabricatorField("Email", description = if (specification.signup && variant in listOf(1, 2, 4)) "We'll use this to contact you. We will not share your email with anyone else." else null, error = errors["email"]) { FabricatorInput(values["email"].orEmpty(), { onChange("email", it) }, Modifier.fillMaxWidth(), "m@example.com", keyboardType = KeyboardType.Email, isInvalid = "email" in errors) }
        if (specification.hasPassword) {
            if (specification.signup && variant in listOf(3, 4)) { Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) { password(Modifier.weight(1f)); confirmation(Modifier.weight(1f)) }; FabricatorText("Must be at least 8 characters long.", muted = true, size = 12) }
            else { password(Modifier); if (specification.hasConfirmation) confirmation(Modifier) }
        }
        BlockFullButton(if (specification.signup) "Create Account" else "Login", submit)
        if (variant == 1) BlockAuthProvider("google", if (specification.signup) "Sign up with Google" else "Login with Google", onProvider, showsIcon = false)
        if (variant == 2) { BlockAuthSeparator("Or continue with"); BlockAuthProvider("github", if (specification.signup) "Sign up with GitHub" else "Login with GitHub", onProvider) }
        if (variant == 4) { BlockAuthSeparator("Or continue with"); Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) { listOf("apple", "google", "meta").forEach { provider -> Box(Modifier.weight(1f)) { BlockAuthProvider(provider, if (specification.signup) "Sign up with $provider" else "Login with $provider", onProvider, iconOnly = true) } } } }
        if (variant != 5) BlockAuthAccountPrompt(specification.signup, onSwitchAccount)
    }
}

@Composable
private fun BlockFullButton(title: String, onClick: () -> Unit, variant: FabricatorVariant = FabricatorVariant.Default, icon: String? = null, iconOnly: Boolean = false) {
    FabricatorButton(onClick, Modifier.fillMaxWidth().semantics { contentDescription = title }, variant) { if (icon != null) FabricatorIcon(icon); if (!iconOnly) FabricatorText(title, weight = FontWeight.Medium) }
}
@Composable private fun BlockAuthProvider(provider: String, title: String, onProvider: (String) -> Unit, showsIcon: Boolean = true, iconOnly: Boolean = false) { BlockFullButton(title, { onProvider(provider) }, FabricatorVariant.Outline, if (showsIcon) "brand-$provider" else null, iconOnly) }
@Composable private fun BlockAuthAccountPrompt(signup: Boolean, onClick: () -> Unit) { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) { FabricatorText(if (signup) "Already have an account?" else "Don't have an account?", muted = true, size = 12); FabricatorButton(if (signup) "Sign in" else "Sign up", onClick, variant = FabricatorVariant.Link, size = FabricatorSize.ExtraSmall) } }
@Composable private fun BlockAuthSeparator(title: String) { Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) { FabricatorSeparator(Modifier.weight(1f)); FabricatorText(title, muted = true, size = 12); FabricatorSeparator(Modifier.weight(1f)) } }
@Composable private fun BlockAuthLegal(modifier: Modifier = Modifier) { FabricatorMarkdown("By clicking continue, you agree to our [Terms of Service](#) and [Privacy Policy](#).", modifier) }
@Composable private fun BlockAuthBrand() { Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) { val theme = LocalFabricatorTheme.current; Box(Modifier.size(24.dp).clip(RoundedCornerShape(theme.radius("sm"))).background(theme.color("primary")), contentAlignment = Alignment.Center) { FabricatorIcon("gallery-vertical-end", color = theme.color("primary-foreground"), size = 16.dp) }; FabricatorText("Acme Inc.", weight = FontWeight.Medium) } }
@Composable private fun BlockAuthIllustration(modifier: Modifier) {
    val theme = LocalFabricatorTheme.current
    Box(modifier.background(theme.color("muted")).semantics { contentDescription = "Image placeholder" }, contentAlignment = Alignment.Center) {
        val stroke = theme.color("border").copy(alpha = .4f)
        Canvas(Modifier.fillMaxSize()) { val center = Offset(size.width / 2, size.height / 2); drawLine(stroke, center - Offset(140.dp.toPx(), 140.dp.toPx()), center + Offset(140.dp.toPx(), 140.dp.toPx())); drawLine(stroke, center + Offset(-140.dp.toPx(), 140.dp.toPx()), center + Offset(140.dp.toPx(), -140.dp.toPx())); drawLine(stroke, center - Offset(180.dp.toPx(), 0f), center + Offset(180.dp.toPx(), 0f)); drawLine(stroke, center - Offset(0f, 180.dp.toPx()), center + Offset(0f, 180.dp.toPx())); drawCircle(stroke, 110.dp.toPx(), center, style = Stroke(1.dp.toPx())) }
        Box(Modifier.size(96.dp).background(theme.color("background").copy(alpha = .65f), CircleShape), contentAlignment = Alignment.Center) { FabricatorIcon("image", color = theme.color("muted-foreground"), size = 32.dp) }
    }
}

private data class BlockNode(val title: String, val icon: String? = null, val emoji: String? = null, val badge: String? = null, val children: List<BlockNode> = emptyList())
private data class BlockSection(val title: String, val items: List<BlockNode>)
private object BlockContent {
    val documentation = listOf(
        BlockSection("Getting Started", listOf("Installation", "Project Structure").map { BlockNode(it) }),
        BlockSection("Build Your Application", listOf("Routing", "Data Fetching", "Rendering", "Caching", "Styling", "Optimizing", "Configuring", "Testing", "Authentication", "Deploying", "Upgrading", "Examples").map { BlockNode(it) }),
        BlockSection("API Reference", listOf("Components", "File Conventions", "Functions", "next.config.js Options", "CLI", "Edge Runtime").map { BlockNode(it) }),
        BlockSection("Architecture", listOf("Accessibility", "Fast Refresh", "Next.js Compiler", "Supported Browsers", "Turbopack").map { BlockNode(it) }),
        BlockSection("Community", listOf(BlockNode("Contribution Guide")))
    )
    val platform = listOf(BlockNode("Playground", "square-terminal", children = listOf("History", "Starred", "Settings").map { BlockNode(it) }), BlockNode("Models", "bot", children = listOf("Genesis", "Explorer", "Quantum").map { BlockNode(it) }), BlockNode("Documentation", "book-open", children = listOf("Introduction", "Get Started", "Tutorials", "Changelog").map { BlockNode(it) }), BlockNode("Settings", "settings-2", children = listOf("General", "Team", "Billing", "Limits").map { BlockNode(it) }))
    val projects = listOf(BlockNode("Design Engineering", "frame"), BlockNode("Sales & Marketing", "chart-pie"), BlockNode("Travel", "map"))
    val secondary = listOf(BlockNode("Support", "life-buoy"), BlockNode("Feedback", "send"))
    val favorites = listOf(
        BlockNode("Project Management & Task Tracking", emoji = "📊"), BlockNode("Family Recipe Collection & Meal Planning", emoji = "🍳"), BlockNode("Fitness Tracker & Workout Routines", emoji = "💪"), BlockNode("Book Notes & Reading List", emoji = "📚"), BlockNode("Sustainable Gardening Tips & Plant Care", emoji = "🌱"), BlockNode("Language Learning Progress & Resources", emoji = "🗣️"), BlockNode("Home Renovation Ideas & Budget Tracker", emoji = "🏠"), BlockNode("Personal Finance & Investment Portfolio", emoji = "💰"), BlockNode("Movie & TV Show Watchlist with Reviews", emoji = "🎬"), BlockNode("Daily Habit Tracker & Goal Setting", emoji = "✅")
    )
    val workspaces = listOf(
        BlockNode("Personal Life Management", emoji = "🏠", children = listOf(BlockNode("Daily Journal & Reflection", emoji = "📔"), BlockNode("Health & Wellness Tracker", emoji = "🍏"), BlockNode("Personal Growth & Learning Goals", emoji = "🌟"))),
        BlockNode("Professional Development", emoji = "💼", children = listOf(BlockNode("Career Objectives & Milestones", emoji = "🎯"), BlockNode("Skill Acquisition & Training Log", emoji = "🧠"), BlockNode("Networking Contacts & Events", emoji = "🤝"))),
        BlockNode("Creative Projects", emoji = "🎨", children = listOf(BlockNode("Writing Ideas & Story Outlines", emoji = "✍️"), BlockNode("Art & Design Portfolio", emoji = "🖼️"), BlockNode("Music Composition & Practice Log", emoji = "🎵"))),
        BlockNode("Home Management", emoji = "🏡", children = listOf(BlockNode("Household Budget & Expense Tracking", emoji = "💰"), BlockNode("Home Maintenance Schedule & Tasks", emoji = "🔧"), BlockNode("Family Calendar & Event Planning", emoji = "📅"))),
        BlockNode("Travel & Adventure", emoji = "🧳", children = listOf(BlockNode("Trip Planning & Itineraries", emoji = "🗺️"), BlockNode("Travel Bucket List & Inspiration", emoji = "🌎"), BlockNode("Travel Journal & Photo Gallery", emoji = "📸")))
    )
    val workspaceMain = listOf(BlockNode("Search", "search"), BlockNode("Ask AI", "sparkles"), BlockNode("Home", "house"), BlockNode("Inbox", "inbox", badge = "10"))
    val workspaceSecondary = listOf(BlockNode("Calendar", "calendar"), BlockNode("Settings", "settings-2"), BlockNode("Templates", "blocks"), BlockNode("Trash", "trash"), BlockNode("Help", "message-circle-question-mark"))
    val settings = listOf(BlockNode("Notifications", "bell"), BlockNode("Navigation", "menu"), BlockNode("Home", "house"), BlockNode("Appearance", "sun"), BlockNode("Messages & media", "message-circle"), BlockNode("Language & region", "globe"), BlockNode("Accessibility", "accessibility"), BlockNode("Mark as read", "check"), BlockNode("Audio & video", "video"), BlockNode("Connected accounts", "link"), BlockNode("Privacy & visibility", "lock"), BlockNode("Advanced", "settings-2"))
    val pageActions = listOf(listOf(BlockNode("Customize Page", "settings-2"), BlockNode("Turn into wiki", "file-text")), listOf(BlockNode("Copy Link", "link"), BlockNode("Duplicate", "copy"), BlockNode("Move to", "corner-up-right"), BlockNode("Move to Trash", "trash")), listOf(BlockNode("Undo", "corner-up-left"), BlockNode("View analytics", "chart-line"), BlockNode("Version History", "gallery-vertical-end"), BlockNode("Show delete pages", "trash"), BlockNode("Notifications", "bell")), listOf(BlockNode("Import", "arrow-up"), BlockNode("Export", "arrow-down")))
    val files = listOf(
        FileNode("app", "app", listOf(FileNode("app/api", "api", listOf(FileNode("app/api/hello", "hello", listOf(FileNode("app/api/hello/route.ts", "route.ts"))), FileNode("app/api/page.tsx", "page.tsx"), FileNode("app/api/layout.tsx", "layout.tsx"), FileNode("app/api/blog", "blog", listOf(FileNode("app/api/blog/page.tsx", "page.tsx"))))))),
        FileNode("components", "components", listOf(FileNode("components/ui", "ui", listOf(FileNode("components/ui/button.tsx", "button.tsx"), FileNode("components/ui/card.tsx", "card.tsx"))), FileNode("components/header.tsx", "header.tsx"), FileNode("components/footer.tsx", "footer.tsx"))),
        FileNode("lib", "lib", listOf(FileNode("lib/util.ts", "util.ts"))), FileNode("public", "public", listOf(FileNode("public/favicon.ico", "favicon.ico"), FileNode("public/vercel.svg", "vercel.svg"))),
        FileNode(".eslintrc.json", ".eslintrc.json"), FileNode(".gitignore", ".gitignore"), FileNode("next.config.js", "next.config.js"), FileNode("tailwind.config.js", "tailwind.config.js"), FileNode("package.json", "package.json"), FileNode("README.md", "README.md")
    )
}

@Composable
private fun BlockHeading(title: String) { FabricatorText(title, Modifier.padding(horizontal = 10.dp, vertical = 10.dp), muted = true, size = 11, weight = FontWeight.Medium) }

@Composable
private fun BlockBranch(node: BlockNode, selection: String, onSelect: (String) -> Unit, expanded: Set<String>, onExpandedChange: (Set<String>) -> Unit, modifier: Modifier = Modifier, plus: Boolean = false, separatesDisclosure: Boolean = false, depth: Int = 0) {
    val open = node.title in expanded
    val toggle = { onExpandedChange(if (open) expanded - node.title else expanded + node.title) }
    Column(modifier) {
        Row(Modifier.fillMaxWidth().padding(start = (depth * 14).dp), verticalAlignment = Alignment.CenterVertically) {
            FabricatorButton({ if (node.children.isNotEmpty() && !separatesDisclosure) toggle() else onSelect(node.title) }, Modifier.weight(1f).semantics { selected = selection == node.title; if (node.children.isNotEmpty()) stateDescription = if (open) "Expanded" else "Collapsed" }, if (selection == node.title) FabricatorVariant.Secondary else FabricatorVariant.Ghost) {
                if (node.icon != null) FabricatorIcon(node.icon)
                if (node.emoji != null) FabricatorText(node.emoji)
                FabricatorText(node.title, Modifier.weight(1f), maxLines = 1)
                if (node.badge != null) FabricatorText(node.badge, muted = true, size = 11)
                if (node.children.isNotEmpty() && !separatesDisclosure) FabricatorIcon(if (plus) { if (open) "minus" else "plus" } else if (open) "chevron-down" else "chevron-right", size = 12.dp)
            }
            if (node.children.isNotEmpty() && separatesDisclosure) BlockIconButton(if (open) "Collapse ${node.title}" else "Expand ${node.title}", if (open) "chevron-down" else "chevron-right", toggle)
        }
        FabricatorCollapsible(open) { Column { node.children.forEach { BlockBranch(it, selection, onSelect, expanded, onExpandedChange, plus = plus, separatesDisclosure = separatesDisclosure, depth = depth + 1) } } }
    }
}

@Composable private fun BlockIconButton(title: String, icon: String, onClick: () -> Unit) { FabricatorButton(onClick, Modifier.semantics { contentDescription = title }, FabricatorVariant.Ghost, FabricatorSize.Icon) { FabricatorIcon(icon, size = 16.dp) } }

@Composable
private fun BlockMenu(title: String, icon: String? = null, modifier: Modifier = Modifier, content: @Composable ColumnScope.(close: () -> Unit) -> Unit) {
    var open by remember { mutableStateOf(false) }
    Box(modifier) {
        FabricatorButton({ open = !open }, Modifier.fillMaxWidth(), FabricatorVariant.Ghost) { if (icon != null) FabricatorIcon(icon); FabricatorText(title, Modifier.weight(1f), maxLines = 1); FabricatorIcon("chevrons-up-down", size = 12.dp) }
        FabricatorDropdownMenu(open, { open = false }) { content { open = false } }
    }
}

@Composable
private fun BlockTeamSwitcher(value: String, onChange: (String) -> Unit, rail: Boolean = false, compact: Boolean = false, teams: List<String> = listOf("Acme Inc", "Acme Corp.", "Evil Corp."), onCreate: () -> Unit = {}) {
    val theme = LocalFabricatorTheme.current
    var open by remember { mutableStateOf(false) }
    val plan = when (value) { "Acme Inc" -> "Enterprise"; "Fabricator Studio" -> "Pro"; "Acme Corp." -> "Startup"; else -> "Free" }
    val logo = when (value) { "Acme Corp." -> "audio-lines"; "Evil Corp." -> "terminal"; else -> "gallery-vertical-end" }
    Box {
        FabricatorButton({ open = !open }, Modifier.fillMaxWidth(), FabricatorVariant.Ghost) {
            Box(Modifier.size(if (compact) 24.dp else 32.dp).background(theme.color("primary"), RoundedCornerShape(theme.radius("sm"))), contentAlignment = Alignment.Center) { FabricatorIcon(logo, color = theme.color("primary-foreground"), size = 16.dp) }
            if (!rail) { Column(Modifier.weight(1f)) { FabricatorText(value, weight = FontWeight.Medium); if (!compact) FabricatorText(plan, muted = true, size = 11) }; FabricatorIcon(if (compact) "chevron-down" else "chevrons-up-down", size = 12.dp) }
        }
        FabricatorDropdownMenu(open, { open = false }) { BlockHeading("Teams"); teams.forEach { team -> FabricatorMenuItem(team, { onChange(team); open = false }, selected = value == team) }; FabricatorSeparator(); FabricatorMenuItem("Add team", { open = false; onCreate() }, icon = "plus") }
    }
}

@Composable
private fun BlockUserMenu(rail: Boolean = false, account: Boolean = false, onAction: (String) -> Unit = {}) {
    val name = if (account) "Gabs Fabricator" else "Gabriel"
    val email = if (account) "gabs@fabricator.dev" else "m@example.com"
    var open by remember { mutableStateOf(false) }
    Box {
        FabricatorButton({ open = !open }, Modifier.fillMaxWidth(), FabricatorVariant.Ghost) { FabricatorAvatar(if (account) "GF" else "G", size = 32.dp); if (!rail) { Column(Modifier.weight(1f)) { FabricatorText(name, weight = FontWeight.Medium, size = 12); FabricatorText(email, muted = true, size = 11) }; FabricatorIcon("chevrons-up-down", size = 12.dp) } }
        FabricatorDropdownMenu(open, { open = false }) { FabricatorText(name, Modifier.padding(10.dp), weight = FontWeight.Medium); FabricatorText(email, Modifier.padding(horizontal = 10.dp), muted = true, size = 11); FabricatorSeparator(); if (!account) { FabricatorMenuItem("Upgrade to Pro", { open = false; onAction("Upgrade to Pro") }, icon = "sparkles"); FabricatorSeparator() }; (if (account) listOf("Account", "Billing") else listOf("Account", "Billing", "Notifications")).forEach { title -> FabricatorMenuItem(title, { open = false; onAction(title) }) }; FabricatorSeparator(); FabricatorMenuItem("Log out", { open = false; onAction("Log out") }, icon = "log-out") }
    }
}

@Composable
private fun BlockFrame(modifier: Modifier = Modifier, selection: String, breadcrumbs: List<String>, sidebarOpen: Boolean, onSidebarOpenChange: (Boolean) -> Unit, sidebarWidth: Dp = 256.dp, iconRail: Boolean = false, inset: Boolean = false, floating: Boolean = false, right: Boolean = false, globalHeader: Boolean = false, hidesCompactHeader: Boolean = false, sidebar: @Composable (rail: Boolean) -> Unit, actions: @Composable RowScope.(compact: Boolean) -> Unit = {}, content: @Composable (compact: Boolean) -> Unit) {
    val theme = LocalFabricatorTheme.current
    var mobileNavigation by remember { mutableStateOf(false) }
    LaunchedEffect(selection) { mobileNavigation = false }
    BoxWithConstraints(modifier.fillMaxWidth().heightIn(min = 640.dp).background(theme.color("app-shell-frame"))) {
        val compact = maxWidth < 700.dp
        val rail = iconRail && !sidebarOpen
        val header: @Composable () -> Unit = {
            Row(Modifier.fillMaxWidth().heightIn(min = if (globalHeader) 56.dp else 64.dp).background(theme.color("background")).padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (!right) BlockIconButton("Toggle sidebar", "panel-left") { if (compact) mobileNavigation = true else onSidebarOpenChange(!sidebarOpen) }
                if (breadcrumbs.isNotEmpty()) { Box(Modifier.weight(1f)) { FabricatorBreadcrumb(breadcrumbs.map { it to null }) } }
                actions(compact)
                if (right) BlockIconButton("Toggle sidebar", "panel-right") { if (compact) mobileNavigation = true else onSidebarOpenChange(!sidebarOpen) }
            }
            FabricatorSeparator()
        }
        val navigation: @Composable () -> Unit = { Box(Modifier.padding(if (floating) 8.dp else 0.dp).width(if (rail) 56.dp else sidebarWidth).fillMaxHeight().clip(RoundedCornerShape(if (floating) theme.radius("xl") else 0.dp)).background(theme.color(if (floating) "card" else "app-shell-frame"))) { sidebar(rail) } }
        Column(Modifier.fillMaxSize()) {
            if (globalHeader) header()
            Row(Modifier.weight(1f)) {
                if (!compact && !right && (sidebarOpen || iconRail)) navigation()
                Column(Modifier.weight(1f).fillMaxHeight().padding(if (inset && !compact) 8.dp else 0.dp).clip(RoundedCornerShape(if (inset && !compact) theme.radius("xl") else 0.dp)).background(theme.color("background"))) {
                    if (!globalHeader && !(compact && hidesCompactHeader)) header()
                    Box(Modifier.weight(1f).fillMaxWidth()) { content(compact) }
                }
                if (!compact && right && sidebarOpen) navigation()
            }
        }
        FabricatorSheet(mobileNavigation, { mobileNavigation = false }, "Navigation", side = if (right) FabricatorSheetSide.Right else FabricatorSheetSide.Left) { Box(Modifier.weight(1f)) { sidebar(false) } }
    }
}

private enum class BlockPlaceholderLayout { Dashboard, Rows, Document, Calendar, Settings, Issues }
@Composable
private fun BlockPlaceholderContent(layout: BlockPlaceholderLayout = BlockPlaceholderLayout.Dashboard, compact: Boolean = false) {
    val theme = LocalFabricatorTheme.current
    val rectangle: @Composable (Modifier) -> Unit = { modifier -> Box(modifier.clip(RoundedCornerShape(theme.radius("xl"))).background(theme.color("muted").copy(alpha = .5f)).clearAndSetSemantics {}) }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp)) {
        when (layout) {
            BlockPlaceholderLayout.Dashboard -> { if (compact) repeat(3) { rectangle(Modifier.fillMaxWidth().aspectRatio(16f / 9)) } else Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) { repeat(3) { rectangle(Modifier.weight(1f).aspectRatio(16f / 9)) } }; rectangle(Modifier.fillMaxWidth().height(400.dp)) }
            BlockPlaceholderLayout.Rows -> repeat(24) { rectangle(Modifier.fillMaxWidth().height(48.dp)) }
            BlockPlaceholderLayout.Document -> { rectangle(Modifier.widthIn(max = 768.dp).fillMaxWidth().height(96.dp)); rectangle(Modifier.widthIn(max = 768.dp).fillMaxWidth().height(500.dp)) }
            BlockPlaceholderLayout.Calendar -> repeat(if (compact) 20 else 4) { Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) { repeat(if (compact) 1 else 5) { rectangle(Modifier.weight(1f).aspectRatio(1f)) } } }
            BlockPlaceholderLayout.Settings -> repeat(10) { rectangle(Modifier.fillMaxWidth().aspectRatio(16f / 9)) }
            BlockPlaceholderLayout.Issues -> repeat(6) { rectangle(Modifier.widthIn(max = 768.dp).fillMaxWidth().height(128.dp)) }
        }
    }
}

@Composable
private fun BlockCalendarSidebar(onAction: (String) -> Unit = {}) {
    val today = remember { getFabricatorToday() }
    var date by remember { mutableStateOf(today.copy(day = 12)) }
    var expanded by remember { mutableStateOf(setOf("My Calendars")) }
    var checked by remember { mutableStateOf(setOf("Personal", "Work", "Holidays", "Birthdays", "Travel", "Reminders")) }
    val groups = listOf(BlockSection("My Calendars", listOf("Personal", "Work", "Family").map { BlockNode(it) }), BlockSection("Favorites", listOf("Holidays", "Birthdays").map { BlockNode(it) }), BlockSection("Other", listOf("Travel", "Reminders", "Deadlines").map { BlockNode(it) }))
    Column(Modifier.fillMaxSize()) {
        BlockUserMenu(onAction = onAction); FabricatorSeparator()
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState())) {
            FabricatorCalendar(date, { date = it }, Modifier.fillMaxWidth(), initialMonth = today)
            FabricatorSeparator()
            groups.forEach { group ->
                FabricatorButton({ expanded = if (group.title in expanded) expanded - group.title else expanded + group.title }, Modifier.fillMaxWidth(), FabricatorVariant.Ghost) { FabricatorIcon(if (group.title in expanded) "chevron-down" else "chevron-right", size = 12.dp); FabricatorText(group.title, Modifier.weight(1f), weight = FontWeight.Medium) }
                FabricatorCollapsible(group.title in expanded) { Column(Modifier.padding(horizontal = 16.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) { group.items.forEach { item -> FabricatorCheckbox(item.title in checked, { checked = if (it) checked + item.title else checked - item.title }, label = item.title) } } }
                FabricatorSeparator()
            }
        }
        FabricatorButton({ onAction("New Calendar") }, Modifier.fillMaxWidth(), FabricatorVariant.Ghost) { FabricatorIcon("plus"); FabricatorText("New Calendar") }
    }
}

@Composable
private fun BlockNotebookSidebar(selection: String, onSelect: (String) -> Unit, onAction: (String) -> Unit) {
    var team by remember { mutableStateOf("Acme Inc") }
    var expanded by remember { mutableStateOf(emptySet<String>()) }
    var favorites by remember { mutableStateOf(BlockContent.favorites) }
    Column(Modifier.fillMaxSize()) {
        BlockTeamSwitcher(team, { team = it }, compact = true, onCreate = { onAction("Add team") })
        Column(Modifier.padding(horizontal = 8.dp)) { BlockContent.workspaceMain.forEach { BlockBranch(it, selection, onSelect, expanded, { expanded = it }) } }
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(8.dp)) {
            BlockHeading("Favorites")
            favorites.forEach { node -> FabricatorContextMenu(content = { BlockBranch(node, selection, onSelect, expanded, { expanded = it }) }, menu = {
                FabricatorMenuItem("Remove from Favorites", { favorites = favorites.filterNot { it.title == node.title } })
                FabricatorSeparator(); FabricatorMenuItem("Copy Link", { onAction("Copy Link: ${node.title}") }); FabricatorMenuItem("Open in New Tab", { onAction("Open in New Tab: ${node.title}") }); FabricatorSeparator(); FabricatorMenuItem("Delete", { onAction("Delete: ${node.title}") }, destructive = true)
            }) }
            BlockBranch(BlockNode("More", "ellipsis"), selection, onSelect, expanded, { expanded = it })
            BlockHeading("Workspaces")
            BlockContent.workspaces.forEach { node -> FabricatorContextMenu(content = { BlockBranch(node, selection, onSelect, expanded, { expanded = it }, separatesDisclosure = true) }, menu = { FabricatorMenuItem("Add page", { onAction("Add page: ${node.title}") }, icon = "plus") }) }
            BlockBranch(BlockNode("More workspaces", "ellipsis"), selection, onSelect, expanded, { expanded = it })
            BlockContent.workspaceSecondary.forEach { BlockBranch(it, selection, onSelect, expanded, { expanded = it }) }
        }
    }
}

private data class BlockMail(val name: String, val subject: String, val date: String, val teaser: String)
private val blockMailExamples = listOf(
    BlockMail("William Smith", "Meeting Tomorrow", "09:34 AM", "Hi team, just a reminder about our meeting tomorrow at 10 AM.\nPlease come prepared with your project updates."),
    BlockMail("Alice Smith", "Re: Project Update", "Yesterday", "Thanks for the update. The progress looks great so far.\nLet's schedule a call to discuss the next steps."),
    BlockMail("Bob Johnson", "Weekend Plans", "2 days ago", "Hey everyone! I'm thinking of organizing a team outing this weekend.\nWould you be interested in a hiking trip or a beach day?"),
    BlockMail("Emily Davis", "Re: Question about Budget", "2 days ago", "I've reviewed the budget numbers you sent over.\nCan we set up a quick call to discuss some potential adjustments?"),
    BlockMail("Michael Wilson", "Important Announcement", "1 week ago", "Please join us for an all-hands meeting this Friday at 3 PM.\nWe have some exciting news to share about the company's future."),
    BlockMail("Sarah Brown", "Re: Feedback on Proposal", "1 week ago", "Thank you for sending over the proposal. I've reviewed it and have some thoughts.\nCould we schedule a meeting to discuss my feedback in detail?"),
    BlockMail("David Lee", "New Project Idea", "1 week ago", "I've been brainstorming and came up with an interesting project concept.\nDo you have time this week to discuss its potential impact and feasibility?"),
    BlockMail("Olivia Wilson", "Vacation Plans", "1 week ago", "Just a heads up that I'll be taking a two-week vacation next month.\nI'll make sure all my projects are up to date before I leave."),
    BlockMail("James Martin", "Re: Conference Registration", "1 week ago", "I've completed the registration for the upcoming tech conference.\nLet me know if you need any additional information from my end."),
    BlockMail("Sophia White", "Team Dinner", "1 week ago", "To celebrate our recent project success, I'd like to organize a team dinner.\nAre you available next Friday evening? Please let me know your preferences.")
)
@Composable
private fun BlockMailSidebar(folder: String, onFolderChange: (String) -> Unit, rail: Boolean) {
    val theme = LocalFabricatorTheme.current
    var query by remember { mutableStateOf("") }
    var unreads by remember { mutableStateOf(false) }
    var selected by remember { mutableStateOf("") }
    var mails by remember { mutableStateOf(blockMailExamples) }
    val folders = listOf(BlockNode("Inbox", "inbox"), BlockNode("Drafts", "file"), BlockNode("Sent", "send"), BlockNode("Junk", "archive-x"), BlockNode("Trash", "trash"))
    Row(Modifier.fillMaxSize()) {
        Column(Modifier.width(56.dp).fillMaxHeight(), horizontalAlignment = Alignment.CenterHorizontally) {
            Box(Modifier.padding(vertical = 12.dp).size(32.dp).background(theme.color("primary"), RoundedCornerShape(theme.radius())), contentAlignment = Alignment.Center) { FabricatorIcon("terminal", color = theme.color("primary-foreground")) }
            folders.forEach { item -> FabricatorButton({ onFolderChange(item.title); mails = blockMailExamples.shuffled().take(kotlin.random.Random.nextInt(5, 11)) }, Modifier.semantics { contentDescription = item.title; this.selected = folder == item.title }, if (folder == item.title) FabricatorVariant.Secondary else FabricatorVariant.Ghost, FabricatorSize.Icon) { FabricatorIcon(item.icon ?: "inbox") } }
            Spacer(Modifier.weight(1f)); BlockUserMenu(rail = true)
        }
        if (!rail) {
            FabricatorSeparator(vertical = true)
            Column(Modifier.weight(1f)) {
                Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) { Row(verticalAlignment = Alignment.CenterVertically) { FabricatorText(folder, Modifier.weight(1f), weight = FontWeight.Medium, size = 16); FabricatorSwitch(unreads, { unreads = it }, label = "Unreads") }; FabricatorSearch(query, { query = it }, placeholder = "Type to search...") }
                FabricatorSeparator()
                LazyColumn(Modifier.weight(1f)) { items(mails.filterIndexed { index, mail -> (!unreads || index < 3) && (query.isEmpty() || "${mail.name} ${mail.subject} ${mail.teaser}".contains(query, true)) }, key = { it.name }) { mail ->
                    Column(Modifier.fillMaxWidth().clickable { selected = mail.name }.background(if (selected == mail.name) theme.color("hover") else androidx.compose.ui.graphics.Color.Transparent).padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) { Row { FabricatorText(mail.name, Modifier.weight(1f)); FabricatorText(mail.date, size = 10) }; FabricatorText(mail.subject, weight = FontWeight.Medium); FabricatorText(mail.teaser, size = 11, maxLines = 2) }; FabricatorSeparator()
                } }
            }
        }
    }
}

@Composable
private fun BlockPageActions(onAction: (String) -> Unit) {
    var open by remember { mutableStateOf(true) }
    var starred by remember { mutableStateOf(false) }
    Row(verticalAlignment = Alignment.CenterVertically) {
        FabricatorText("Edit Oct 08", muted = true, size = 11)
        BlockIconButton(if (starred) "Remove star" else "Star page", "star") { starred = !starred }
        Box { BlockIconButton("Page actions", "ellipsis") { open = !open }; FabricatorPopover(open, { open = false }) { BlockContent.pageActions.forEachIndexed { index, actions -> actions.forEach { item -> FabricatorMenuItem(item.title, { open = false; onAction(item.title) }, icon = item.icon) }; if (index < BlockContent.pageActions.lastIndex) FabricatorSeparator() } } }
    }
}

@Composable
private fun BlockSettingsDialog(modifier: Modifier = Modifier) {
    var open by remember { mutableStateOf(true) }
    var selection by remember { mutableStateOf("Messages & media") }
    var expanded by remember { mutableStateOf(emptySet<String>()) }
    Box(modifier.fillMaxWidth().heightIn(min = 640.dp), contentAlignment = Alignment.Center) { FabricatorButton("Open Dialog", { open = true }, size = FabricatorSize.Small) }
    FabricatorDialog(open, { open = false }, "Settings", description = "Customize your settings here.", maxWidth = 900.dp) {
        BoxWithConstraints(Modifier.fillMaxWidth().height(440.dp)) {
            val hasSettingsSidebar = maxWidth >= 600.dp
            Row {
                if (hasSettingsSidebar) Column(Modifier.width(224.dp).fillMaxHeight().verticalScroll(rememberScrollState())) { BlockContent.settings.forEach { BlockBranch(it, selection, { selection = it }, expanded, { expanded = it }) } }
                Column(Modifier.weight(1f)) { if (hasSettingsSidebar) FabricatorBreadcrumb(listOf("Settings" to null, selection to null)) else FabricatorSelect(selection, { selection = it }, BlockContent.settings.map { FabricatorOption(it.title, it.title) }, Modifier.fillMaxWidth()); Box(Modifier.weight(1f)) { BlockPlaceholderContent(BlockPlaceholderLayout.Settings) } }
            }
        }
    }
}

/** The content slot remains optional so applications can replace the published blank canvas. */
@Composable
fun FabricatorSidebarBlock(variant: Int = 1, modifier: Modifier = Modifier, onAction: (String) -> Unit = {}, content: (@Composable () -> Unit)? = null) {
    require(variant in 1..16)
    if (variant == 13) { BlockSettingsDialog(modifier); return }
    var selection by remember(variant) { mutableStateOf(if (variant == 9) "Inbox" else "Data Fetching") }
    var expanded by remember(variant) { mutableStateOf(if (variant == 2) BlockContent.documentation.map { it.title }.toSet() else setOf("Build Your Application", "Playground")) }
    var query by remember(variant) { mutableStateOf("") }
    var version by remember(variant) { mutableStateOf("1.0.1") }
    var team by remember(variant) { mutableStateOf("Acme Inc") }
    var sidebarOpen by remember(variant) { mutableStateOf(true) }
    var calendarOpen by remember { mutableStateOf(false) }
    var selectedFile by remember { mutableStateOf<String?>("components/ui/button.tsx") }
    var expandedFiles by remember { mutableStateOf(setOf("components", "components/ui")) }
    var newsletterEmail by remember { mutableStateOf("") }
    var newsletterSubmitted by remember { mutableStateOf(false) }
    val breadcrumbs = when (variant) { 9 -> listOf("All Inboxes", selection); 10, 15 -> listOf("Project Management & Task Tracking"); 11 -> selectedFile.orEmpty().split('/'); 12 -> listOf("October 2024"); else -> listOf("Build Your Application", "Data Fetching") }
    BlockFrame(modifier, selection, breadcrumbs, sidebarOpen, { sidebarOpen = it }, sidebarWidth = when (variant) { 4 -> 304.dp; 9 -> 350.dp; else -> 256.dp }, iconRail = variant in listOf(7, 9), inset = variant == 8, floating = variant == 4, right = variant == 14, globalHeader = variant == 16,
        sidebar = { rail ->
            when (variant) {
                9 -> BlockMailSidebar(selection, { selection = it }, rail)
                10, 15 -> BlockNotebookSidebar(selection, { selection = it }, onAction)
                12 -> BlockCalendarSidebar(onAction)
                11 -> Column(Modifier.fillMaxHeight().verticalScroll(rememberScrollState()).padding(8.dp)) {
                    BlockHeading("Changes"); listOf(BlockNode("README.md", "file", badge = "M"), BlockNode("api/hello/route.ts", "file", badge = "U"), BlockNode("app/layout.tsx", "file", badge = "M")).forEach { BlockBranch(it, selection, { selection = it }, expanded, { expanded = it }) }
                    BlockHeading("Files"); FabricatorFileTree(BlockContent.files, expandedFiles, { expandedFiles = it }, selectedFile, { selectedFile = it })
                }
                7, 8, 16 -> Column(Modifier.fillMaxSize()) {
                    if (variant == 7) BlockTeamSwitcher(team, { team = it }, rail = rail, onCreate = { onAction("Add team") })
                    else Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) { val theme = LocalFabricatorTheme.current; Box(Modifier.size(32.dp).background(theme.color("primary"), RoundedCornerShape(theme.radius())), contentAlignment = Alignment.Center) { FabricatorIcon("terminal", color = theme.color("primary-foreground")) }; Column { FabricatorText("Acme Inc", weight = FontWeight.Medium); FabricatorText("Enterprise", muted = true, size = 11) } }
                    Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(if (rail) 4.dp else 8.dp)) {
                        if (!rail) BlockHeading("Platform")
                        BlockContent.platform.forEach { node -> if (rail) BlockIconButton(node.title, node.icon ?: "square") { sidebarOpen = true; selection = node.title } else BlockBranch(node, selection, { selection = it }, expanded, { expanded = it }, separatesDisclosure = variant != 7) }
                        if (!rail) {
                            BlockHeading("Projects")
                            BlockContent.projects.forEach { node -> FabricatorContextMenu(content = { BlockBranch(node, selection, { selection = it }, expanded, { expanded = it }) }, menu = { FabricatorMenuItem("View Project", { selection = node.title; onAction("View Project: ${node.title}") }, icon = "folder"); FabricatorMenuItem("Share Project", { onAction("Share Project: ${node.title}") }, icon = "share"); FabricatorSeparator(); FabricatorMenuItem("Delete Project", { onAction("Delete Project: ${node.title}") }, destructive = true) }) }
                            BlockBranch(BlockNode("More", "ellipsis"), selection, { selection = it }, expanded, { expanded = it })
                            if (variant != 7) BlockContent.secondary.forEach { BlockBranch(it, selection, { selection = it }, expanded, { expanded = it }) }
                        }
                    }
                    BlockUserMenu(rail, onAction = onAction)
                }
                else -> Column(Modifier.fillMaxSize()) {
                    if (variant != 14) BlockMenu("Documentation", "gallery-vertical-end") { close ->
                        if (variant in listOf(1, 2)) listOf("1.0.1", "1.1.0-alpha", "2.0.0-beta1").forEach { option -> FabricatorMenuItem("v$option", { version = option; close() }, selected = version == option) } else FabricatorText("Documentation v1.0.0")
                    }
                    if (variant != 14) FabricatorText("v${if (variant in listOf(1, 2)) version else "1.0.0"}", Modifier.padding(start = 48.dp, bottom = 8.dp), muted = true, size = 11)
                    if (variant in listOf(1, 2, 5)) FabricatorSearch(query, { query = it }, Modifier.padding(horizontal = 10.dp), "Search the docs...")
                    Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(8.dp)) {
                        if (variant == 14) BlockHeading("Table of Contents")
                        BlockContent.documentation.filter { variant !in listOf(1, 6) || it.title != "Community" }.forEach { group ->
                            val nodes = group.items.filter { query.isEmpty() || it.title.contains(query, true) || group.title.contains(query, true) }
                            if (nodes.isNotEmpty()) when (variant) {
                                1, 3, 4, 14 -> { BlockHeading(group.title); nodes.forEach { BlockBranch(it, selection, { selection = it }, expanded, { expanded = it }, Modifier.padding(start = if (variant in listOf(3, 14)) 12.dp else 0.dp)) } }
                                6 -> BlockMenu(group.title, "ellipsis") { close -> nodes.forEach { item -> FabricatorMenuItem(item.title, { selection = item.title; close() }) } }
                                else -> BlockBranch(BlockNode(group.title, children = nodes), selection, { selection = it }, expanded, { expanded = it }, plus = variant == 5)
                            }
                        }
                    }
                    if (variant == 6) FabricatorCard(Modifier.padding(10.dp), "Subscribe to our newsletter", "Opt-in to receive updates and news about the sidebar.") { FabricatorInput(newsletterEmail, { newsletterEmail = it }, Modifier.fillMaxWidth(), "Email", keyboardType = KeyboardType.Email, isInvalid = newsletterSubmitted && validateFabricatorAuthValues(mapOf("email" to newsletterEmail), "login-05").isNotEmpty()); BlockFullButton("Subscribe", { newsletterSubmitted = true; if (validateFabricatorAuthValues(mapOf("email" to newsletterEmail), "login-05").isEmpty()) onAction("Subscribe: $newsletterEmail") }) }
                }
            }
        }, actions = { _ -> if (variant == 10) BlockPageActions(onAction); if (variant == 15) BlockIconButton("Show calendar", "calendar") { calendarOpen = true }; if (variant == 16) FabricatorSearch(query, { query = it }, Modifier.widthIn(max = 220.dp), "Type to search...") }
    ) { compact ->
        if (content != null) content()
        else if (variant == 15) BoxWithConstraints(Modifier.fillMaxSize()) { Row { Box(Modifier.weight(1f)) { BlockPlaceholderContent(BlockPlaceholderLayout.Document, compact) }; if (this@BoxWithConstraints.maxWidth >= 736.dp) Box(Modifier.width(256.dp)) { BlockCalendarSidebar(onAction) } } }
        else BlockPlaceholderContent(when (variant) { 2, 9 -> BlockPlaceholderLayout.Rows; 10 -> BlockPlaceholderLayout.Document; 12 -> BlockPlaceholderLayout.Calendar; else -> BlockPlaceholderLayout.Dashboard }, compact)
    }
    FabricatorSheet(calendarOpen, { calendarOpen = false }, "Calendar") { BlockCalendarSidebar(onAction) }
}

@Composable
private fun BlockDockedPane(isOpen: Boolean, sheetOpen: Boolean, onSheetOpenChange: (Boolean) -> Unit, title: String, width: Dp = 300.dp, main: @Composable () -> Unit, pane: @Composable () -> Unit) {
    BoxWithConstraints(Modifier.fillMaxSize()) {
        val dock = maxWidth >= width + 400.dp
        Row(Modifier.fillMaxSize()) { Box(Modifier.weight(1f).fillMaxHeight()) { main() }; if (dock && isOpen) { FabricatorSeparator(vertical = true); Box(Modifier.width(width).fillMaxHeight()) { pane() } } }
        FabricatorSheet(!dock && sheetOpen, { onSheetOpenChange(false) }, title) { Box(Modifier.weight(1f)) { pane() } }
    }
}

@Composable
private fun BlockPanelContent(selection: String, onSelect: (String) -> Unit, views: List<String>, text: String, onClose: () -> Unit) {
    Column(Modifier.fillMaxSize()) {
        Row(Modifier.fillMaxWidth().padding(8.dp), verticalAlignment = Alignment.CenterVertically) { FabricatorTabStrip(selection, onSelect, views.map { FabricatorTab(it, it) }, Modifier.weight(1f)); BlockIconButton("Close panel", "x", onClose) }
        FabricatorSeparator(); FabricatorText(text, Modifier.padding(16.dp)); Spacer(Modifier.weight(1f))
    }
}

@Composable
private fun BlockWorkspaceShell(modifier: Modifier, content: (@Composable () -> Unit)?, onAction: (String) -> Unit) {
    var selection by remember { mutableStateOf("Q4 launch") }
    var workspace by remember { mutableStateOf("Acme Inc") }
    var expanded by remember { mutableStateOf(setOf("Projects", "Favorites", "Workspace")) }
    var hidden by remember { mutableStateOf(emptySet<String>()) }
    var pinned by remember { mutableStateOf(emptySet<String>()) }
    var favorites by remember { mutableStateOf(listOf("Q4 launch", "Roadmap")) }
    var sidebarOpen by remember { mutableStateOf(true) }
    var detailsOpen by remember { mutableStateOf(true) }
    var detailsSheet by remember { mutableStateOf(false) }
    var detailView by remember { mutableStateOf("Details") }
    val nodes = listOf(BlockNode("Projects", "box", children = listOf(BlockNode("Q4 launch"), BlockNode("Website"))), BlockNode("Team", "users"), BlockNode("Settings", "settings"))
    val navigation: @Composable (BlockNode) -> Unit = { node -> if (node.title !in hidden) FabricatorContextMenu(content = { BlockBranch(node, selection, { selection = it; onAction(it) }, expanded, { expanded = it }, separatesDisclosure = true) }, menu = { FabricatorMenuItem(if (node.title in pinned) "Unpin" else "Pin", { pinned = if (node.title in pinned) pinned - node.title else pinned + node.title }, icon = "pin"); FabricatorMenuItem("Hide", { hidden = hidden + node.title }, icon = "eye-off") }) }
    BlockFrame(modifier, selection, listOf("Projects", "Q4 launch"), sidebarOpen, { sidebarOpen = it }, inset = true,
        sidebar = { _ -> Column(Modifier.fillMaxSize()) {
            Row(Modifier.padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.width(64.dp)) { BlockMenu("", "user-round") { close -> FabricatorText("Gabs Fabricator"); FabricatorText("gabs@fabricator.dev", muted = true, size = 11); FabricatorSeparator(); listOf("Profile", "Notifications", "Sign out").forEach { title -> FabricatorMenuItem(title, { close(); onAction(title) }) } } }
                Box(Modifier.weight(1f)) { BlockMenu(workspace, "command") { close -> listOf("Acme Inc", "Fabricator Studio").forEach { name -> FabricatorMenuItem(name, { workspace = name; close() }, description = if (name == "Acme Inc") "Enterprise" else "Pro", selected = workspace == name) }; FabricatorSeparator(); FabricatorMenuItem("Create workspace", { close(); onAction("Create workspace") }, icon = "plus") } }
                BlockIconButton("Collapse sidebar", "panel-left") { sidebarOpen = false }
            }
            Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(8.dp)) {
                navigation(BlockNode("Home", "house")); navigation(BlockNode("Inbox", "inbox", badge = "4"))
                if (pinned.isNotEmpty()) { BlockHeading("Pinned"); pinned.sorted().forEach { navigation(BlockNode(it)) } }
                listOf("Favorites", "Workspace").forEach { group ->
                    FabricatorButton({ expanded = if (group in expanded) expanded - group else expanded + group }, Modifier.fillMaxWidth(), FabricatorVariant.Ghost) { FabricatorText(group, Modifier.weight(1f), muted = true, size = 11); FabricatorIcon(if (group in expanded) "chevron-down" else "chevron-right", size = 12.dp) }
                    FabricatorCollapsible(group in expanded) { Column { if (group == "Favorites") favorites.forEachIndexed { index, name -> FabricatorContextMenu(content = { navigation(BlockNode(name)) }, menu = { FabricatorMenuItem("Move up", { if (index > 0) favorites = favorites.toMutableList().apply { add(index - 1, removeAt(index)) } }, enabled = index > 0); FabricatorMenuItem("Move down", { if (index < favorites.lastIndex) favorites = favorites.toMutableList().apply { add(index + 1, removeAt(index)) } }, enabled = index < favorites.lastIndex) }) } else nodes.forEach { navigation(it) } } }
                }
            }
            BlockMenu("Customize", "sliders-horizontal") { _ -> listOf("Home", "Inbox", "Q4 launch", "Roadmap", "Projects", "Team", "Settings").forEach { title -> FabricatorCheckbox(title !in hidden, { hidden = if (it) hidden - title else hidden + title }, label = title) }; FabricatorSeparator(); FabricatorMenuItem("Reset navigation", { hidden = emptySet(); pinned = emptySet(); favorites = listOf("Q4 launch", "Roadmap") }) }
        } }, actions = { compact ->
            if (!compact) FabricatorButton({ onAction("Share") }, variant = FabricatorVariant.Ghost, size = FabricatorSize.Small) { FabricatorIcon("share"); FabricatorText("Share") }
            FabricatorButton({ onAction("New issue") }, size = FabricatorSize.Small) { FabricatorIcon("plus"); FabricatorText("New issue") }
            BlockIconButton("Details", "panel-right") { detailsOpen = !detailsOpen; detailsSheet = true }
        }
    ) { _ -> BlockDockedPane(detailsOpen, detailsSheet, { detailsSheet = it }, "Details", main = {
        if (content != null) content() else Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) { FabricatorText("Q4 launch", Modifier.semantics { heading() }, weight = FontWeight.SemiBold, size = 24); val theme = LocalFabricatorTheme.current; repeat(6) { Box(Modifier.fillMaxWidth().height(128.dp).clip(RoundedCornerShape(theme.radius("xl"))).background(theme.color("muted").copy(alpha = .5f)).clearAndSetSemantics {}) } }
    }, pane = { BlockPanelContent(detailView, { detailView = it }, listOf("Details", "Activity"), if (detailView == "Details") "Owner, status, dates and links." else "What changed, and who changed it.") { detailsOpen = false; detailsSheet = false } }) }
}

@Composable
private fun BlockWorkbenchShell(modifier: Modifier, content: (@Composable () -> Unit)?, onAction: (String) -> Unit) {
    var selection by remember { mutableStateOf("Fabricator") }
    var expanded by remember { mutableStateOf(setOf("Projects")) }
    var sidebarOpen by remember { mutableStateOf(false) }
    var resourcesOpen by remember { mutableStateOf(true) }
    var resourcesSheet by remember { mutableStateOf(false) }
    var resourceView by remember { mutableStateOf("Files") }
    var tabs by remember { mutableStateOf(listOf(FabricatorTab("plan", "app-shell.md", "pin"), FabricatorTab("shell", "app-shell.tsx", "file-text", true), FabricatorTab("notes", "Notes", "file-text", true))) }
    var activeTab by remember { mutableStateOf("shell") }
    var nextDocument by remember { mutableStateOf(3) }
    var renameOpen by remember { mutableStateOf(false) }
    var renameTitle by remember { mutableStateOf("") }
    val showResources = { view: String -> resourcesOpen = if (resourceView == view) !resourcesOpen else true; resourceView = view; resourcesSheet = true }
    BlockFrame(modifier, selection, emptyList(), sidebarOpen, { sidebarOpen = it }, inset = true,
        sidebar = { _ -> Column(Modifier.fillMaxHeight().verticalScroll(rememberScrollState()).padding(8.dp)) { BlockBranch(BlockNode("Dashboard"), selection, { selection = it }, expanded, { expanded = it }); BlockBranch(BlockNode("Calendar"), selection, { selection = it }, expanded, { expanded = it }); BlockBranch(BlockNode("Projects", children = listOf(BlockNode("Relay", badge = "3"), BlockNode("Fabricator"))), selection, { selection = it }, expanded, { expanded = it }) } },
        actions = { _ ->
            Box(Modifier.weight(1f)) { FabricatorContextMenu(content = { FabricatorTabStrip(activeTab, { activeTab = it }, tabs, Modifier.fillMaxWidth(), onClose = { id -> val index = tabs.indexOfFirst { it.id == id }; tabs = tabs.filterNot { it.id == id }; if (activeTab == id) activeTab = tabs.getOrNull(index.coerceAtLeast(0).coerceAtMost((tabs.size - 1).coerceAtLeast(0)))?.id.orEmpty() }, onMove = { id, index -> tabs = tabs.toMutableList().apply { val current = indexOfFirst { it.id == id }; if (current >= 0) add(index.coerceIn(0, size - 1), removeAt(current)) } }) }, menu = { FabricatorMenuItem("Rename document", { renameTitle = tabs.firstOrNull { it.id == activeTab }?.title.orEmpty(); renameOpen = activeTab.isNotEmpty() }) }) }
            BlockIconButton("New document", "plus") { val id = "untitled-${nextDocument++}"; tabs = tabs + FabricatorTab(id, "Untitled", "file-text", true); activeTab = id; onAction("New document") }
            Box(Modifier.width(48.dp)) { BlockMenu("", "chevron-down") { close -> tabs.forEach { tab -> FabricatorMenuItem(tab.title, { activeTab = tab.id; close() }, selected = activeTab == tab.id) } } }
            BlockIconButton("Files", "files") { showResources("Files") }; BlockIconButton("Search", "search") { showResources("Search") }
        }
    ) { compact ->
        Column(Modifier.fillMaxSize()) {
            Box(Modifier.weight(1f)) { BlockDockedPane(resourcesOpen, resourcesSheet, { resourcesSheet = it }, "Resources", main = { if (content != null) content() else FabricatorText(tabs.firstOrNull { it.id == activeTab }?.title ?: "No open documents", Modifier.padding(24.dp)) }, pane = { BlockPanelContent(resourceView, { resourceView = it }, listOf("Files", "Search"), if (resourceView == "Files") "Your files." else "Search the project.") { resourcesOpen = false; resourcesSheet = false } }) }
            if (!compact) { FabricatorSeparator(); Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 6.dp)) { FabricatorText("main", muted = true, size = 11); Spacer(Modifier.weight(1f)); FabricatorText("${tabs.size} open", muted = true, size = 11) } }
        }
    }
    FabricatorDialog(renameOpen, { renameOpen = false }, "Rename document") { FabricatorInput(renameTitle, { renameTitle = it }, Modifier.fillMaxWidth(), "Document title"); FabricatorButton("Save", { tabs = tabs.map { if (it.id == activeTab) it.copy(title = renameTitle) else it }; renameOpen = false }, enabled = renameTitle.isNotBlank()) }
}

@Composable
private fun BlockSaaSShell(modifier: Modifier, content: (@Composable () -> Unit)?, onAction: (String) -> Unit) {
    var selection by remember { mutableStateOf("Dashboard") }
    var team by remember { mutableStateOf("Acme Inc") }
    var expanded by remember { mutableStateOf(emptySet<String>()) }
    var sidebarOpen by remember { mutableStateOf(true) }
    val nodes = listOf(BlockNode("Dashboard", "layout-dashboard"), BlockNode("Analytics", "chart-line"), BlockNode("Customers", "users"), BlockNode("Settings", "settings", children = listOf("General", "Billing", "Members").map { BlockNode(it) }))
    BlockFrame(modifier, selection, listOf("Platform", "Dashboard"), sidebarOpen, { sidebarOpen = it }, iconRail = true, sidebar = { rail ->
        Column(Modifier.fillMaxSize()) { BlockTeamSwitcher(team, { team = it }, rail, teams = listOf("Acme Inc", "Fabricator Studio"), onCreate = { onAction("Add team") }); Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(if (rail) 4.dp else 8.dp)) { if (!rail) BlockHeading("Platform"); nodes.forEach { node -> if (rail) BlockIconButton(node.title, node.icon ?: "square") { selection = node.title; if (node.children.isNotEmpty()) { sidebarOpen = true; expanded = expanded + node.title } } else BlockBranch(node, selection, { selection = it; onAction(it) }, expanded, { expanded = it }, separatesDisclosure = true) } }; BlockUserMenu(rail, account = true, onAction = onAction) }
    }) { compact -> if (content != null) content() else BlockPlaceholderContent(compact = compact) }
}

@Composable
private fun BlockLibraryShell(modifier: Modifier, content: (@Composable () -> Unit)?, onAction: (String) -> Unit) {
    var selection by remember { mutableStateOf("Library") }
    var expanded by remember { mutableStateOf(emptySet<String>()) }
    var sidebarOpen by remember { mutableStateOf(true) }
    var tabs by remember { mutableStateOf(listOf(FabricatorTab("welcome", "Welcome", canClose = true), FabricatorTab("notes", "Meeting notes", canClose = true))) }
    var activeTab by remember { mutableStateOf("welcome") }
    var closed by remember { mutableStateOf(emptyList<FabricatorTab>()) }
    BlockFrame(modifier, selection, emptyList(), sidebarOpen, { sidebarOpen = it }, inset = true,
        sidebar = { _ -> Column(Modifier.fillMaxSize().padding(8.dp)) { FabricatorText("Library", Modifier.padding(8.dp), weight = FontWeight.SemiBold, size = 18); listOf(BlockNode("Library"), BlockNode("Recent"), BlockNode("Shared", badge = "2")).forEach { BlockBranch(it, selection, { selection = it; onAction(it) }, expanded, { expanded = it }) } } },
        actions = { _ ->
            FabricatorTabStrip(activeTab, { activeTab = it }, tabs, Modifier.weight(1f), onClose = { id -> tabs.firstOrNull { it.id == id }?.let { closed = closed + it }; val index = tabs.indexOfFirst { it.id == id }; tabs = tabs.filterNot { it.id == id }; if (activeTab == id) activeTab = tabs.getOrNull(index.coerceAtLeast(0).coerceAtMost((tabs.size - 1).coerceAtLeast(0)))?.id.orEmpty() }, onMove = { id, index -> tabs = tabs.toMutableList().apply { val current = indexOfFirst { it.id == id }; if (current >= 0) add(index.coerceIn(0, size - 1), removeAt(current)) } })
            FabricatorButton({ closed.lastOrNull()?.let { tabs = tabs + it; activeTab = it.id; closed = closed.dropLast(1) } }, Modifier.semantics { contentDescription = "Reopen closed page" }, FabricatorVariant.Ghost, FabricatorSize.Icon, enabled = closed.isNotEmpty()) { FabricatorIcon("plus") }
        }
    ) { _ -> if (content != null) content() else FabricatorText("${tabs.firstOrNull { it.id == activeTab }?.title ?: "No open pages"}. Drag the tab row or the sidebar's top to move the window.", Modifier.padding(24.dp)) }
}

private data class BlockInboxMessage(val id: String, val from: String, val subject: String)
private val blockInboxMessages = listOf(BlockInboxMessage("1", "Ada", "Launch checklist"), BlockInboxMessage("2", "Linus", "Release notes draft"), BlockInboxMessage("3", "Grace", "Design review on Friday"))
@Composable
private fun BlockInboxShell(modifier: Modifier, content: (@Composable () -> Unit)?, onAction: (String) -> Unit) {
    var selection by remember { mutableStateOf("Inbox") }
    var expanded by remember { mutableStateOf(emptySet<String>()) }
    var sidebarOpen by remember { mutableStateOf(true) }
    var openId by remember { mutableStateOf("1") }
    var messageOpen by remember { mutableStateOf(true) }
    var messageSheet by remember { mutableStateOf(false) }
    var phoneMessageOpen by remember { mutableStateOf(false) }
    val nodes = listOf(BlockNode("Home", "house"), BlockNode("Inbox", "inbox", badge = "3"), BlockNode("Settings", "settings"))
    val open = blockInboxMessages.firstOrNull { it.id == openId }
    val messagePanel: @Composable (Boolean) -> Unit = { compact -> Column(Modifier.fillMaxSize()) { Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) { BlockIconButton(if (compact) "Back to inbox" else "Close message", if (compact) "chevron-left" else "x") { phoneMessageOpen = false; messageOpen = false; messageSheet = false }; FabricatorText(open?.subject ?: "Message", weight = FontWeight.Medium) }; FabricatorSeparator(); FabricatorText("From ${open?.from.orEmpty()}.", Modifier.padding(16.dp)) } }
    val messageList: @Composable (Boolean) -> Unit = { compact -> LazyColumn(Modifier.fillMaxSize()) { items(blockInboxMessages, key = { it.id }) { item -> Column(Modifier.fillMaxWidth().clickable { openId = item.id; messageOpen = true; if (compact) phoneMessageOpen = true else messageSheet = true; onAction("Open message: ${item.subject}") }.padding(horizontal = 16.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) { FabricatorText(item.from, weight = FontWeight.Medium); FabricatorText(item.subject, muted = true) }; FabricatorSeparator() } } }
    BlockFrame(modifier, selection, listOf("Inbox"), sidebarOpen, { sidebarOpen = it }, hidesCompactHeader = phoneMessageOpen,
        sidebar = { _ -> Column(Modifier.fillMaxSize().padding(8.dp)) { nodes.forEach { BlockBranch(it, selection, { selection = it; onAction(it) }, expanded, { expanded = it }) } } },
        actions = { compact -> if (!compact) FabricatorButton({ onAction("Compose") }, size = FabricatorSize.Small) { FabricatorIcon("pencil"); FabricatorText("Compose") } }
    ) { compact ->
        if (compact && phoneMessageOpen) messagePanel(true)
        else if (compact) Column(Modifier.fillMaxSize()) {
            Box(Modifier.weight(1f).fillMaxWidth()) { if (content != null) content() else messageList(true); Box(Modifier.align(Alignment.BottomEnd).padding(16.dp)) { FabricatorButton({ onAction("Compose") }) { FabricatorIcon("pencil"); FabricatorText("Compose") } } }
            FabricatorSeparator(); Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) { nodes.forEach { item -> FabricatorButton({ selection = item.title; onAction(item.title) }, Modifier.weight(1f).semantics { selected = selection == item.title }, if (selection == item.title) FabricatorVariant.Secondary else FabricatorVariant.Ghost) { Column(horizontalAlignment = Alignment.CenterHorizontally) { Box { FabricatorIcon(item.icon ?: "square"); if (item.badge != null) FabricatorBadge(item.badge, Modifier.align(Alignment.TopEnd).offset(x = 12.dp, y = (-8).dp)) }; FabricatorText(item.title, size = 11) } } } }
        } else BlockDockedPane(messageOpen, messageSheet, { messageSheet = it }, "Message", 320.dp, main = { if (content != null) content() else messageList(false) }, pane = { messagePanel(false) })
    }
}

@Composable
fun FabricatorAppShellBlock(variant: Int = 1, modifier: Modifier = Modifier, onAction: (String) -> Unit = {}, content: (@Composable () -> Unit)? = null) {
    require(variant in 1..5)
    when (variant) {
        1 -> BlockWorkspaceShell(modifier, content, onAction)
        2 -> BlockWorkbenchShell(modifier, content, onAction)
        3 -> BlockSaaSShell(modifier, content, onAction)
        4 -> BlockLibraryShell(modifier, content, onAction)
        5 -> BlockInboxShell(modifier, content, onAction)
    }
}

/** The published preview-03 fixture contains this text only. */
@Composable
fun FabricatorPreviewBlock(modifier: Modifier = Modifier, content: (@Composable () -> Unit)? = null) { Box(modifier.fillMaxWidth().heightIn(min = 320.dp), contentAlignment = Alignment.Center) { if (content != null) content() else FabricatorText("Preview03") } }

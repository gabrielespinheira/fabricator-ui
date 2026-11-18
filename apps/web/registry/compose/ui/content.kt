package dev.fabricator.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.*
import androidx.compose.ui.text.*
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay

@Composable
fun FabricatorAlert(title: String, description: String? = null, modifier: Modifier = Modifier, role: FabricatorRole = FabricatorRole.Primary, icon: String = "info", action: (@Composable () -> Unit)? = null) {
    val theme = LocalFabricatorTheme.current
    Row(modifier.fillMaxWidth().background(theme.color(role.key).copy(alpha = .08f), RoundedCornerShape(theme.radius("xl"))).padding(16.dp).semantics { liveRegion = LiveRegionMode.Polite }, verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        FabricatorIcon(icon, color = theme.color(if (role == FabricatorRole.Primary) "foreground" else "${role.key}-text"))
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) { FabricatorText(title, weight = FontWeight.Medium); if (description != null) FabricatorText(description, muted = true) }
        action?.invoke()
    }
}

@Composable
fun FabricatorEmpty(title: String, description: String? = null, modifier: Modifier = Modifier, icon: String = "inbox", action: (@Composable () -> Unit)? = null) {
    Column(modifier.fillMaxWidth().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        FabricatorIcon(icon, size = 28.dp, color = LocalFabricatorTheme.current.color("muted-foreground"))
        FabricatorText(title, weight = FontWeight.SemiBold, size = 16)
        if (description != null) FabricatorText(description, muted = true, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
        action?.invoke()
    }
}

data class FabricatorToastMessage(val id: Long, val title: String, val description: String? = null, val role: FabricatorRole = FabricatorRole.Primary, val durationMilliseconds: Long = 4000, val actionLabel: String? = null, val action: (() -> Unit)? = null)
@Stable
class FabricatorToastState {
    var messages by mutableStateOf<List<FabricatorToastMessage>>(emptyList())
        private set
    private var nextId = 0L
    fun show(title: String, description: String? = null, role: FabricatorRole = FabricatorRole.Primary, durationMilliseconds: Long = 4000, actionLabel: String? = null, action: (() -> Unit)? = null) {
        nextId += 1
        messages = (messages + FabricatorToastMessage(nextId, title, description, role, durationMilliseconds, actionLabel, action)).takeLast(5)
    }
    fun dismiss(id: Long) { messages = messages.filterNot { it.id == id } }
}
@Composable fun rememberFabricatorToastState(): FabricatorToastState = remember { FabricatorToastState() }

@Composable
fun FabricatorToast(message: FabricatorToastMessage, onDismiss: () -> Unit, modifier: Modifier = Modifier) {
    FabricatorCard(modifier.widthIn(max = 380.dp).semantics { liveRegion = LiveRegionMode.Polite }) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) { FabricatorText(message.title, weight = FontWeight.Medium); if (message.description != null) FabricatorText(message.description, muted = true, size = 12) }
            if (message.actionLabel != null) FabricatorButton(message.actionLabel, { message.action?.invoke(); onDismiss() }, variant = FabricatorVariant.Outline)
            FabricatorButton(onDismiss, Modifier.semantics { contentDescription = "Dismiss notification" }, FabricatorVariant.Ghost, FabricatorSize.Icon) { FabricatorIcon("x") }
        }
    }
}

@Composable
fun FabricatorSonner(state: FabricatorToastState, modifier: Modifier = Modifier) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) { state.messages.forEach { message ->
        key(message.id) {
            LaunchedEffect(message.id) { if (message.durationMilliseconds > 0) { delay(message.durationMilliseconds); state.dismiss(message.id) } }
            FabricatorToast(message, { state.dismiss(message.id) })
        }
    } }
}

@Composable
fun FabricatorTable(headers: List<String>, rows: List<List<String>>, modifier: Modifier = Modifier, caption: String? = null) {
    val theme = LocalFabricatorTheme.current
    Column(modifier.horizontalScroll(rememberScrollState())) {
        if (caption != null) FabricatorText(caption, Modifier.padding(vertical = 8.dp), muted = true, size = 12)
        Row(Modifier.background(theme.color("muted")).padding(vertical = 10.dp)) { headers.forEach { FabricatorText(it, Modifier.width(150.dp).padding(horizontal = 12.dp), muted = true, weight = FontWeight.Medium, size = 12) } }
        rows.forEach { row -> FabricatorSeparator(); Row(Modifier.padding(vertical = 12.dp)) { row.forEach { FabricatorText(it, Modifier.width(150.dp).padding(horizontal = 12.dp)) } } }
    }
}

/** Link annotations retain native focus, text selection and URL activation. */
fun createFabricatorInlineText(text: String, theme: FabricatorThemeValues): AnnotatedString = buildAnnotatedString {
    val pattern = Regex("(\\*\\*(.+?)\\*\\*|~~(.+?)~~|`(.+?)`|_([^_]+)_|\\[([^]]+)\\]\\(([^)]+)\\))")
    var cursor = 0
    for (match in pattern.findAll(text)) {
        append(text.substring(cursor, match.range.first))
        when {
            match.groupValues[2].isNotEmpty() -> withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(match.groupValues[2]) }
            match.groupValues[3].isNotEmpty() -> withStyle(SpanStyle(textDecoration = TextDecoration.LineThrough)) { append(match.groupValues[3]) }
            match.groupValues[4].isNotEmpty() -> withStyle(SpanStyle(fontFamily = FontFamily.Monospace, background = theme.color("muted"))) { append(match.groupValues[4]) }
            match.groupValues[5].isNotEmpty() -> withStyle(SpanStyle(fontStyle = androidx.compose.ui.text.font.FontStyle.Italic)) { append(match.groupValues[5]) }
            else -> withLink(LinkAnnotation.Url(match.groupValues[7], TextLinkStyles(SpanStyle(color = theme.color("ring"), textDecoration = TextDecoration.Underline)))) { append(match.groupValues[6]) }
        }
        cursor = match.range.last + 1
    }
    append(text.substring(cursor))
}

@Composable
fun FabricatorMarkdown(markdown: String, modifier: Modifier = Modifier) {
    val theme = LocalFabricatorTheme.current
    val lines = markdown.lines()
    Column(modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        var index = 0
        while (index < lines.size) {
            val line = lines[index]
            when {
                line.startsWith("```") -> {
                    val language = line.drop(3)
                    val code = mutableListOf<String>()
                    index += 1
                    while (index < lines.size && !lines[index].startsWith("```")) { code += lines[index]; index += 1 }
                    FabricatorSyntaxHighlight(code.joinToString("\n"), language)
                }
                line.matches(Regex("^#{1,6} .*")) -> {
                    val level = line.takeWhile { it == '#' }.length
                    BasicText(createFabricatorInlineText(line.drop(level + 1), theme), Modifier.semantics { heading() }, style = TextStyle(color = theme.color("foreground"), fontFamily = theme.fontFamily, fontSize = (26 - level * 2).sp, fontWeight = FontWeight.SemiBold))
                }
                line == "---" || line == "***" -> FabricatorSeparator(Modifier.padding(vertical = 8.dp))
                line.startsWith("> ") -> Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) { Box(Modifier.width(3.dp).height(24.dp).background(theme.color("border"))); BasicText(createFabricatorInlineText(line.drop(2), theme), style = TextStyle(color = theme.color("muted-foreground"), fontSize = theme.text(13), fontFamily = theme.fontFamily)) }
                line.startsWith("- [ ] ") || line.startsWith("- [x] ") -> FabricatorCheckbox(line.startsWith("- [x] "), {}, enabled = false, label = line.drop(6))
                line.startsWith("- ") || line.startsWith("* ") -> Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { FabricatorText("•"); BasicText(createFabricatorInlineText(line.drop(2), theme), style = TextStyle(color = theme.color("foreground"), fontSize = theme.text(13), fontFamily = theme.fontFamily)) }
                line.startsWith('|') && index + 1 < lines.size && lines[index + 1].contains("---") -> {
                    val headers = line.trim('|').split('|').map(String::trim)
                    val rows = mutableListOf<List<String>>()
                    index += 2
                    while (index < lines.size && lines[index].startsWith('|')) { rows += lines[index].trim('|').split('|').map(String::trim); index += 1 }
                    index -= 1
                    FabricatorTable(headers, rows)
                }
                line.isNotEmpty() -> BasicText(createFabricatorInlineText(line, theme), style = TextStyle(color = theme.color("foreground"), fontSize = theme.text(13), fontFamily = theme.fontFamily, lineHeight = theme.text(13) * 1.5f))
                else -> Spacer(Modifier.height(4.dp))
            }
            index += 1
        }
    }
}

@Composable
fun FabricatorSyntaxHighlight(code: String, language: String = "kotlin", modifier: Modifier = Modifier, showLineNumbers: Boolean = true) {
    val theme = LocalFabricatorTheme.current
    val content = buildAnnotatedString {
        val pattern = Regex("(//[^\\n]*|#[^\\n]*|\"(?:\\\\.|[^\"\\\\])*\"|'(?:\\\\.|[^'\\\\])*'|\\b(?:fun|val|var|class|object|interface|return|if|else|for|while|import|package|let|const|function|export|struct|enum|public|private|true|false|null|nil|async|await|throw|try|catch)\\b|\\b\\d+(?:\\.\\d+)?\\b)")
        var cursor = 0
        for (match in pattern.findAll(code)) {
            append(code.substring(cursor, match.range.first))
            val token = match.value
            val color = theme.color(when { token.startsWith("//") || token.startsWith('#') -> "muted-foreground"; token.startsWith('"') || token.startsWith('\'') -> "success-text"; token.first().isDigit() -> "warning-text"; else -> "info-text" })
            withStyle(SpanStyle(color = color)) { append(token) }
            cursor = match.range.last + 1
        }
        append(code.substring(cursor))
    }
    Row(modifier.fillMaxWidth().background(theme.color("muted"), RoundedCornerShape(theme.radius())).padding(12.dp).horizontalScroll(rememberScrollState()).semantics { contentDescription = "$language code" }, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
        if (showLineNumbers) BasicText(code.lines().indices.joinToString("\n") { (it + 1).toString() }, style = TextStyle(color = theme.color("muted-foreground"), fontSize = 12.sp, lineHeight = 18.sp, fontFamily = FontFamily.Monospace))
        BasicText(content, style = TextStyle(color = theme.color("foreground"), fontSize = 12.sp, lineHeight = 18.sp, fontFamily = FontFamily.Monospace))
    }
}

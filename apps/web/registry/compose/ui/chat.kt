package dev.fabricator.ui

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.key.*
import androidx.compose.ui.semantics.*
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch

enum class FabricatorMessageRole { User, Assistant, System }
enum class FabricatorBotMood { Idle, Thinking, Happy, Listening, Error, Sleeping }
data class FabricatorChatMessage(val id: String, val role: FabricatorMessageRole, val text: String, val author: String? = null, val attachments: List<FabricatorFile> = emptyList(), val isStreaming: Boolean = false)

@Composable
fun FabricatorAttachment(file: FabricatorFile, modifier: Modifier = Modifier, onOpen: (() -> Unit)? = null, onRemove: (() -> Unit)? = null) {
    FabricatorItem(file.name, modifier, file.mimeType, leading = { FabricatorIcon(if (file.mimeType?.startsWith("image/") == true) "image" else "file") }, trailing = { if (onRemove != null) FabricatorButton(onRemove, Modifier.semantics { contentDescription = "Remove ${file.name}" }, FabricatorVariant.Ghost, FabricatorSize.Icon) { FabricatorIcon("x") } }, onClick = onOpen)
}

@Composable
fun FabricatorBubble(role: FabricatorMessageRole, modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    val theme = LocalFabricatorTheme.current
    Row(modifier.fillMaxWidth(), horizontalArrangement = if (role == FabricatorMessageRole.User) Arrangement.End else Arrangement.Start) {
        Column(Modifier.widthIn(max = 600.dp).background(theme.color(if (role == FabricatorMessageRole.User) "muted" else "background"), RoundedCornerShape(theme.radius("2xl"))).padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp), content = content)
    }
}

@Composable
fun FabricatorMessage(message: FabricatorChatMessage, modifier: Modifier = Modifier, onCopy: ((String) -> Unit)? = null, footer: (@Composable () -> Unit)? = null) {
    FabricatorBubble(message.role, modifier.semantics { if (message.isStreaming) liveRegion = LiveRegionMode.Polite }) {
        if (message.author != null) FabricatorText(message.author, muted = true, weight = FontWeight.Medium, size = 11)
        FabricatorMarkdown(message.text)
        message.attachments.forEach { FabricatorAttachment(it) }
        if (message.isStreaming) FabricatorSpinner()
        if (onCopy != null) FabricatorButton("Copy", { onCopy(message.text) }, variant = FabricatorVariant.Ghost, size = FabricatorSize.ExtraSmall)
        footer?.invoke()
    }
}

@Composable
fun FabricatorMessageScroller(messages: List<FabricatorChatMessage>, modifier: Modifier = Modifier, message: @Composable (FabricatorChatMessage) -> Unit = { FabricatorMessage(it) }) {
    val state = rememberLazyListState()
    val scope = rememberCoroutineScope()
    val isNearEnd by remember { derivedStateOf { val last = state.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0; last >= messages.lastIndex - 1 } }
    LaunchedEffect(messages.size, messages.lastOrNull()?.text) { if (isNearEnd && messages.isNotEmpty()) state.animateScrollToItem(messages.lastIndex) }
    Box(modifier) {
        LazyColumn(Modifier.fillMaxSize(), state = state, verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(16.dp)) { items(messages, key = { it.id }) { message(it) } }
        if (!isNearEnd) FabricatorButton("Latest messages", { scope.launch { state.animateScrollToItem(messages.lastIndex.coerceAtLeast(0)) } }, Modifier.align(Alignment.BottomCenter), FabricatorVariant.Outline)
    }
}

@Composable
fun FabricatorChatInput(value: String, onValueChange: (String) -> Unit, onSend: () -> Unit, modifier: Modifier = Modifier, isBusy: Boolean = false, onStop: (() -> Unit)? = null, attachments: (@Composable () -> Unit)? = null, placeholder: String = "Message…") {
    FabricatorCard(modifier) {
        FabricatorTextarea(value, onValueChange, Modifier.fillMaxWidth().onPreviewKeyEvent { event -> if (event.type == KeyEventType.KeyDown && event.key == Key.Enter && (event.isCtrlPressed || event.isMetaPressed) && value.isNotBlank() && !isBusy) { onSend(); true } else false }, placeholder)
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            attachments?.invoke()
            Spacer(Modifier.weight(1f))
            if (isBusy && onStop != null) FabricatorButton("Stop", onStop, variant = FabricatorVariant.Outline)
            else FabricatorButton({ onSend() }, Modifier.semantics { contentDescription = "Send message" }, enabled = value.isNotBlank() && !isBusy, size = FabricatorSize.Icon) { FabricatorIcon("arrow-up") }
        }
    }
}

@Composable
fun FabricatorMarker(title: String, modifier: Modifier = Modifier, isComplete: Boolean = false, onClick: (() -> Unit)? = null) {
    val icon = if (isComplete) "circle-check" else "circle"
    if (onClick == null) Row(modifier, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) { FabricatorIcon(icon); FabricatorText(title, muted = true, size = 12) }
    else FabricatorButton(onClick, modifier, FabricatorVariant.Ghost) { FabricatorIcon(icon); FabricatorText(title, size = 12) }
}

@Composable
fun FabricatorModelPicker(value: String, onValueChange: (String) -> Unit, models: List<FabricatorOption>, modifier: Modifier = Modifier) { FabricatorCombobox(value, onValueChange, models, modifier, "Choose a model") }

data class FabricatorQuestion(val id: String, val title: String, val options: List<FabricatorOption> = emptyList(), val multiple: Boolean = false, val required: Boolean = true, val description: String? = null)

@Composable
fun FabricatorQuestionnaire(questions: List<FabricatorQuestion>, answers: Map<String, Set<String>>, onAnswersChange: (Map<String, Set<String>>) -> Unit, onSubmit: (Map<String, Set<String>>) -> Unit, modifier: Modifier = Modifier) {
    var step by remember { mutableStateOf(0) }
    if (questions.isEmpty()) return
    val question = questions[step.coerceIn(questions.indices)]
    val value = answers[question.id].orEmpty()
    FabricatorCard(modifier, title = question.title, description = question.description) {
        FabricatorProgress((step + 1f) / questions.size)
        FabricatorText("Question ${step + 1} of ${questions.size}", muted = true, size = 11)
        if (question.options.isEmpty()) FabricatorTextarea(value.firstOrNull().orEmpty(), { onAnswersChange(answers + (question.id to setOf(it))) }, Modifier.fillMaxWidth())
        else if (question.multiple) question.options.forEach { option -> FabricatorCheckbox(option.value in value, { checked -> onAnswersChange(answers + (question.id to if (checked) value + option.value else value - option.value)) }, label = option.label, enabled = option.enabled) }
        else FabricatorRadioGroup(value.firstOrNull().orEmpty(), { onAnswersChange(answers + (question.id to setOf(it))) }, question.options.map { it.value to it.label })
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            FabricatorButton("Back", { step -= 1 }, variant = FabricatorVariant.Outline, enabled = step > 0)
            FabricatorButton(if (step == questions.lastIndex) "Submit" else "Continue", { if (step == questions.lastIndex) onSubmit(answers) else step += 1 }, enabled = !question.required || value.any(String::isNotBlank))
        }
    }
}

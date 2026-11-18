package dev.fabricator.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.input.key.*
import androidx.compose.ui.semantics.*
import androidx.compose.ui.text.*
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.OffsetMapping
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.input.TransformedText
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import dev.fabricator.ui.models.*

private class EditorBlockTransformation(private val block: EditorBlock, private val theme: FabricatorThemeValues) : VisualTransformation {
    override fun filter(text: AnnotatedString): TransformedText = TransformedText(buildAnnotatedString {
        append(text.text.replace('\u2028', '\n'))
        var offset = 0
        for (run in block.content) {
            val end = (offset + run.text.length).coerceAtMost(length)
            for (mark in run.marks) addStyle(when (mark.type) { "bold" -> SpanStyle(fontWeight = FontWeight.Bold); "italic" -> SpanStyle(fontStyle = FontStyle.Italic); "strike" -> SpanStyle(textDecoration = TextDecoration.LineThrough); "code" -> SpanStyle(fontFamily = FontFamily.Monospace, background = theme.color("muted")); "link" -> SpanStyle(color = theme.color("primary-text"), textDecoration = TextDecoration.Underline); else -> SpanStyle() }, offset.coerceAtMost(end), end)
            offset = end
        }
    }, OffsetMapping.Identity)
}

@Composable
fun FabricatorEditor(value: EditorHistory, onValueChange: (EditorHistory) -> Unit, modifier: Modifier = Modifier, placeholder: String = "Start writing…", readOnly: Boolean = false, onExportMarkdown: ((String) -> Unit)? = null, onExportJson: ((String) -> Unit)? = null) {
    val theme = LocalFabricatorTheme.current
    val requesters = remember { mutableMapOf<String, FocusRequester>() }
    var isEditorFocused by remember { mutableStateOf(false) }
    var preview by remember { mutableStateOf(false) }
    var linkOpen by remember { mutableStateOf(false) }
    var link by remember { mutableStateOf("https://") }
    var imageOpen by remember { mutableStateOf(false) }
    var imageSource by remember { mutableStateOf("") }
    var imageAlt by remember { mutableStateOf("") }
    var table by remember { mutableStateOf<EditorBlock?>(null) }
    var tableDraft by remember { mutableStateOf<List<List<String>>>(emptyList()) }
    fun focusEditor() { requesters[value.current.selection.focus.blockId]?.requestFocus() }
    fun command(command: EditorCommand) { if (!readOnly) { onValueChange(value.apply(command)); focusEditor() } }
    fun updateBlock(block: EditorBlock) { onValueChange(value.update(value.current.copy(document = value.current.document.copy(blocks = value.current.document.blocks.map { if (it.id == block.id) block else it })))); focusEditor() }
    Column(modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        if (!readOnly) FlowRow {
            val active = editorMarksAt(value.current).map { it.type }.toSet()
            listOf(Triple("bold", "Bold", EditorCommand.Bold), Triple("italic", "Italic", EditorCommand.Italic), Triple("strikethrough", "Strike", EditorCommand.Strike), Triple("code", "Code", EditorCommand.Code)).forEach { (icon, title, action) -> FabricatorToggle(title.lowercase() in active, { command(action) }, Modifier.semantics { contentDescription = title }) { FabricatorIcon(icon) } }
            FabricatorButton("Heading", { command(EditorCommand.Heading) }, variant = FabricatorVariant.Ghost)
            FabricatorButton("List", { command(EditorCommand.BulletList) }, variant = FabricatorVariant.Ghost)
            FabricatorButton("Tasks", { command(EditorCommand.TaskList) }, variant = FabricatorVariant.Ghost)
            FabricatorButton("Quote", { command(EditorCommand.Quote) }, variant = FabricatorVariant.Ghost)
            FabricatorButton("Link", { linkOpen = true }, variant = FabricatorVariant.Ghost)
            FabricatorButton("Image", { imageOpen = true }, variant = FabricatorVariant.Ghost)
            FabricatorButton("Table", { command(EditorCommand.Table) }, variant = FabricatorVariant.Ghost)
            FabricatorButton("Undo", { onValueChange(value.undo()); focusEditor() }, variant = FabricatorVariant.Ghost, enabled = value.past.isNotEmpty())
            FabricatorButton("Redo", { onValueChange(value.redo()); focusEditor() }, variant = FabricatorVariant.Ghost, enabled = value.future.isNotEmpty())
            FabricatorToggle(preview, { preview = it }) { FabricatorText("Preview") }
        }
        FabricatorSeparator()
        if (preview) FabricatorMarkdown(serializeEditorMarkdown(value.current.document), Modifier.fillMaxWidth().padding(12.dp))
        else Column(Modifier.fillMaxWidth().heightIn(min = 180.dp).padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            value.current.document.blocks.forEach { block -> key(block.id) {
                when (block.type) {
                    "divider" -> FabricatorSeparator(Modifier.padding(vertical = 12.dp))
                    "image" -> { val source = (block.attrs["src"] as? EditorJson.Text)?.value.orEmpty(); val alt = (block.attrs["alt"] as? EditorJson.Text)?.value.orEmpty(); FabricatorNativeImage(source, alt, Modifier.fillMaxWidth().heightIn(max = 300.dp)) }
                    "table" -> Column(Modifier.fillMaxWidth().clickable(enabled = !readOnly) { table = block; tableDraft = getEditorTableRows(block).map { row -> row.map(::serializeEditorRuns) } }) {
                        getEditorTableRows(block).forEachIndexed { index, row -> Row(Modifier.fillMaxWidth().padding(vertical = 6.dp)) { row.forEach { cell -> Box(Modifier.weight(1f).padding(6.dp)) { FabricatorMarkdown(serializeEditorRuns(cell)) } } }; if (index == 0) FabricatorSeparator() }
                        if (!readOnly) FabricatorText("Select to edit table", muted = true, size = 11)
                    }
                    else -> {
                        val requester = remember(block.id) { FocusRequester() }
                        DisposableEffect(block.id) { requesters[block.id] = requester; onDispose { requesters.remove(block.id) } }
                        val isSelected = value.current.selection.focus.blockId == block.id
                        val localSelection = if (isSelected) TextRange(value.current.selection.anchor.offset.coerceIn(0, block.flatText.length), value.current.selection.focus.offset.coerceIn(0, block.flatText.length)) else TextRange(0)
                        var nativeValue by remember(block.id) { mutableStateOf(TextFieldValue(block.flatText, localSelection)) }
                        SideEffect {
                            if (nativeValue.text != block.flatText) nativeValue = TextFieldValue(block.flatText, localSelection)
                            else if (isSelected && nativeValue.selection != localSelection) nativeValue = nativeValue.copy(selection = localSelection)
                        }
                        LaunchedEffect(value.current.selection.focus.blockId) { if (isSelected && isEditorFocused && !readOnly) requester.requestFocus() }
                        Row(Modifier.padding(start = (block.indent * 20).dp), verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            when (block.type) { "bulleted" -> FabricatorText("•", Modifier.padding(top = 8.dp)); "numbered" -> FabricatorText("${(block.attrs["start"] as? EditorJson.Number)?.value?.toInt() ?: 1}.", Modifier.padding(top = 8.dp)); "task" -> FabricatorCheckbox((block.attrs["checked"] as? EditorJson.BooleanValue)?.value == true, { updateBlock(block.copy(attrs = block.attrs + ("checked" to EditorJson.BooleanValue(it)), source = null)) }, enabled = !readOnly); "quote" -> Box(Modifier.width(3.dp).height(32.dp).background(theme.color("border"))) }
                            BasicTextField(nativeValue, { next ->
                                nativeValue = next
                                val start = toEditorFlatOffset(value.current.document, EditorPosition(block.id, 0))
                                val flat = value.current.text.replaceRange(start, start + block.flatText.length, next.text)
                                onValueChange(value.update(updateEditorText(value.current, flat, start + next.selection.start, start + next.selection.end)))
                            }, Modifier.weight(1f).heightIn(min = 36.dp).focusRequester(requester).onFocusChanged { if (it.isFocused) isEditorFocused = true }.onPreviewKeyEvent { event ->
                                if (readOnly || event.type != KeyEventType.KeyDown) false else when {
                                    (event.isCtrlPressed || event.isMetaPressed) && event.key == Key.B -> { command(EditorCommand.Bold); true }
                                    (event.isCtrlPressed || event.isMetaPressed) && event.key == Key.I -> { command(EditorCommand.Italic); true }
                                    event.key == Key.Backspace && nativeValue.selection.collapsed && nativeValue.selection.start == 0 && value.current.document.blocks.first().id != block.id -> { val start = toEditorFlatOffset(value.current.document, EditorPosition(block.id, 0)); onValueChange(value.update(replaceEditorRange(value.current, start - 1, start, ""))); true }
                                    else -> false
                                }
                            }.semantics { contentDescription = "${block.type} block"; if (block.type == "heading") heading() }, readOnly = readOnly,
                                textStyle = TextStyle(color = theme.color("foreground"), fontFamily = if (block.type == "code") FontFamily.Monospace else theme.fontFamily, fontSize = theme.text(if (block.type == "heading") 16 else 13), fontWeight = if (block.type == "heading") FontWeight.SemiBold else FontWeight.Normal, lineHeight = theme.text(if (block.type == "heading") 16 else 13) * 1.5f),
                                cursorBrush = SolidColor(theme.color("foreground")), visualTransformation = remember(block, theme) { EditorBlockTransformation(block, theme) }, decorationBox = { inner -> Box(Modifier.padding(vertical = 8.dp)) { if (block.text.isEmpty() && value.current.document.blocks.size == 1) FabricatorText(placeholder, muted = true); inner() } })
                        }
                        if (isSelected && !readOnly) {
                            val commands = getEditorSlashCommands(value.current)
                            if (commands.isNotEmpty()) FabricatorPopupSurface { commands.forEach { item -> FabricatorMenuItem(item.title, { onValueChange(value.update(applyEditorSlashCommand(value.current, item.id))); focusEditor() }) } }
                        }
                    }
                }
            } }
        }
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            FabricatorText("${value.current.text.replace("\uFFFC", "").trim().split(Regex("\\s+")).count { it.isNotEmpty() }} words", Modifier.weight(1f), muted = true, size = 11)
            if (onExportMarkdown != null) FabricatorButton("Markdown", { onExportMarkdown(serializeEditorMarkdown(value.current.document)) }, variant = FabricatorVariant.Ghost)
            if (onExportJson != null) FabricatorButton("JSON", { onExportJson(encodeEditorDocument(value.current.document)) }, variant = FabricatorVariant.Ghost)
        }
    }
    FabricatorDialog(linkOpen, { linkOpen = false }, "Insert link") { FabricatorField("URL") { FabricatorInput(link, { link = it }) }; FabricatorButton("Apply link", { onValueChange(value.update(toggleEditorMark(value.current, EditorMark("link", mapOf("href" to link))))); linkOpen = false; focusEditor() }, enabled = link.startsWith("https://") || link.startsWith("http://")) }
    FabricatorDialog(imageOpen, { imageOpen = false }, "Insert image") { FabricatorField("Image URL") { FabricatorInput(imageSource, { imageSource = it }) }; FabricatorField("Description") { FabricatorInput(imageAlt, { imageAlt = it }) }; FabricatorButton("Insert image", { onValueChange(value.update(insertEditorBlock(value.current, "image", mapOf("src" to EditorJson.Text(imageSource), "alt" to EditorJson.Text(imageAlt))))); imageOpen = false }, enabled = imageSource.isNotBlank()) }
    FabricatorDialog(table != null, { table = null }, "Edit table") {
        tableDraft.forEachIndexed { row, cells -> Row { cells.forEachIndexed { column, text -> FabricatorInput(text, { next -> tableDraft = tableDraft.mapIndexed { rowIndex, values -> values.mapIndexed { columnIndex, value -> if (rowIndex == row && columnIndex == column) next else value } } }, Modifier.weight(1f), "Cell") } } }
        Row { FabricatorButton("Add row", { tableDraft = tableDraft + listOf(List(tableDraft.firstOrNull()?.size ?: 1) { "" }) }, variant = FabricatorVariant.Outline); FabricatorButton("Add column", { tableDraft = tableDraft.map { it + "" } }, variant = FabricatorVariant.Outline) }
        FabricatorButton("Save table", { table?.let { updateBlock(it.copy(attrs = it.attrs + createEditorTableAttrs(tableDraft), source = null)) }; table = null })
    }
}

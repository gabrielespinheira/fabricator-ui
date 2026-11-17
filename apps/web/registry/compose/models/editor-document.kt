package dev.fabricator.ui.models

class EditorDocumentError(message: String) : IllegalArgumentException(message)
sealed class EditorJson {
    data class Text(val value: String) : EditorJson()
    data class Number(val value: Double) : EditorJson() { init { if (!value.isFinite()) throw EditorDocumentError("Document numbers must be finite.") } }
    data class BooleanValue(val value: Boolean) : EditorJson()
    data class ArrayValue(val values: List<EditorJson>) : EditorJson()
    data class ObjectValue(val values: Map<String, EditorJson>) : EditorJson()
    data object Null : EditorJson()
}
data class EditorMark(val type: String, val attrs: Map<String, String> = emptyMap())
data class EditorInline(val text: String, val marks: List<EditorMark> = emptyList(), val raw: Boolean = false)
data class EditorSource(val text: String, val before: String, val fingerprint: String)
data class EditorBlock(val id: String, val type: String, val indent: Int = 0, val content: List<EditorInline> = emptyList(), val attrs: Map<String, EditorJson> = emptyMap(), val source: EditorSource? = null) {
    val text: String get() = content.joinToString("") { it.text }
    val isVoid: Boolean get() = type in setOf("divider", "image", "table")
    val flatText: String get() = if (isVoid) "\uFFFC" else text.replace('\n', '\u2028')
}
data class EditorDocument(val frontmatter: String? = null, val blocks: List<EditorBlock>, val frontmatterSource: String? = null, val trailing: String = "") {
    init { require(blocks.isNotEmpty() && blocks.map { it.id }.distinct().size == blocks.size) }
    val flatText: String get() = blocks.joinToString("\n") { it.flatText }
}
data class EditorPosition(val blockId: String, val offset: Int)
data class EditorSelection(val anchor: EditorPosition, val focus: EditorPosition)
data class EditorState(val document: EditorDocument, val selection: EditorSelection, val storedMarks: List<EditorMark>? = null) {
    constructor(text: String, selectionStart: Int = 0, selectionEnd: Int = selectionStart) : this(
        EditorDocument(blocks = listOf(EditorBlock("block-0", "paragraph", content = if (text.isEmpty()) emptyList() else listOf(EditorInline(text))))),
        EditorSelection(EditorPosition("block-0", selectionStart), EditorPosition("block-0", selectionEnd)),
    )
    val text: String get() = document.flatText
    val selectionStart: Int get() = minOf(toEditorFlatOffset(document, selection.anchor), toEditorFlatOffset(document, selection.focus))
    val selectionEnd: Int get() = maxOf(toEditorFlatOffset(document, selection.anchor), toEditorFlatOffset(document, selection.focus))
}
enum class EditorCommand { Paragraph, Bold, Italic, Strike, Code, Heading, Quote, BulletList, OrderedList, TaskList, Link, HorizontalRule, CodeBlock, Table }

fun normalizeEditorRuns(runs: List<EditorInline>): List<EditorInline> {
    val order = listOf("link", "bold", "italic", "strike", "code")
    val output = mutableListOf<EditorInline>()
    for (run in runs.filter { it.text.isNotEmpty() }) {
        val normalized = run.copy(marks = run.marks.distinct().sortedWith(compareBy({ order.indexOf(it.type).let { index -> if (index < 0) order.size else index } }, { it.type })))
        val previous = output.lastOrNull()
        if (previous != null && previous.marks == normalized.marks && previous.raw == normalized.raw) output[output.lastIndex] = previous.copy(text = previous.text + normalized.text) else output += normalized
    }
    return output
}
fun sliceEditorRuns(runs: List<EditorInline>, from: Int, through: Int): List<EditorInline> {
    var position = 0
    return runs.mapNotNull { run -> val start = maxOf(0, from - position); val end = minOf(run.text.length, through - position); position += run.text.length; if (start >= end) null else run.copy(text = run.text.substring(start, end)) }
}
fun toEditorFlatOffset(document: EditorDocument, position: EditorPosition): Int {
    var offset = 0
    for (block in document.blocks) { if (block.id == position.blockId) return offset + position.offset.coerceIn(0, block.flatText.length); offset += block.flatText.length + 1 }
    throw EditorDocumentError("The selected block no longer exists: ${position.blockId}")
}
fun fromEditorFlatOffset(document: EditorDocument, offset: Int): EditorPosition {
    val clamped = offset.coerceIn(0, document.flatText.length)
    var start = 0
    for (block in document.blocks) { if (clamped <= start + block.flatText.length) return EditorPosition(block.id, clamped - start); start += block.flatText.length + 1 }
    val last = document.blocks.last()
    return EditorPosition(last.id, last.flatText.length)
}
private fun nextEditorBlockId(blocks: List<EditorBlock>): String {
    val ids = blocks.map { it.id }.toSet()
    var serial = 0
    while ("block-$serial" in ids) serial += 1
    return "block-$serial"
}
fun createEditorStateFromMarkdown(markdown: String): EditorState {
    val document = parseEditorMarkdown(markdown)
    val position = EditorPosition(document.blocks.first().id, 0)
    return EditorState(document, EditorSelection(position, position))
}
fun editorMarksAt(state: EditorState, flatOffset: Int = state.selectionStart): List<EditorMark> {
    if (state.storedMarks != null) return state.storedMarks
    val position = fromEditorFlatOffset(state.document, flatOffset)
    val block = state.document.blocks.first { it.id == position.blockId }
    var offset = 0
    for (run in block.content) { offset += run.text.length; if (position.offset <= offset) return if (position.offset == offset) run.marks.filterNot { it.type == "link" || it.type == "code" } else run.marks }
    return emptyList()
}
fun replaceEditorRange(state: EditorState, from: Int, through: Int, insertion: String): EditorState {
    val start = fromEditorFlatOffset(state.document, from)
    val end = fromEditorFlatOffset(state.document, through)
    val blocks = state.document.blocks
    val firstIndex = blocks.indexOfFirst { it.id == start.blockId }
    val lastIndex = blocks.indexOfFirst { it.id == end.blockId }
    val first = blocks[firstIndex]
    val last = blocks[lastIndex]
    val prefix = if (first.isVoid) emptyList() else sliceEditorRuns(first.content, 0, start.offset)
    val suffix = if (last.isVoid) emptyList() else sliceEditorRuns(last.content, end.offset, last.text.length)
    val text = if (first.type == "code" && firstIndex == lastIndex) insertion.replace('\n', '\u2028') else insertion
    val segments = text.split('\n')
    val marks = editorMarksAt(state, from)
    val replacements = mutableListOf<EditorBlock>()
    segments.forEachIndexed { index, segment ->
        val leading = if (index == 0) prefix else emptyList()
        val trailing = if (index == segments.lastIndex) suffix else emptyList()
        val content = normalizeEditorRuns(leading + (if (segment.isEmpty()) emptyList() else listOf(EditorInline(segment.replace('\u2028', '\n'), marks))) + trailing)
        val block = if (index == 0 && !first.isVoid) first.copy(content = content, source = null) else EditorBlock(nextEditorBlockId(blocks + replacements), "paragraph", content = content)
        replacements += block
    }
    val document = state.document.copy(blocks = blocks.take(firstIndex) + replacements + blocks.drop(lastIndex + 1))
    val caret = fromEditorFlatOffset(document, from.coerceIn(0, state.text.length) + text.length)
    return state.copy(document = document, selection = EditorSelection(caret, caret), storedMarks = null)
}
fun updateEditorText(state: EditorState, text: String, selectionStart: Int, selectionEnd: Int): EditorState {
    val previous = state.text
    var prefix = 0
    while (prefix < minOf(previous.length, text.length) && previous[prefix] == text[prefix]) prefix += 1
    var suffix = 0
    while (suffix < previous.length - prefix && suffix < text.length - prefix && previous[previous.lastIndex - suffix] == text[text.lastIndex - suffix]) suffix += 1
    val edited = if (previous == text) state else replaceEditorRange(state, prefix, previous.length - suffix, text.substring(prefix, text.length - suffix))
    return edited.copy(selection = EditorSelection(fromEditorFlatOffset(edited.document, selectionStart), fromEditorFlatOffset(edited.document, selectionEnd)))
}
fun toggleEditorMark(state: EditorState, mark: EditorMark): EditorState {
    if (state.selectionStart == state.selectionEnd) {
        val marks = editorMarksAt(state)
        return state.copy(storedMarks = if (marks.any { it.type == mark.type }) marks.filterNot { it.type == mark.type } else marks + mark)
    }
    val selected = mutableListOf<EditorInline>()
    var offset = 0
    for (block in state.document.blocks) { if (!block.isVoid) selected += sliceEditorRuns(block.content, maxOf(0, state.selectionStart - offset), minOf(block.text.length, state.selectionEnd - offset)); offset += block.flatText.length + 1 }
    val remove = selected.isNotEmpty() && selected.all { run -> run.marks.any { it.type == mark.type } }
    offset = 0
    val blocks = state.document.blocks.map { block ->
        val from = maxOf(0, state.selectionStart - offset)
        val through = minOf(block.text.length, state.selectionEnd - offset)
        offset += block.flatText.length + 1
        if (block.isVoid || from >= through) block else block.copy(content = normalizeEditorRuns(sliceEditorRuns(block.content, 0, from) + sliceEditorRuns(block.content, from, through).map { run -> run.copy(marks = run.marks.filterNot { it.type == mark.type } + if (remove) emptyList() else listOf(mark)) } + sliceEditorRuns(block.content, through, block.text.length)), source = null)
    }
    return state.copy(document = state.document.copy(blocks = blocks))
}
fun setEditorBlockType(state: EditorState, type: String, attrs: Map<String, EditorJson> = emptyMap()): EditorState {
    val from = fromEditorFlatOffset(state.document, state.selectionStart)
    val through = fromEditorFlatOffset(state.document, state.selectionEnd)
    val first = state.document.blocks.indexOfFirst { it.id == from.blockId }
    val last = state.document.blocks.indexOfFirst { it.id == through.blockId }
    return state.copy(document = state.document.copy(blocks = state.document.blocks.mapIndexed { index, block -> if (index in first..last && !block.isVoid) block.copy(type = type, attrs = attrs, source = null) else block }))
}
fun insertEditorBlock(state: EditorState, type: String, attrs: Map<String, EditorJson> = emptyMap()): EditorState {
    val current = fromEditorFlatOffset(state.document, state.selectionEnd)
    val index = state.document.blocks.indexOfFirst { it.id == current.blockId }
    val block = EditorBlock(nextEditorBlockId(state.document.blocks), type, attrs = attrs)
    val after = EditorBlock(nextEditorBlockId(state.document.blocks + block), "paragraph")
    val document = state.document.copy(blocks = state.document.blocks.take(index + 1) + block + after + state.document.blocks.drop(index + 1))
    val caret = EditorPosition(after.id, 0)
    return state.copy(document = document, selection = EditorSelection(caret, caret))
}
fun applyEditorCommand(state: EditorState, command: EditorCommand): EditorState = when (command) {
    EditorCommand.Bold -> toggleEditorMark(state, EditorMark("bold"))
    EditorCommand.Italic -> toggleEditorMark(state, EditorMark("italic"))
    EditorCommand.Strike -> toggleEditorMark(state, EditorMark("strike"))
    EditorCommand.Code -> toggleEditorMark(state, EditorMark("code"))
    EditorCommand.Link -> toggleEditorMark(state, EditorMark("link", mapOf("href" to "https://")))
    EditorCommand.Paragraph -> setEditorBlockType(state, "paragraph")
    EditorCommand.Heading -> setEditorBlockType(state, "heading", mapOf("level" to EditorJson.Number(1.0)))
    EditorCommand.Quote -> setEditorBlockType(state, "quote")
    EditorCommand.BulletList -> setEditorBlockType(state, "bulleted")
    EditorCommand.OrderedList -> setEditorBlockType(state, "numbered")
    EditorCommand.TaskList -> setEditorBlockType(state, "task", mapOf("checked" to EditorJson.BooleanValue(false)))
    EditorCommand.HorizontalRule -> insertEditorBlock(state, "divider")
    EditorCommand.CodeBlock -> setEditorBlockType(state, "code", mapOf("language" to EditorJson.Text("")))
    EditorCommand.Table -> insertEditorBlock(state, "table", createEditorTableAttrs(listOf(listOf("Column", "Column"), listOf("", ""))))
}
data class EditorSlashCommand(val id: String, val title: String, val command: EditorCommand)
val editorSlashCommands = listOf(EditorSlashCommand("paragraph", "Text", EditorCommand.Paragraph), EditorSlashCommand("heading", "Heading", EditorCommand.Heading), EditorSlashCommand("bulleted", "Bullet list", EditorCommand.BulletList), EditorSlashCommand("numbered", "Numbered list", EditorCommand.OrderedList), EditorSlashCommand("task", "Task list", EditorCommand.TaskList), EditorSlashCommand("quote", "Quote", EditorCommand.Quote), EditorSlashCommand("code", "Code block", EditorCommand.CodeBlock), EditorSlashCommand("divider", "Divider", EditorCommand.HorizontalRule), EditorSlashCommand("table", "Table", EditorCommand.Table))
fun getEditorSlashCommands(state: EditorState): List<EditorSlashCommand> {
    if (state.selectionStart != state.selectionEnd) return emptyList()
    val position = fromEditorFlatOffset(state.document, state.selectionStart)
    val block = state.document.blocks.first { it.id == position.blockId }
    val query = block.text.take(position.offset)
    if (!query.startsWith('/') || query.contains(' ')) return emptyList()
    return editorSlashCommands.filter { it.id.contains(query.drop(1), true) || it.title.contains(query.drop(1), true) }
}
fun applyEditorSlashCommand(state: EditorState, id: String): EditorState {
    val command = editorSlashCommands.first { it.id == id }
    val position = fromEditorFlatOffset(state.document, state.selectionStart)
    val blockStart = state.selectionStart - position.offset
    return applyEditorCommand(replaceEditorRange(state, blockStart, state.selectionStart, ""), command.command)
}
data class EditorHistory(val current: EditorState, val past: List<EditorState> = emptyList(), val future: List<EditorState> = emptyList()) {
    fun update(state: EditorState): EditorHistory = if (state.document == current.document) copy(current = state) else EditorHistory(state, (past + current).takeLast(100))
    fun apply(command: EditorCommand): EditorHistory = update(applyEditorCommand(current, command))
    fun undo(): EditorHistory = if (past.isEmpty()) this else EditorHistory(past.last(), past.dropLast(1), listOf(current) + future)
    fun redo(): EditorHistory = if (future.isEmpty()) this else EditorHistory(future.first(), past + current, future.drop(1))
}

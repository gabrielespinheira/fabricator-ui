package dev.fabricator.ui.models

fun quoteEditorJson(value: String): String = buildString {
    append('"')
    value.forEach { character -> when (character) { '"' -> append("\\\""); '\\' -> append("\\\\"); '\n' -> append("\\n"); '\r' -> append("\\r"); '\t' -> append("\\t"); else -> if (character.code < 32) append("\\u${character.code.toString(16).padStart(4, '0')}") else append(character) } }
    append('"')
}
fun stringifyEditorJson(value: EditorJson): String = when (value) {
    is EditorJson.Text -> quoteEditorJson(value.value)
    is EditorJson.Number -> if (value.value == value.value.toLong().toDouble()) value.value.toLong().toString() else value.value.toString()
    is EditorJson.BooleanValue -> value.value.toString()
    is EditorJson.ArrayValue -> value.values.joinToString(",", "[", "]", transform = ::stringifyEditorJson)
    is EditorJson.ObjectValue -> value.values.toSortedMap().entries.joinToString(",", "{", "}") { "${quoteEditorJson(it.key)}:${stringifyEditorJson(it.value)}" }
    EditorJson.Null -> "null"
}
fun editorInlineJson(run: EditorInline): EditorJson = EditorJson.ObjectValue(buildMap {
    put("text", EditorJson.Text(run.text))
    if (run.raw) put("raw", EditorJson.BooleanValue(true))
    if (run.marks.isNotEmpty()) put("marks", EditorJson.ArrayValue(run.marks.map { mark -> EditorJson.ObjectValue(buildMap { put("type", EditorJson.Text(mark.type)); if (mark.attrs.isNotEmpty()) put("attrs", EditorJson.ObjectValue(mark.attrs.mapValues { EditorJson.Text(it.value) })) }) }))
})
fun editorBlockFingerprint(block: EditorBlock): String = stringifyEditorJson(EditorJson.ArrayValue(listOf(EditorJson.Text(block.type), EditorJson.Number(block.indent.toDouble()), EditorJson.ArrayValue(normalizeEditorRuns(block.content).map(::editorInlineJson)), EditorJson.ObjectValue(block.attrs))))

fun parseEditorInline(markdown: String): List<EditorInline> {
    val pattern = Regex("\\*\\*(.+?)\\*\\*|~~(.+?)~~|`([^`]+)`|_([^_]+)_|\\*([^*]+)\\*|\\[([^]]+)\\]\\(([^)\\s]+)(?: \\\"([^\\\"]*)\\\")?\\)")
    val runs = mutableListOf<EditorInline>()
    var position = 0
    for (match in pattern.findAll(markdown)) {
        if (match.range.first > position) runs += EditorInline(markdown.substring(position, match.range.first).replace(Regex("\\\\([\\\\`*_~\\[\\]])"), "$1"))
        val groups = match.groupValues
        val mark = when { groups[1].isNotEmpty() -> EditorMark("bold"); groups[2].isNotEmpty() -> EditorMark("strike"); groups[3].isNotEmpty() -> EditorMark("code"); groups[4].isNotEmpty() || groups[5].isNotEmpty() -> EditorMark("italic"); else -> EditorMark("link", buildMap { put("href", groups[7]); if (groups[8].isNotEmpty()) put("title", groups[8]) }) }
        val text = groups.drop(1).first { it.isNotEmpty() }
        val nested = if (mark.type == "code") listOf(EditorInline(text)) else parseEditorInline(text)
        runs += nested.map { it.copy(marks = it.marks + mark) }
        position = match.range.last + 1
    }
    if (position < markdown.length) runs += EditorInline(markdown.substring(position).replace(Regex("\\\\([\\\\`*_~\\[\\]])"), "$1"))
    return normalizeEditorRuns(runs)
}
fun serializeEditorRuns(runs: List<EditorInline>): String = runs.joinToString("") { run ->
    if (run.raw) run.text else {
        var text = if (run.marks.any { it.type == "code" }) run.text else run.text.replace(Regex("([\\\\`*_~\\[\\]])"), "\\\\$1")
        for (mark in run.marks.asReversed()) text = when (mark.type) { "bold" -> "**$text**"; "italic" -> "_${text}_"; "strike" -> "~~$text~~"; "code" -> if ('`' in text) "`` $text ``" else "`$text`"; "link" -> "[$text](${mark.attrs["href"].orEmpty()}${mark.attrs["title"]?.let { " \"$it\"" }.orEmpty()})"; else -> text }
        text
    }
}
fun createEditorTableAttrs(cells: List<List<String>>, align: List<String?> = emptyList()): Map<String, EditorJson> {
    val columns = maxOf(1, cells.maxOfOrNull { it.size } ?: 1)
    return mapOf("rows" to EditorJson.ArrayValue(cells.map { row -> EditorJson.ArrayValue(List(columns) { column -> EditorJson.ArrayValue(parseEditorInline(row.getOrElse(column) { "" }).map(::editorInlineJson)) }) }), "align" to EditorJson.ArrayValue(List(columns) { column -> align.getOrNull(column)?.let { EditorJson.Text(it) } ?: EditorJson.Null }))
}
fun getEditorTableRows(block: EditorBlock): List<List<List<EditorInline>>> {
    val rows = block.attrs["rows"]
    if (rows !is EditorJson.ArrayValue) throw EditorDocumentError("Table rows must be an array.")
    return rows.values.map { row ->
        if (row !is EditorJson.ArrayValue) throw EditorDocumentError("Table row must be an array.")
        row.values.map { cell ->
            if (cell !is EditorJson.ArrayValue) throw EditorDocumentError("Table cells must contain runs.")
            cell.values.map { value ->
                if (value !is EditorJson.ObjectValue) throw EditorDocumentError("Table run must be an object.")
                val text = value.values["text"]
                if (text !is EditorJson.Text) throw EditorDocumentError("Table run needs text.")
                val marks = value.values["marks"]
                EditorInline(text.value, if (marks is EditorJson.ArrayValue) marks.values.map { mark ->
                    if (mark !is EditorJson.ObjectValue) throw EditorDocumentError("Table marks must be objects.")
                    val type = mark.values["type"]
                    if (type !is EditorJson.Text) throw EditorDocumentError("Table mark needs a type.")
                    val attrs = mark.values["attrs"]
                    EditorMark(type.value, if (attrs is EditorJson.ObjectValue) attrs.values.mapValues { (_, attribute) -> if (attribute !is EditorJson.Text) throw EditorDocumentError("Mark attributes must be strings."); attribute.value } else emptyMap())
                } else emptyList())
            }
        }
    }
}
fun setEditorTableCell(block: EditorBlock, row: Int, column: Int, markdown: String): EditorBlock {
    val cells = getEditorTableRows(block).map { it.map(::serializeEditorRuns) }
    require(row in cells.indices && column in cells[row].indices)
    val align = (block.attrs["align"] as? EditorJson.ArrayValue)?.values?.map { (it as? EditorJson.Text)?.value }.orEmpty()
    val next = cells.mapIndexed { rowIndex, values -> values.mapIndexed { columnIndex, text -> if (rowIndex == row && columnIndex == column) markdown else text } }
    return block.copy(attrs = block.attrs + createEditorTableAttrs(next, align), source = null)
}

fun parseEditorMarkdown(markdown: String): EditorDocument {
    if (markdown.isEmpty()) return EditorDocument(blocks = listOf(EditorBlock("block-0", "paragraph", source = EditorSource("", "", "[\"paragraph\",0,[],{}]"))))
    val hasFinalNewline = markdown.endsWith('\n')
    val lines = markdown.split('\n').let { if (hasFinalNewline) it.dropLast(1) else it }
    var index = 0
    var before = ""
    var frontmatter: String? = null
    var frontmatterSource: String? = null
    val blocks = mutableListOf<EditorBlock>()
    if (lines.firstOrNull()?.trim() == "---") {
        val end = (1 until lines.size).firstOrNull { lines[it].trim() == "---" }
        if (end != null) { frontmatter = lines.subList(1, end).joinToString("\n"); frontmatterSource = lines.take(end + 1).joinToString("\n"); index = end + 1; before = if (index < lines.size || hasFinalNewline) "\n" else "" }
    }
    fun hasBlockPrefix(line: String): Boolean = line.matches(Regex("^\\s*(#{1,6} |[-+*] |\\d+\\. |> |```|~~~|!\\[|<).*")) || line.trim().matches(Regex("^(?:-{3,}|\\*{3,}|_{3,})$"))
    while (index < lines.size) {
        if (lines[index].isBlank()) { before += lines[index] + if (index < lines.lastIndex || hasFinalNewline) "\n" else ""; index += 1; continue }
        val start = index
        val line = lines[index].removeSuffix("\r")
        var type = "paragraph"
        var indent = 0
        var attrs: Map<String, EditorJson> = emptyMap()
        var content: List<EditorInline>
        val fence = Regex("^(`{3,}|~{3,})(.*)$").matchEntire(line)
        val heading = Regex("^(#{1,6}) (.*)$").matchEntire(line)
        val task = Regex("^(\\s*)[-+*] \\[([ xX])\\] (.*)$").matchEntire(line)
        val list = Regex("^(\\s*)([-+*]|\\d+\\.) (.*)$").matchEntire(line)
        val image = Regex("^!\\[([^]]*)\\]\\(([^)\\s]+)(?: \"([^\"]*)\")?\\)$").matchEntire(line)
        when {
            fence != null -> {
                type = "code"
                val opening = fence.groupValues[1]
                attrs = mapOf("language" to EditorJson.Text(fence.groupValues[2].trim()))
                index += 1
                val codeStart = index
                while (index < lines.size && !lines[index].trim().startsWith(opening)) index += 1
                content = listOf(EditorInline(lines.subList(codeStart, index).joinToString("\n")))
                if (index < lines.size) index += 1
            }
            heading != null -> { type = "heading"; attrs = mapOf("level" to EditorJson.Number(heading.groupValues[1].length.toDouble())); content = parseEditorInline(heading.groupValues[2]); index += 1 }
            task != null -> { type = "task"; indent = task.groupValues[1].length / 2; attrs = mapOf("checked" to EditorJson.BooleanValue(task.groupValues[2] != " ")); content = parseEditorInline(task.groupValues[3]); index += 1 }
            list != null -> { type = if (list.groupValues[2].first().isDigit()) "numbered" else "bulleted"; indent = list.groupValues[1].length / 2; if (type == "numbered") attrs = mapOf("start" to EditorJson.Number(list.groupValues[2].dropLast(1).toDouble())); content = parseEditorInline(list.groupValues[3]); index += 1 }
            line.startsWith("> ") -> { type = "quote"; content = parseEditorInline(line.drop(2)); index += 1 }
            line.trim().matches(Regex("^(?:-{3,}|\\*{3,}|_{3,})$")) -> { type = "divider"; content = emptyList(); index += 1 }
            image != null -> { type = "image"; attrs = buildMap { put("alt", EditorJson.Text(image.groupValues[1])); put("src", EditorJson.Text(image.groupValues[2])); if (image.groupValues[3].isNotEmpty()) put("title", EditorJson.Text(image.groupValues[3])) }; content = emptyList(); index += 1 }
            line.startsWith('|') && index + 1 < lines.size && lines[index + 1].contains("---") -> {
                type = "table"
                val cells = mutableListOf(line.trim('|').split('|').map(String::trim))
                val alignment = lines[index + 1].trim('|').split('|').map { value -> val cell = value.trim(); when { cell.startsWith(':') && cell.endsWith(':') -> "center"; cell.endsWith(':') -> "right"; cell.startsWith(':') -> "left"; else -> null } }
                index += 2
                while (index < lines.size && lines[index].startsWith('|')) { cells += lines[index].trim('|').split('|').map(String::trim); index += 1 }
                attrs = createEditorTableAttrs(cells, alignment)
                content = emptyList()
            }
            line.startsWith('<') -> { type = "raw"; index += 1; while (index < lines.size && lines[index].isNotBlank()) index += 1; content = listOf(EditorInline(lines.subList(start, index).joinToString("\n"), raw = true)) }
            else -> { index += 1; while (index < lines.size && lines[index].isNotBlank() && !hasBlockPrefix(lines[index])) index += 1; content = parseEditorInline(lines.subList(start, index).joinToString("\n")) }
        }
        val block = EditorBlock("block-${blocks.size}", type, indent, content, attrs)
        blocks += block.copy(source = EditorSource(lines.subList(start, index).joinToString("\n"), before, editorBlockFingerprint(block)))
        before = if (index < lines.size || hasFinalNewline) "\n" else ""
    }
    if (blocks.isEmpty()) blocks += EditorBlock("block-0", "paragraph", source = EditorSource("", "", "[\"paragraph\",0,[],{}]"))
    return EditorDocument(frontmatter, blocks, frontmatterSource, before)
}

fun serializeEditorBlock(block: EditorBlock): String {
    val text = serializeEditorRuns(block.content)
    fun attribute(name: String): String = (block.attrs[name] as? EditorJson.Text)?.value.orEmpty()
    val prefix = "  ".repeat(block.indent)
    return when (block.type) {
        "heading" -> "#".repeat(((block.attrs["level"] as? EditorJson.Number)?.value?.toInt() ?: 1).coerceIn(1, 6)) + " $text"
        "bulleted" -> "$prefix- $text"
        "numbered" -> "$prefix${(block.attrs["start"] as? EditorJson.Number)?.value?.toInt() ?: 1}. $text"
        "task" -> "$prefix- [${if ((block.attrs["checked"] as? EditorJson.BooleanValue)?.value == true) "x" else " "}] $text"
        "quote" -> text.lines().joinToString("\n") { "> $it" }
        "code" -> "```${attribute("language")}\n${block.text}\n```"
        "divider" -> "---"
        "image" -> "![${attribute("alt")}](${attribute("src")}${attribute("title").takeIf(String::isNotEmpty)?.let { " \"$it\"" }.orEmpty()})"
        "table" -> {
            val rows = getEditorTableRows(block).map { row -> "| " + row.joinToString(" | ") { serializeEditorRuns(it).replace("|", "\\|") } + " |" }
            val columns = getEditorTableRows(block).firstOrNull()?.size ?: 1
            val align = (block.attrs["align"] as? EditorJson.ArrayValue)?.values.orEmpty()
            val rule = "| " + List(columns) { column -> when ((align.getOrNull(column) as? EditorJson.Text)?.value) { "left" -> ":---"; "right" -> "---:"; "center" -> ":---:"; else -> "---" } }.joinToString(" | ") + " |"
            (rows.take(1) + rule + rows.drop(1)).joinToString("\n")
        }
        "raw" -> block.text
        else -> prefix + text
    }
}
fun serializeEditorMarkdown(document: EditorDocument): String = buildString {
    if (document.frontmatter != null) append(document.frontmatterSource ?: "---\n${document.frontmatter}\n---")
    document.blocks.forEachIndexed { index, block ->
        val source = block.source
        if (source != null && source.fingerprint == editorBlockFingerprint(block)) { append(source.before); append(source.text) }
        else { if (index > 0 || document.frontmatter != null) append(if (block.type in setOf("bulleted", "numbered", "task")) "\n" else "\n\n"); append(serializeEditorBlock(block)) }
    }
    append(document.trailing)
}

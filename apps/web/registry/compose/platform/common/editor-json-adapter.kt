package dev.fabricator.ui

import dev.fabricator.ui.models.*
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.*

private fun convertEditorJson(value: JsonElement): EditorJson = when (value) {
    is JsonObject -> EditorJson.ObjectValue(value.mapValues { convertEditorJson(it.value) })
    is JsonArray -> EditorJson.ArrayValue(value.map(::convertEditorJson))
    is JsonPrimitive -> when {
        value == JsonNull -> EditorJson.Null
        value.isString -> EditorJson.Text(value.content)
        value.booleanOrNull != null -> EditorJson.BooleanValue(requireNotNull(value.booleanOrNull))
        else -> { val number = value.doubleOrNull; if (number == null || !number.isFinite()) throw EditorDocumentError("Document contains an invalid number."); EditorJson.Number(number) }
    }
}
private fun requireEditorObject(value: EditorJson?, path: String): Map<String, EditorJson> {
    if (value !is EditorJson.ObjectValue) throw EditorDocumentError("$path must be an object.")
    return value.values
}
private fun requireEditorArray(value: EditorJson?, path: String): List<EditorJson> {
    if (value !is EditorJson.ArrayValue) throw EditorDocumentError("$path must be an array.")
    return value.values
}
private fun requireEditorString(value: EditorJson?, path: String): String {
    if (value !is EditorJson.Text) throw EditorDocumentError("$path must be a string.")
    return value.value
}
private fun decodeEditorRun(value: EditorJson): EditorInline {
    val run = requireEditorObject(value, "Inline run")
    val marks = run["marks"]?.let { requireEditorArray(it, "Marks").map { mark ->
        val values = requireEditorObject(mark, "Mark")
        val attrs = values["attrs"]?.let { requireEditorObject(it, "Mark attributes").mapValues { (name, attribute) -> requireEditorString(attribute, name) } }.orEmpty()
        EditorMark(requireEditorString(values["type"], "Mark type"), attrs)
    } }.orEmpty()
    val raw = run["raw"]
    if (raw != null && raw != EditorJson.BooleanValue(true)) throw EditorDocumentError("An inline raw flag must be true or absent.")
    return EditorInline(requireEditorString(run["text"], "Inline text"), marks, raw != null)
}

/** The JSON adapter validates the same block/run document shape emitted by the web editor. */
fun decodeEditorDocument(source: String): EditorDocument {
    val value = try { convertEditorJson(Json.parseToJsonElement(source)) } catch (error: SerializationException) { throw EditorDocumentError("Invalid editor JSON: ${error.message}") }
    val objectValue = requireEditorObject(value, "Editor document")
    val blocks = requireEditorArray(objectValue["blocks"], "Document blocks").map { item ->
        val block = requireEditorObject(item, "Block")
        val indent = block["indent"]
        if (indent !is EditorJson.Number || indent.value < 0 || indent.value % 1 != 0.0) throw EditorDocumentError("Block indent must be a non-negative integer.")
        val saved = block["source"]?.let { saved -> val values = requireEditorObject(saved, "Block source"); EditorSource(requireEditorString(values["text"], "Source text"), requireEditorString(values["before"], "Source separator"), requireEditorString(values["fingerprint"], "Source fingerprint")) }
        EditorBlock(requireEditorString(block["id"], "Block id"), requireEditorString(block["type"], "Block type"), indent.value.toInt(), requireEditorArray(block["content"], "Block content").map(::decodeEditorRun), requireEditorObject(block["attrs"], "Block attributes"), saved)
    }
    if (blocks.isEmpty() || blocks.any { it.id.isBlank() || it.type.isBlank() } || blocks.map { it.id }.distinct().size != blocks.size) throw EditorDocumentError("Documents need nonempty blocks with unique ids and types.")
    val frontmatter = objectValue["frontmatter"]
    if (frontmatter != null && frontmatter != EditorJson.Null && frontmatter !is EditorJson.Text) throw EditorDocumentError("Frontmatter must be a string or null.")
    return EditorDocument((frontmatter as? EditorJson.Text)?.value, blocks, objectValue["frontmatterSource"]?.let { requireEditorString(it, "Frontmatter source") }, objectValue["trailing"]?.let { requireEditorString(it, "Document trailing text") }.orEmpty())
}

fun encodeEditorDocument(document: EditorDocument): String = stringifyEditorJson(EditorJson.ObjectValue(buildMap {
    put("frontmatter", document.frontmatter?.let { EditorJson.Text(it) } ?: EditorJson.Null)
    if (document.frontmatterSource != null) put("frontmatterSource", EditorJson.Text(document.frontmatterSource))
    if (document.trailing.isNotEmpty()) put("trailing", EditorJson.Text(document.trailing))
    put("blocks", EditorJson.ArrayValue(document.blocks.map { block -> EditorJson.ObjectValue(buildMap {
        put("id", EditorJson.Text(block.id)); put("type", EditorJson.Text(block.type)); put("indent", EditorJson.Number(block.indent.toDouble()))
        put("content", EditorJson.ArrayValue(block.content.map(::editorInlineJson))); put("attrs", EditorJson.ObjectValue(block.attrs))
        if (block.source != null) put("source", EditorJson.ObjectValue(mapOf("text" to EditorJson.Text(block.source.text), "before" to EditorJson.Text(block.source.before), "fingerprint" to EditorJson.Text(block.source.fingerprint))))
    }) }))
}))

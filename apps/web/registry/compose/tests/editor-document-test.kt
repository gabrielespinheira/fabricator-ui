package dev.fabricator.ui.models

import dev.fabricator.ui.decodeEditorDocument
import dev.fabricator.ui.encodeEditorDocument
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class EditorDocumentTest {
    @Test fun marksChangeRunsWithoutPuttingMarkdownIntoNativeText() {
        val original = EditorState("Hello world", 6, 11)
        val marked = applyEditorCommand(original, EditorCommand.Bold)
        assertEquals("Hello world", marked.text)
        assertEquals(listOf(EditorInline("Hello "), EditorInline("world", listOf(EditorMark("bold")))), marked.document.blocks.single().content)
        assertEquals("Hello **world**", serializeEditorMarkdown(marked.document))
        assertEquals(original.document, applyEditorCommand(marked, EditorCommand.Bold).document)
    }

    @Test fun multilineNativeEditsKeepUnaffectedBlockIdsAndInlineMarks() {
        val document = EditorDocument(blocks = listOf(EditorBlock("a", "paragraph", content = listOf(EditorInline("First"))), EditorBlock("b", "paragraph", content = listOf(EditorInline("Second", listOf(EditorMark("bold")))))))
        val state = EditorState(document, EditorSelection(EditorPosition("a", 5), EditorPosition("a", 5)))
        val next = replaceEditorRange(state, 5, 5, "\nNew")
        assertEquals("First\nNew\nSecond", next.text)
        assertEquals("a", next.document.blocks.first().id)
        assertEquals("b", next.document.blocks.last().id)
        assertEquals(listOf(EditorMark("bold")), next.document.blocks.last().content.single().marks)
    }

    @Test fun rangeReplacementMergesBlocksAndMapsCaretToSurvivingId() {
        val state = createEditorStateFromMarkdown("Alpha\n\nBeta\n\nGamma")
        val next = replaceEditorRange(state, 2, 9, "X")
        assertEquals("AlXa\nGamma", next.text)
        assertEquals(state.document.blocks.first().id, next.document.blocks.first().id)
        assertEquals(3, next.selectionStart)
        assertEquals(state.document.blocks.last().id, next.document.blocks.last().id)
    }

    @Test fun markdownRoundTripPreservesFrontmatterSpacingAndUnknownSource() {
        val markdown = "---\ntitle: Project\n---\n\n## Heading\n\nA **bold** note.\n\n<table><tr><td>custom</td></tr></table>\n"
        val document = parseEditorMarkdown(markdown)
        assertEquals("title: Project", document.frontmatter)
        assertEquals(markdown, serializeEditorMarkdown(document))
        assertEquals("raw", document.blocks.last().type)
    }

    @Test fun documentJsonUsesTheSameBlockSchemaAndRejectsDuplicateIds() {
        val source = """{"frontmatter":null,"blocks":[{"id":"a","type":"paragraph","indent":0,"content":[{"text":"Hello","marks":[{"type":"link","attrs":{"href":"https://example.com"}}]}],"attrs":{}},{"id":"b","type":"custom-chart","indent":0,"content":[],"attrs":{"values":[1,true,null,"x"]}}],"trailing":"\n"}"""
        val document = decodeEditorDocument(source)
        assertEquals(document, decodeEditorDocument(encodeEditorDocument(document)))
        assertEquals("custom-chart", document.blocks.last().type)
        assertFailsWith<EditorDocumentError> { decodeEditorDocument(source.replace("\"id\":\"b\"", "\"id\":\"a\"")) }
    }

    @Test fun slashCommandsReplaceQueryAndPreserveFollowingBlocks() {
        val state = createEditorStateFromMarkdown("/hea\n\nKeep me")
        val selection = EditorSelection(EditorPosition(state.document.blocks.first().id, 4), EditorPosition(state.document.blocks.first().id, 4))
        val pending = state.copy(selection = selection)
        assertEquals(listOf("heading"), getEditorSlashCommands(pending).map { it.id })
        val applied = applyEditorSlashCommand(pending, "heading")
        assertEquals("heading", applied.document.blocks.first().type)
        assertEquals("", applied.document.blocks.first().text)
        assertEquals("Keep me", applied.document.blocks.last().text)
        assertEquals(state.document.blocks.last().id, applied.document.blocks.last().id)
    }

    @Test fun imageDividerAndTableAreSingleNativeObjectCharacters() {
        val state = createEditorStateFromMarkdown("Before\n\n---\n\n![Cover](file:///cover.png)\n\n| Name | Status |\n| --- | --- |\n| Alpha | Done |")
        assertEquals("Before\n\uFFFC\n\uFFFC\n\uFFFC", state.text)
        val table = state.document.blocks.last()
        val updated = setEditorTableCell(table, 1, 1, "**Ready**")
        assertEquals("Ready", getEditorTableRows(updated)[1][1].single().text)
        assertEquals(listOf(EditorMark("bold")), getEditorTableRows(updated)[1][1].single().marks)
        assertTrue(serializeEditorBlock(updated).contains("**Ready**"))
    }

    @Test fun documentHistoryRestoresBothSelectionAndContent() {
        val initial = EditorState("Hello", 0, 5)
        val marked = EditorHistory(initial).apply(EditorCommand.Italic)
        assertEquals(initial, marked.undo().current)
        assertEquals(marked.current, marked.undo().redo().current)
        val typing = marked.update(replaceEditorRange(marked.current, 5, 5, "!"))
        assertEquals("Hello!", typing.current.text)
        assertEquals(marked.current, typing.undo().current)
    }
}

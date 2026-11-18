package dev.fabricator.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.drawscope.clipRect
import androidx.compose.ui.semantics.*
import androidx.compose.ui.text.*
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.OffsetMapping
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.input.TransformedText
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import dev.fabricator.ui.models.*

@Composable
fun FabricatorFileTree(nodes: List<FileNode>, expandedIds: Set<String>, onExpandedChange: (Set<String>) -> Unit, selectedId: String?, onSelect: (String) -> Unit, modifier: Modifier = Modifier, onRename: ((String, String) -> Unit)? = null, onDelete: ((String) -> Unit)? = null) {
    var query by remember { mutableStateOf("") }
    var editing by remember { mutableStateOf<FileNode?>(null) }
    var name by remember { mutableStateOf("") }
    Column(modifier) {
        FabricatorSearch(query, { query = it }, placeholder = "Find a file…")
        val rows = flattenFileTree(nodes, expandedIds, query)
        LazyColumn(Modifier.heightIn(max = 360.dp)) { items(rows, key = { it.node.id }) { (node, depth) ->
            FabricatorContextMenu(content = {
                FabricatorButton({ if (node.children != null) onExpandedChange(if (node.id in expandedIds) expandedIds - node.id else expandedIds + node.id); onSelect(node.id) }, Modifier.fillMaxWidth().padding(start = (depth * 16).dp).semantics { selected = selectedId == node.id; if (node.children != null) stateDescription = if (node.id in expandedIds) "Expanded folder" else "Collapsed folder" }, if (selectedId == node.id) FabricatorVariant.Secondary else FabricatorVariant.Ghost) {
                    FabricatorIcon(if (node.children != null) { if (node.id in expandedIds) "folder-open" else "folder" } else "file")
                    FabricatorText(node.name, Modifier.weight(1f))
                    if (node.children != null) FabricatorIcon(if (node.id in expandedIds) "chevron-down" else "chevron-right", size = 12.dp)
                }
            }, menu = {
                if (onRename != null) FabricatorMenuItem("Rename", { editing = node; name = node.name }, icon = "pencil")
                if (onDelete != null) FabricatorMenuItem("Delete", { onDelete(node.id) }, destructive = true, icon = "trash")
            })
        } }
    }
    FabricatorDialog(editing != null, { editing = null }, "Rename file") { FabricatorInput(name, { name = it }); FabricatorButton("Save", { editing?.let { onRename?.invoke(it.id, name) }; editing = null }, enabled = name.isNotBlank()) }
}


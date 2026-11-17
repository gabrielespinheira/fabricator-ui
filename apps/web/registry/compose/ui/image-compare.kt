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
fun FabricatorImageCompare(fraction: Float, onFractionChange: (Float) -> Unit, modifier: Modifier = Modifier, before: @Composable () -> Unit, after: @Composable () -> Unit) {
    Column(modifier) {
        Box(Modifier.fillMaxWidth().aspectRatio(16f / 10f)) {
            Box(Modifier.fillMaxSize()) { after() }
            Box(Modifier.fillMaxSize().drawWithContent { clipRect(right = size.width * fraction.coerceIn(0f, 1f)) { this@drawWithContent.drawContent() } }) { before() }
            Box(Modifier.fillMaxWidth(fraction.coerceIn(0f, 1f)).fillMaxHeight(), contentAlignment = Alignment.CenterEnd) { Box(Modifier.width(2.dp).fillMaxHeight().background(LocalFabricatorTheme.current.color("background"))) }
            Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween) { FabricatorBadge("Before"); FabricatorBadge("After") }
        }
        FabricatorSlider(fraction, onFractionChange, label = "Image comparison divider")
    }
}


package dev.fabricator.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.*
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import dev.fabricator.ui.models.*
import kotlin.math.abs

data class FabricatorOption(val value: String, val label: String, val description: String? = null, val enabled: Boolean = true)

@Composable
fun FabricatorWorkspaceSwitcher(value: String, onValueChange: (String) -> Unit, workspaces: List<FabricatorOption>, modifier: Modifier = Modifier) { FabricatorSelect(value, onValueChange, workspaces, modifier) }

@Composable
fun FabricatorField(label: String, modifier: Modifier = Modifier, description: String? = null, error: String? = null, required: Boolean = false, content: @Composable () -> Unit) {
    val theme = LocalFabricatorTheme.current
    Column(modifier, verticalArrangement = Arrangement.spacedBy(theme.space(4))) {
        FabricatorLabel(label, required = required)
        content()
        if (error != null) FabricatorText(error, Modifier.semantics { liveRegion = LiveRegionMode.Polite }, color = theme.color("destructive-text"), size = 12)
        else if (description != null) FabricatorText(description, muted = true, size = 12)
    }
}

@Composable
fun FabricatorForm(state: FormState, onStateChange: (FormState) -> Unit, rules: Map<String, List<FormRule>>, onSubmit: (Map<String, String>) -> Unit, modifier: Modifier = Modifier, content: @Composable ColumnScope.(submit: () -> Unit) -> Unit) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(LocalFabricatorTheme.current.space(16))) {
        content {
            val validated = validateForm(state, rules)
            onStateChange(validated)
            if (validated.isValid) onSubmit(validated.values)
        }
    }
}

@Composable
fun FabricatorInputGroup(modifier: Modifier = Modifier, leading: (@Composable () -> Unit)? = null, trailing: (@Composable () -> Unit)? = null, content: @Composable RowScope.() -> Unit) {
    Row(modifier, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LocalFabricatorTheme.current.space(8))) { leading?.invoke(); content(); trailing?.invoke() }
}

@Composable
fun FabricatorSelect(value: String?, onValueChange: (String) -> Unit, options: List<FabricatorOption>, modifier: Modifier = Modifier, placeholder: String = "Select an option", enabled: Boolean = true) {
    var expanded by remember { mutableStateOf(false) }
    Box(modifier) {
        FabricatorButton({ expanded = true }, Modifier.fillMaxWidth().semantics { role = Role.DropdownList; stateDescription = if (expanded) "Expanded" else "Collapsed" }, FabricatorVariant.Outline, enabled = enabled) {
            FabricatorText(options.firstOrNull { it.value == value }?.label ?: placeholder, Modifier.weight(1f), muted = value == null)
            FabricatorIcon("chevrons-up-down")
        }
        FabricatorDropdownMenu(expanded, { expanded = false }) {
            options.forEach { option -> FabricatorMenuItem(option.label, { onValueChange(option.value); expanded = false }, selected = option.value == value, enabled = option.enabled, description = option.description) }
        }
    }
}

@Composable
fun FabricatorCombobox(value: String?, onValueChange: (String) -> Unit, options: List<FabricatorOption>, modifier: Modifier = Modifier, placeholder: String = "Search options…") {
    var expanded by remember { mutableStateOf(false) }
    var query by remember { mutableStateOf("") }
    Box(modifier) {
        FabricatorButton({ expanded = true }, Modifier.fillMaxWidth(), FabricatorVariant.Outline) { FabricatorText(options.firstOrNull { it.value == value }?.label ?: placeholder, Modifier.weight(1f), maxLines = 1); FabricatorIcon("chevrons-up-down") }
        FabricatorDropdownMenu(expanded, { expanded = false }) {
            FabricatorSearch(query, { query = it }, placeholder = placeholder)
            val filtered = options.filter { it.label.contains(query, ignoreCase = true) }
            if (filtered.isEmpty()) FabricatorText("No results found.", Modifier.padding(16.dp), muted = true)
            LazyColumn(Modifier.heightIn(max = 280.dp)) { items(filtered, key = { it.value }) { option -> FabricatorMenuItem(option.label, { onValueChange(option.value); expanded = false; query = "" }, selected = option.value == value, enabled = option.enabled) } }
        }
    }
}

@Composable
fun FabricatorMultiSelect(values: Set<String>, onValuesChange: (Set<String>) -> Unit, options: List<FabricatorOption>, modifier: Modifier = Modifier, placeholder: String = "Select options") {
    var expanded by remember { mutableStateOf(false) }
    var query by remember { mutableStateOf("") }
    Column(modifier) {
        FabricatorButton({ expanded = true }, Modifier.fillMaxWidth(), FabricatorVariant.Outline) { FabricatorText(if (values.isEmpty()) placeholder else "${values.size} selected", Modifier.weight(1f)); FabricatorIcon("chevrons-up-down") }
        FlowRow(horizontalArrangement = Arrangement.spacedBy(4.dp)) { options.filter { it.value in values }.forEach { option -> FabricatorButton({ onValuesChange(values - option.value) }, variant = FabricatorVariant.Secondary, size = FabricatorSize.ExtraSmall) { FabricatorText(option.label, size = 12); FabricatorIcon("x", size = 12.dp) } } }
        FabricatorDropdownMenu(expanded, { expanded = false }) {
            FabricatorSearch(query, { query = it })
            options.filter { it.label.contains(query, true) }.forEach { option -> FabricatorMenuItem(option.label, { onValuesChange(if (option.value in values) values - option.value else values + option.value) }, selected = option.value in values, enabled = option.enabled) }
        }
    }
}

@Composable
fun FabricatorNumberField(value: Double, onValueChange: (Double) -> Unit, modifier: Modifier = Modifier, minimum: Double = Double.NEGATIVE_INFINITY, maximum: Double = Double.POSITIVE_INFINITY, step: Double = 1.0) {
    var input by remember(value) { mutableStateOf(if (value % 1.0 == 0.0) value.toLong().toString() else value.toString()) }
    FabricatorInput(input, { next -> input = next; next.toDoubleOrNull()?.let { onValueChange(it.coerceIn(minimum, maximum)) } }, modifier, keyboardType = KeyboardType.Decimal,
        leading = { FabricatorButton("−", { onValueChange(stepNumber(value, -step, minimum, maximum)) }, enabled = value > minimum, variant = FabricatorVariant.Ghost, size = FabricatorSize.ExtraSmall) },
        trailing = { FabricatorButton("+", { onValueChange(stepNumber(value, step, minimum, maximum)) }, enabled = value < maximum, variant = FabricatorVariant.Ghost, size = FabricatorSize.ExtraSmall) })
}

@Composable
fun FabricatorInputOtp(value: String, onValueChange: (String) -> Unit, modifier: Modifier = Modifier, length: Int = 6, isInvalid: Boolean = false) {
    FabricatorInput(value, { onValueChange(it.filter(Char::isDigit).take(length)) }, modifier.semantics { contentDescription = "$length digit verification code" }, placeholder = "0".repeat(length), keyboardType = KeyboardType.NumberPassword, isInvalid = isInvalid)
}

@Composable
fun FabricatorCalendar(selected: CivilDate?, onSelect: (CivilDate) -> Unit, modifier: Modifier = Modifier, minimum: CivilDate? = null, maximum: CivilDate? = null, isDateEnabled: (CivilDate) -> Boolean = { true }, initialMonth: CivilDate = getFabricatorToday()) {
    var month by remember { mutableStateOf((selected ?: initialMonth).copy(day = 1)) }
    val theme = LocalFabricatorTheme.current
    val monthNames = listOf("January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December")
    Column(modifier.widthIn(max = 336.dp), verticalArrangement = Arrangement.spacedBy(theme.space(8))) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            FabricatorButton({ month = month.plusMonths(-1) }, Modifier.semantics { contentDescription = "Previous month" }, FabricatorVariant.Ghost, FabricatorSize.Icon) { FabricatorIcon("chevron-left") }
            FabricatorText("${monthNames[month.month - 1]} ${month.year}", Modifier.weight(1f), weight = FontWeight.Medium, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
            FabricatorButton({ month = month.plusMonths(1) }, Modifier.semantics { contentDescription = "Next month" }, FabricatorVariant.Ghost, FabricatorSize.Icon) { FabricatorIcon("chevron-right") }
        }
        Row { listOf("M", "T", "W", "T", "F", "S", "S").forEach { FabricatorText(it, Modifier.weight(1f), muted = true, size = 11, textAlign = androidx.compose.ui.text.style.TextAlign.Center) } }
        createCalendarGrid(month).chunked(7).forEach { week -> Row { week.forEach { date ->
            val enabled = (minimum == null || date >= minimum) && (maximum == null || date <= maximum) && isDateEnabled(date)
            FabricatorButton(date.day.toString(), { onSelect(date) }, Modifier.weight(1f).semantics { contentDescription = date.toString(); this.selected = date == selected }, if (date == selected) FabricatorVariant.Default else FabricatorVariant.Ghost, enabled, FabricatorSize.ExtraSmall)
        } } }
    }
}

@Composable
fun FabricatorDatePicker(value: CivilDate?, onValueChange: (CivilDate) -> Unit, modifier: Modifier = Modifier, placeholder: String = "Pick a date") {
    var expanded by remember { mutableStateOf(false) }
    Box(modifier) {
        FabricatorButton({ expanded = true }, Modifier.fillMaxWidth(), FabricatorVariant.Outline) { FabricatorIcon("calendar"); FabricatorText(value?.toString() ?: placeholder) }
        FabricatorPopover(expanded, { expanded = false }) { FabricatorCalendar(value, { onValueChange(it); expanded = false }, initialMonth = value ?: getFabricatorToday()) }
    }
}

@Composable
fun FabricatorTimeInput(value: Int, onValueChange: (Int) -> Unit, modifier: Modifier = Modifier, step: Int = 5) {
    var text by remember(value) { mutableStateOf(formatTime(value)) }
    Row(modifier, verticalAlignment = Alignment.CenterVertically) {
        FabricatorInput(text, { text = it.take(5); parseTime(it)?.let(onValueChange) }, Modifier.weight(1f), placeholder = "09:30", keyboardType = KeyboardType.Ascii, leading = { FabricatorIcon("clock") })
        FabricatorButton("−", { onValueChange(stepTime(value, -step)) }, Modifier.semantics { contentDescription = "Earlier by $step minutes" }, variant = FabricatorVariant.Ghost, size = FabricatorSize.ExtraSmall)
        FabricatorButton("+", { onValueChange(stepTime(value, step)) }, Modifier.semantics { contentDescription = "Later by $step minutes" }, variant = FabricatorVariant.Ghost, size = FabricatorSize.ExtraSmall)
    }
}

@Composable
fun FabricatorTimeWheel(value: Int, onValueChange: (Int) -> Unit, modifier: Modifier = Modifier, minuteStep: Int = 5) {
    Row(modifier.height(180.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        LazyColumn(Modifier.weight(1f)) { items((0..23).toList()) { hour -> FabricatorMenuItem(hour.toString().padStart(2, '0'), { onValueChange(hour * 60 + value % 60) }, selected = hour == value / 60) } }
        LazyColumn(Modifier.weight(1f)) { items((0..59 step minuteStep).toList()) { minute -> FabricatorMenuItem(minute.toString().padStart(2, '0'), { onValueChange(value / 60 * 60 + minute) }, selected = minute == value % 60) } }
    }
}

@Composable
fun FabricatorColorPicker(value: Color, onValueChange: (Color) -> Unit, modifier: Modifier = Modifier) {
    val theme = LocalFabricatorTheme.current
    Column(modifier, verticalArrangement = Arrangement.spacedBy(theme.space(8))) {
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) { listOf("primary", "info", "success", "warning", "destructive").forEach { role ->
            val color = theme.color(role)
            Box(Modifier.size(48.dp).clip(CircleShape).clickable { onValueChange(color) }.padding(8.dp).background(color, CircleShape).semantics { contentDescription = role; selected = color == value })
        } }
        listOf("Red", "Green", "Blue", "Alpha").forEachIndexed { index, title ->
            FabricatorLabel(title)
            val component = listOf(value.red, value.green, value.blue, value.alpha)[index]
            FabricatorSlider(component, { next -> onValueChange(when (index) { 0 -> value.copy(red = next); 1 -> value.copy(green = next); 2 -> value.copy(blue = next); else -> value.copy(alpha = next) }) }, label = title)
        }
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) { Box(Modifier.size(24.dp).background(value, RoundedCornerShape(4.dp))); FabricatorText("#" + listOf(value.red, value.green, value.blue).joinToString("") { (it * 255).toInt().toString(16).padStart(2, '0') }) }
    }
}

@Composable
fun FabricatorFileUpload(files: List<FabricatorFile>, onFilesChange: (List<FabricatorFile>) -> Unit, modifier: Modifier = Modifier, multiple: Boolean = true, mimeTypes: List<String> = listOf("*/*")) {
    val services = LocalFabricatorServices.current
    var error by remember { mutableStateOf<String?>(null) }
    Column(modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        FabricatorButton({ services.selectFiles(multiple, mimeTypes) { result -> when (result) {
            is FabricatorServiceResult.Success -> { onFilesChange(result.value); error = null }
            is FabricatorServiceResult.Failure -> error = result.message
            is FabricatorServiceResult.Unavailable -> error = result.reason
            FabricatorServiceResult.Cancelled -> Unit
        } } }, Modifier.fillMaxWidth(), FabricatorVariant.Outline) { FabricatorIcon("upload"); FabricatorText("Choose files") }
        files.forEach { file -> FabricatorItem(file.name, description = file.size?.let { "$it bytes" }, leading = { FabricatorIcon("file") }, trailing = { FabricatorButton({ onFilesChange(files - file) }, Modifier.semantics { contentDescription = "Remove ${file.name}" }, FabricatorVariant.Ghost, FabricatorSize.Icon) { FabricatorIcon("x") } }) }
        if (error != null) FabricatorText(error.orEmpty(), color = LocalFabricatorTheme.current.color("destructive-text"))
    }
}

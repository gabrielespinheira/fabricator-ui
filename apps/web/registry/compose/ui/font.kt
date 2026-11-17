package dev.fabricator.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import dev.fabricator.ui.resources.Res
import dev.fabricator.ui.resources.inter_variable
import dev.fabricator.ui.resources.inter_variable_italic
import org.jetbrains.compose.resources.Font

@Composable
fun rememberFabricatorFont(): FontFamily = FontFamily(
    Font(Res.font.inter_variable, FontWeight.Normal),
    Font(Res.font.inter_variable, FontWeight.Medium),
    Font(Res.font.inter_variable, FontWeight.SemiBold),
    Font(Res.font.inter_variable, FontWeight.Bold),
    Font(Res.font.inter_variable_italic, FontWeight.Normal, FontStyle.Italic),
)

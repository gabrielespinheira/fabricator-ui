package dev.fabricator.gallery.desktop

import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application
import androidx.compose.ui.window.rememberWindowState
import androidx.compose.ui.unit.dp
import dev.fabricator.gallery.FabricatorGallery

fun main() = application {
    Window(onCloseRequest = ::exitApplication, title = "Fabricator UI · Kotlin", state = rememberWindowState(width = 1180.dp, height = 820.dp)) {
        FabricatorGallery()
    }
}

package dev.fabricator.gallery.desktop

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.window.WindowDraggableArea
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.WindowPlacement
import androidx.compose.ui.window.application
import androidx.compose.ui.window.rememberWindowState
import dev.fabricator.gallery.FabricatorGallery
import java.awt.Dimension

fun main() = application {
    val isMac = System.getProperty("os.name").startsWith("Mac")
    val state = rememberWindowState(width = 1280.dp, height = 820.dp)
    Window(onCloseRequest = ::exitApplication, title = "Fabricator UI", state = state) {
        SideEffect {
            window.minimumSize = Dimension(900, 600)
            if (isMac) {
                window.rootPane.putClientProperty("apple.awt.fullWindowContent", true)
                window.rootPane.putClientProperty("apple.awt.transparentTitleBar", true)
                window.rootPane.putClientProperty("apple.awt.windowTitleVisible", false)
            }
        }
        val hasWindowControls = isMac && state.placement != WindowPlacement.Fullscreen
        Box(Modifier.fillMaxSize()) {
            FabricatorGallery(sidebarTopInset = if (hasWindowControls) 48.dp else 0.dp)
            if (hasWindowControls) {
                WindowDraggableArea(Modifier.fillMaxWidth().padding(start = 88.dp).height(8.dp))
            }
        }
    }
}

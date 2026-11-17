import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    kotlin("multiplatform") version "2.4.21"
    id("com.android.kotlin.multiplatform.library") version "9.3.1"
    id("org.jetbrains.compose") version "1.12.2"
    id("org.jetbrains.kotlin.plugin.compose") version "2.4.21"
}
kotlin {
    androidLibrary {
        namespace = "dev.fabricator.ui"
        compileSdk = 36
        minSdk = 26
        compilerOptions { jvmTarget.set(JvmTarget.JVM_17) }
        androidResources { enable = true }
    }
    jvm("desktop") { compilerOptions { jvmTarget.set(JvmTarget.JVM_17) } }
    sourceSets {
        commonMain.dependencies {
            api(compose.runtime); api(compose.foundation); api(compose.ui); api(compose.animation); implementation(compose.components.resources)
            if (file("src/commonMain/kotlin/dev/fabricator/ui/models/editor-document.kt").isFile) implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.13.0")
        }
        androidMain.dependencies { implementation("androidx.activity:activity-compose:1.13.0") }
        val desktopMain by getting {
            dependencies {
                implementation(compose.desktop.currentOs)
                val operatingSystem = System.getProperty("os.name").lowercase()
                val arm = System.getProperty("os.arch") in listOf("aarch64", "arm64")
                val classifier = when { operatingSystem.contains("mac") -> if (arm) "mac-aarch64" else "mac"; operatingSystem.contains("win") -> "win"; else -> if (arm) "linux-aarch64" else "linux" }
                if (file("src/desktopMain/kotlin/dev/fabricator/ui/desktop-media.kt").isFile) {
                    for (module in listOf("base", "graphics", "controls", "media", "swing")) implementation("org.openjfx:javafx-$module:21.0.13:$classifier")
                }
            }
        }
        commonTest.dependencies { implementation(kotlin("test")) }
    }
}
compose.resources {
    publicResClass = true
    packageOfResClass = "dev.fabricator.ui.resources"
    generateResClass = always
}

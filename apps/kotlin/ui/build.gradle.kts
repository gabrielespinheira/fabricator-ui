import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    kotlin("multiplatform")
    id("com.android.kotlin.multiplatform.library")
    id("org.jetbrains.compose")
    id("org.jetbrains.kotlin.plugin.compose")
}

kotlin {
    androidLibrary {
        namespace = "dev.fabricator.ui"
        compileSdk = 37
        minSdk = 26
        compilerOptions { jvmTarget.set(JvmTarget.JVM_17) }
        androidResources { enable = true }
    }
    jvm("desktop") { compilerOptions { jvmTarget.set(JvmTarget.JVM_17) } }
    sourceSets {
        commonMain {
            kotlin.srcDir(layout.buildDirectory.dir("generated/registry/commonMain/kotlin"))
            dependencies {
                api(compose.runtime)
                api(compose.foundation)
                api(compose.ui)
                api(compose.animation)
                implementation(compose.components.resources)
                implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.13.0")
            }
        }
        androidMain {
            kotlin.srcDir(layout.buildDirectory.dir("generated/registry/androidMain/kotlin"))
            dependencies { implementation("androidx.activity:activity-compose:1.13.0") }
        }
        val desktopMain by getting {
            kotlin.srcDir(layout.buildDirectory.dir("generated/registry/desktopMain/kotlin"))
            dependencies {
                implementation(compose.desktop.currentOs)
                val operatingSystem = System.getProperty("os.name").lowercase()
                val arm = System.getProperty("os.arch") in listOf("aarch64", "arm64")
                val classifier = when {
                    operatingSystem.contains("mac") -> if (arm) "mac-aarch64" else "mac"
                    operatingSystem.contains("win") -> "win"
                    else -> if (arm) "linux-aarch64" else "linux"
                }
                for (module in listOf("base", "graphics", "controls", "media", "swing")) implementation("org.openjfx:javafx-$module:21.0.13:$classifier")
            }
        }
        commonTest {
            kotlin.srcDir("../../web/registry/compose/tests")
            dependencies { implementation(kotlin("test")) }
        }
        val desktopTest by getting {
            dependencies {
                implementation(compose.desktop.uiTestJUnit4)
                implementation("junit:junit:4.13.2")
            }
        }
    }
}

val generateContract by tasks.registering(Exec::class) {
    workingDir(rootProject.projectDir)
    commandLine("bun", "run", "scripts/prepare-source.ts")
    inputs.file("../../web/generated/platforms/contract.json")
    inputs.dir("../../web/registry/compose")
    outputs.dir(layout.buildDirectory.dir("generated/registry"))
}
tasks.matching { it.name.startsWith("compile") }.configureEach { dependsOn(generateContract) }
tasks.matching { it.name.contains("Resource") }.configureEach { dependsOn(generateContract) }

compose.resources {
    publicResClass = true
    packageOfResClass = "dev.fabricator.ui.resources"
    generateResClass = always
}

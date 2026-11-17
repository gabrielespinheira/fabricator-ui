import org.jetbrains.compose.desktop.application.dsl.TargetFormat

plugins {
    kotlin("jvm")
    id("org.jetbrains.compose")
    id("org.jetbrains.kotlin.plugin.compose")
}
dependencies {
    implementation(project(":gallery"))
    implementation(compose.desktop.currentOs)
}
kotlin { jvmToolchain(17) }
compose.desktop {
    application {
        mainClass = "dev.fabricator.gallery.desktop.MainKt"
        nativeDistributions {
            targetFormats(TargetFormat.Dmg, TargetFormat.Msi, TargetFormat.Deb)
            packageName = "Fabricator UI"
            packageVersion = "0.1.0"
            modules("java.desktop", "java.net.http", "jdk.unsupported", "jdk.unsupported.desktop")
        }
    }
}

pluginManagement {
    repositories {
        google()
        gradlePluginPortal()
        mavenCentral()
    }
}
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "fabricator-kotlin"
include(":ui", ":gallery", ":androidApp", ":desktopApp")

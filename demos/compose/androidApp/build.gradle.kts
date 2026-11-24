plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}
android {
    namespace = "dev.fabricator.gallery.android"
    compileSdk = 37
    defaultConfig {
        applicationId = "dev.fabricator.gallery"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    buildFeatures { compose = true }
}
dependencies {
    implementation(project(":gallery"))
    implementation("androidx.activity:activity-compose:1.13.0")
}

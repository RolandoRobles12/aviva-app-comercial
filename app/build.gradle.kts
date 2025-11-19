import java.util.Properties
import java.io.FileInputStream

// ─── Carga de variables desde secrets.properties ───
val properties = Properties().apply {
    load(FileInputStream(File(rootDir, "secrets.properties")))
}

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.ksp)
    id("com.google.gms.google-services")
    id("com.google.android.libraries.mapsplatform.secrets-gradle-plugin")
}

android {
    namespace = "com.promotoresavivatunegocio_1"
    compileSdk = 34            // Compile SDK 34

    defaultConfig {
        applicationId = "com.promotoresavivatunegocio_1"
        minSdk = 24
        targetSdk = 34         // Target SDK 34
        versionCode = 3
        versionName = "1.3"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        // ▸ Placeholders para AndroidManifest.xml
        manifestPlaceholders.putAll(
            mapOf(
                "GOOGLE_API_KEY" to (properties["GOOGLE_API_KEY"] ?: "REEMPLAZAR_CON_TU_API_KEY"),
                "enableBackgroundLocationTracking" to true
            )
        )

        // ▸ Constantes accesibles desde BuildConfig
        buildConfigField("String", "GOOGLE_API_KEY", "\"${properties["GOOGLE_API_KEY"]}\"")
        buildConfigField("String", "DENUE_TOKEN", "\"${properties["DENUE_TOKEN"]}\"")
    }

    /* ─────────── FIRMA DE RELEASE ─────────── */
    signingConfigs {
        create("release") {
            // ➜ Ajusta la ruta y contraseñas a tu keystore
            storeFile = file("C:/keystores/aviva_keystore.jks")
            storePassword = "AvivaATN"
            keyAlias = "aviva_release"
            keyPassword = "AvivaATN"
        }
    }

    buildTypes {
        /* ---- RELEASE ---- */
        getByName("release") {
            isMinifyEnabled = false
            isShrinkResources = false
            isDebuggable = false
            signingConfig = signingConfigs.getByName("release")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }

        /* ---- DEBUG ---- */
        getByName("debug") {
            isMinifyEnabled = false
            isDebuggable = true
            versionNameSuffix = "-DEBUG"
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    kotlinOptions { jvmTarget = "11" }

    buildFeatures {
        viewBinding = true
        buildConfig = true
    }

    packagingOptions {
        resources { excludes += "/META-INF/{AL2.0,LGPL2.1}" }
    }
}

/* ─────────── DEPENDENCIAS ─────────── */
dependencies {
    // Core / UI
    implementation("androidx.core:core-ktx:1.12.0")
    implementation(libs.androidx.appcompat)
    implementation(libs.material)
    implementation(libs.androidx.constraintlayout)
    implementation(libs.androidx.lifecycle.livedata.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.ktx)
    implementation(libs.androidx.navigation.fragment.ktx)
    implementation(libs.androidx.navigation.ui.ktx)

    // Lifecycle / Startup
    implementation("androidx.lifecycle:lifecycle-service:2.8.2")
    implementation("androidx.lifecycle:lifecycle-process:2.8.2")
    implementation("androidx.startup:startup-runtime:1.1.1")

    // Google Play Services & Maps
    implementation("com.google.android.gms:play-services-auth:21.2.0")
    implementation("com.google.android.gms:play-services-location:21.3.0")
    implementation("com.google.android.gms:play-services-maps:19.0.0")
    implementation("com.google.android.gms:play-services-tasks:18.2.0")
    implementation("com.google.android.gms:play-services-base:18.5.0")

    // Firebase (BoM al inicio)
    implementation(platform("com.google.firebase:firebase-bom:33.1.2"))
    implementation("com.google.firebase:firebase-auth-ktx")
    implementation("com.google.firebase:firebase-firestore-ktx")
    implementation("com.google.firebase:firebase-analytics-ktx")
    implementation("com.google.firebase:firebase-storage-ktx")
    implementation("com.google.firebase:firebase-messaging-ktx")

    // Glide
    implementation("com.github.bumptech.glide:glide:4.16.0")
    annotationProcessor("com.github.bumptech.glide:compiler:4.16.0")

    // WorkManager
    implementation("androidx.work:work-runtime-ktx:2.9.0")
    implementation("androidx.work:work-gcm:2.9.0")
    implementation("androidx.concurrent:concurrent-futures-ktx:1.2.0")

    // Activity & Fragment
    implementation("androidx.activity:activity-ktx:1.9.0")
    implementation("androidx.fragment:fragment-ktx:1.7.1")

    // ViewPager2 & Tabs
    implementation("androidx.viewpager2:viewpager2:1.0.0")

    // GridLayout
    implementation("androidx.gridlayout:gridlayout:1.0.0")

    // Chrome Custom Tabs (para login OAuth en navegador integrado)
    implementation("androidx.browser:browser:1.8.0")

    // Kotlin Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.7.3")

    // Networking
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

    // JSON / Retrofit
    implementation("com.google.code.gson:gson:2.10.1")
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    implementation("com.squareup.retrofit2:adapter-rxjava3:2.9.0")

    // Room Database
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    ksp("androidx.room:room-compiler:2.6.1")

    // ML Kit (OCR)
    implementation("com.google.android.gms:play-services-mlkit-text-recognition:19.0.0")

    // Utils
    implementation("org.jetbrains.kotlinx:kotlinx-datetime:0.5.0")
    implementation("com.jakewharton.timber:timber:5.0.1")

    // Charts for Metrics
    implementation("com.github.PhilJay:MPAndroidChart:v3.1.0")

    // Testing
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    testImplementation("androidx.work:work-testing:2.9.0")
    androidTestImplementation("androidx.test:rules:1.5.0")
    testImplementation("androidx.room:room-testing:2.6.1")
    testImplementation("com.squareup.okhttp3:mockwebserver:4.12.0")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.7.3")
}

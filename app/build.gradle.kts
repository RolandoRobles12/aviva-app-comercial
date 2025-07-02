plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    id("com.google.gms.google-services")
    // Plugin secrets.properties
    id("com.google.android.libraries.mapsplatform.secrets-gradle-plugin")
}

android {
    namespace = "com.promotoresavivatunegocio_1"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.promotoresavivatunegocio_1"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        // Configuración para servicios en segundo plano
        manifestPlaceholders["enableBackgroundLocationTracking"] = true

        // ▸ Claves expuestas desde secrets.properties
        buildConfigField(
            "String",
            "GOOGLE_API_KEY",
            "\"${properties["GOOGLE_API_KEY"]}\""
        )
        buildConfigField(
            "String",
            "DENUE_TOKEN",
            "\"${properties["DENUE_TOKEN"]}\""
        )
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            isDebuggable = false
            isShrinkResources = false
        }

        debug {
            isMinifyEnabled = false
            isDebuggable = true
            versionNameSuffix = "-DEBUG"
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    kotlinOptions {
        jvmTarget = "11"
    }

    buildFeatures {
        viewBinding = true
        buildConfig = true
    }

    packagingOptions {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    // AndroidX Core Dependencies
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.material)
    implementation(libs.androidx.constraintlayout)
    implementation(libs.androidx.lifecycle.livedata.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.ktx)
    implementation(libs.androidx.navigation.fragment.ktx)
    implementation(libs.androidx.navigation.ui.ktx)

    // AndroidX adicionales para servicios en segundo plano
    implementation("androidx.lifecycle:lifecycle-service:2.8.2")
    implementation("androidx.startup:startup-runtime:1.1.1")

    // Google Play Services
    implementation("com.google.android.gms:play-services-auth:21.2.0")
    implementation("com.google.android.gms:play-services-location:21.3.0")
    implementation("com.google.android.gms:play-services-maps:19.0.0")
    implementation("com.google.android.gms:play-services-tasks:18.2.0")
    implementation("com.google.android.gms:play-services-base:18.5.0")

    // Firebase BOM
    implementation(platform("com.google.firebase:firebase-bom:33.1.2"))
    implementation("com.google.firebase:firebase-auth-ktx")
    implementation("com.google.firebase:firebase-firestore-ktx")
    implementation("com.google.firebase:firebase-analytics-ktx")
    implementation("com.google.firebase:firebase-storage-ktx")

    // Image loading
    implementation("com.github.bumptech.glide:glide:4.16.0")
    annotationProcessor("com.github.bumptech.glide:compiler:4.16.0")

    // WorkManager para tareas en background
    implementation("androidx.work:work-runtime-ktx:2.9.0")
    implementation("androidx.work:work-gcm:2.9.0")

    // Servicios persistentes
    implementation("androidx.concurrent:concurrent-futures-ktx:1.2.0")

    // Mejor manejo de permisos
    implementation("androidx.activity:activity-ktx:1.9.0")
    implementation("androidx.fragment:fragment-ktx:1.7.1")

    // Corrutinas y manejo asíncrono
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.7.3")

    // ===== NUEVAS DEPENDENCIAS PARA AVIVA TU NEGOCIO =====

    // Para HTTP requests al DENUE y APIs
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

    // Para JSON parsing (DENUE responses)
    implementation("com.google.code.gson:gson:2.10.1")

    // Para Retrofit (alternativa más robusta para APIs)
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    implementation("com.squareup.retrofit2:adapter-rxjava3:2.9.0")

    // Para Room Database (almacenar prospectos localmente)
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    annotationProcessor("androidx.room:room-compiler:2.6.1")
    // Para Kotlin usa kapt en lugar de annotationProcessor:
    // kapt("androidx.room:room-compiler:2.6.1")

    // Para manejo de imágenes y OCR (si decides implementarlo en Android)
    implementation("com.google.android.gms:play-services-mlkit-text-recognition:19.0.0")

    // Para notificaciones mejoradas
    implementation("androidx.core:core-ktx:1.12.0")

    // Para mejor manejo de fechas
    implementation("org.jetbrains.kotlinx:kotlinx-datetime:0.5.0")

    // Para logging mejorado
    implementation("com.jakewharton.timber:timber:5.0.1")

    // Para ViewModels con Hilt (inyección de dependencias) - OPCIONAL
    // implementation("com.google.dagger:hilt-android:2.48.1")
    // kapt("com.google.dagger:hilt-compiler:2.48.1")
    // implementation("androidx.hilt:hilt-work:1.1.0")
    // kapt("androidx.hilt:hilt-compiler:1.1.0")

    // Testing
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)

    // Testing para servicios en segundo plano
    testImplementation("androidx.work:work-testing:2.9.0")
    androidTestImplementation("androidx.test:rules:1.5.0")

    // Testing adicional para Room y APIs
    testImplementation("androidx.room:room-testing:2.6.1")
    testImplementation("com.squareup.okhttp3:mockwebserver:4.12.0")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.7.3")
}
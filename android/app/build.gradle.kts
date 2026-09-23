import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.chaquo.python")
}

val signingPropertiesFile = rootProject.file("keystore.properties")
val signingProperties = Properties()
if (signingPropertiesFile.exists()) {
    signingPropertiesFile.inputStream().use(signingProperties::load)
}
val signingStorePath = System.getenv("ANDROID_SIGNING_STORE_FILE") ?: signingProperties.getProperty("storeFile")
val signingStorePassword = System.getenv("ANDROID_SIGNING_STORE_PASSWORD") ?: signingProperties.getProperty("storePassword")
val signingKeyAlias = System.getenv("ANDROID_SIGNING_KEY_ALIAS") ?: signingProperties.getProperty("keyAlias")
val signingKeyPassword = System.getenv("ANDROID_SIGNING_KEY_PASSWORD") ?: signingProperties.getProperty("keyPassword")
val hasReleaseSigning = listOf(signingStorePath, signingStorePassword, signingKeyAlias, signingKeyPassword)
    .all { !it.isNullOrBlank() }

android {
    namespace = "com.spotistorage"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.spotistorage"
        minSdk = 33
        targetSdk = 36
        versionCode = 3
        versionName = "0.1.2"

        ndk {
            abiFilters += "arm64-v8a"
        }
    }

    signingConfigs {
        create("release") {
            if (hasReleaseSigning) {
                storeFile = file(signingStorePath!!)
                storePassword = signingStorePassword!!
                keyAlias = signingKeyAlias!!
                keyPassword = signingKeyPassword!!
            }
        }
    }

    buildTypes {
        debug {
            isDebuggable = true
        }
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            if (hasReleaseSigning) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    packaging {
        jniLibs {
            useLegacyPackaging = true
        }
    }

    buildFeatures {
        buildConfig = true
    }
}

chaquopy {
    defaultConfig {
        version = "3.13"

        buildPython(rootDir.resolve("../backend/.venv/Scripts/python.exe").absolutePath)

        pip {
            rootProject.file("../backend/android-requirements.txt").readLines()
                .map(String::trim)
                .filter { it.isNotEmpty() && !it.startsWith("#") }
                .forEach(::install)
        }
    }
    sourceSets {
        getByName("main") {
            srcDir("../../backend")
            srcDir("../../frontend/dist")
            include("app/**", "index.html", "assets/**", "favicon.svg")
        }
    }
}

val frontendDir = rootProject.file("../frontend")
val frontendDist = frontendDir.resolve("dist")
val npmCommand = if (System.getProperty("os.name").lowercase().contains("win")) "npm.cmd" else "npm"

tasks.register<Exec>("buildFrontend") {
    workingDir = rootProject.file("..")
    commandLine(npmCommand, "run", "build", "--prefix", "frontend")
    inputs.dir(frontendDir.resolve("src"))
    inputs.file(frontendDir.resolve("package.json"))
    inputs.file(frontendDir.resolve("tsconfig.json"))
    inputs.file(frontendDir.resolve("vite.config.ts"))
    outputs.dir(frontendDist)
}

tasks.named("preBuild").configure {
    dependsOn("buildFrontend")
}

tasks.matching { it.name.startsWith("merge") && it.name.endsWith("PythonSources") }.configureEach {
    dependsOn("buildFrontend")
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("androidx.lifecycle:lifecycle-service:2.8.6")
}

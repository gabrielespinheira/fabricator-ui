// The Android SDK and JDK the build needs, so the example runs from a shell that
// exports neither: Expo and Gradle read ANDROID_HOME and JAVA_HOME.
import path from "node:path"

function getDefaultSdk({ env, platform, home }) {
  if (platform === "darwin") return path.join(home, "Library/Android/sdk")
  if (platform === "win32") {
    const localData = env.LOCALAPPDATA ?? path.join(home, "AppData/Local")
    return path.join(localData, "Android/Sdk")
  }
  return path.join(home, "Android/Sdk")
}

/** `env` with the SDK and JDK filled in. Throws when there's no SDK. */
export function getAndroidEnvironment({
  env,
  platform,
  home,
  hasDirectory,
  findJdk,
}) {
  const sdk =
    env.ANDROID_HOME ??
    env.ANDROID_SDK_ROOT ??
    getDefaultSdk({ env, platform, home })
  if (!hasDirectory(sdk)) {
    throw new Error(
      `No Android SDK at ${sdk}. Install it with Android Studio, or set ANDROID_HOME.`
    )
  }
  const jdk = env.JAVA_HOME ?? findJdk()
  return { ...env, ANDROID_HOME: sdk, ...(jdk ? { JAVA_HOME: jdk } : {}) }
}

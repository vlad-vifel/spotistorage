#!/usr/bin/env bash

set -euo pipefail

package_name="com.spotistorage"
apk_path="android/app/build/outputs/apk/debug/app-debug.apk"

if ! command -v adb >/dev/null 2>&1; then
  echo "Ошибка: adb не найден в PATH."
  exit 1
fi

if ! adb get-state >/dev/null 2>&1; then
  echo "Ошибка: устройство не найдено. Подключи телефон по USB и включи USB-отладку."
  exit 1
fi

echo "==> Сборка frontend"
npm run build --prefix frontend

echo "==> Сборка Android APK"
(
  cd android
  ./gradlew.bat assembleDebug --no-daemon --console=plain
)

if [[ ! -f "$apk_path" ]]; then
  echo "Ошибка: APK не найден: $apk_path"
  exit 1
fi

echo "==> Попытка обновления приложения"
set +e
install_output=$(adb install -r "$apk_path" 2>&1)
install_status=$?
set -e
echo "$install_output"

if [[ "$install_status" -ne 0 ]]; then
  if grep -q "INSTALL_FAILED_UPDATE_INCOMPATIBLE\|signatures do not match" <<<"$install_output"; then
    echo "==> Подпись отличается, удаление старой версии"
    adb uninstall "$package_name"
    echo "==> Чистая установка APK"
    adb install "$apk_path"
  else
    echo "Ошибка установки APK."
    exit "$install_status"
  fi
fi

echo "Готово. Приложение установлено."

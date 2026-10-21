# MST Guider (SEAIT) — Flutter app

This is the native Flutter implementation of the SEAIT campus guide. It is a
standalone project; the existing React/Vite and Capacitor app at the repository
root remains unchanged.

## Open in Android Studio

1. Open Android Studio and choose **Open**.
2. Select this `flutter_app` folder (the folder containing `pubspec.yaml`).
3. Let Android Studio finish the Flutter/Dart dependency sync.
4. Select an Android device or emulator and run `lib/main.dart`.

The Flutter and Dart plugins must be installed in Android Studio. The Android
SDK command-line tools and accepted Android SDK licenses are also required to
build or run on Android.

## Run from a terminal

From this folder:

```powershell
flutter pub get
flutter run
```

Build a release APK:

```powershell
flutter build apk --release
```

The APK is written to
`build/app/outputs/flutter-apk/app-release.apk`.

## Included features

- Offline campus aerial map with campus destinations, map zoom, and route lines.
- Search for campus places and the 79 rooms in the four-floor MST Building.
- Interactive floor selectors, room map markers, and indoor route steps.
- Offline campus panorama images with zoom and pan.
- Optional live GPS marker; Android requests location permission when needed.

Campus map, route, room, and image data are bundled locally. The live position
uses the Android device's location service and is not required to browse maps
or directions.

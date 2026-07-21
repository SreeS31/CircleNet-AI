# CircleNet-AI Flutter App

This is the Milestone 6 mobile foundation for CircleNet-AI.

## Included in this baseline

- Flutter app scaffold with Material 3 theme
- Auth flow screen (Sign In / Sign Up)
- API client integration for backend auth health and user registration contracts
- Standard project metadata and lint settings
- Starter widget test

## Prerequisites

- Flutter SDK 3.24+
- Dart SDK matching Flutter release

For this workspace, SDK is installed at:

- C:/Users/vighn/.puro/envs/stable/flutter

## Local run

1. Install dependencies:
   - flutter pub get
2. Run app:
   - flutter run

## Current backend contracts used

- GET /api/auth/health
   - Expected response: auth-service-ready
- POST /api/users
   - Request fields: username, email, password
   - Used for Sign Up flow in current milestone

Sign In UI is implemented and wired, while final login endpoint integration will be completed when backend introduces token-based auth routes.

## Test

- flutter test

Windows command example:

- C:/Users/vighn/.puro/envs/stable/flutter/bin/flutter.bat test test

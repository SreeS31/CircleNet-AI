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
- POST /api/auth/login
   - Request fields: email, password
   - Response fields: tokenType, accessToken, refreshToken, expiresIn
- POST /api/auth/refresh
   - Request fields: refreshToken
   - Response fields: tokenType, accessToken, refreshToken, expiresIn
- POST /api/auth/logout
   - Request fields: refreshToken
   - Revokes current refresh token
- POST /api/auth/revoke
   - Request fields: refreshToken
   - Explicit refresh token revocation endpoint
- POST /api/users
   - Request fields: username, email, password
   - Used for Sign Up flow in current milestone

- GET /api/dashboard/summary
   - Requires Authorization bearer access token
   - Called after successful Sign In and session restore

Sign In is now wired to real backend token endpoints with local session persistence and refresh on app start.

## Test

- flutter test

Windows command example:

- C:/Users/vighn/.puro/envs/stable/flutter/bin/flutter.bat test test

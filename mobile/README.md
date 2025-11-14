# Capacitor wrapper (URL-mode)

This wrapper opens the production URL inside a native WebView so you can publish to stores quickly. Later you can bundle static assets.

Setup:
1. Install deps:
   npm i -D @capacitor/cli
   npm i @capacitor/core @capacitor/android @capacitor/ios
2. Set env:
   export NEXT_PUBLIC_APP_URL=\"https://your-domain.example.com\"
3. Add platforms:
   npx cap add android
   npx cap add ios
4. Open platforms:
   npx cap open android
   npx cap open ios

Plugins:
- @capacitor/app, @capacitor/splash-screen (optional)
- For printing/camera, add community plugins as needed.

URL-mode now. To bundle assets later:
- next build && next export (static parts)
- set server: { url: undefined }, webDir to your export dir and enable bundledWebRuntime



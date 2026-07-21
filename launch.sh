#!/bin/bash
# ============================================================
# 🚀 More Simple Tax — EAS Launch Script
# Run this from the moresimple-tax/ directory
# ============================================================

set -e  # Exit on any error

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
RESET='\033[0m'

print_step() {
  echo ""
  echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo -e "${CYAN}${BOLD}  STEP $1: $2${RESET}"
  echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
}

print_ok()   { echo -e "  ${GREEN}✅  $1${RESET}"; }
print_warn() { echo -e "  ${YELLOW}⚠️   $1${RESET}"; }
print_err()  { echo -e "  ${RED}❌  $1${RESET}"; }
print_info() { echo -e "  ${BOLD}→  $1${RESET}"; }

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║   🏆  More Simple Tax — Launch Sequence  ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  Backend:   ${GREEN}https://bossyboo-5e1a.onrender.com${RESET}"
echo -e "  Bundle ID: ${GREEN}com.moresimpletax.app${RESET}"
echo -e "  Version:   ${GREEN}1.0.0${RESET}"

# ────────────────────────────────────────────────
print_step 1 "Checking prerequisites"
# ────────────────────────────────────────────────

# Check Node.js
if command -v node &>/dev/null; then
  NODE_VER=$(node --version)
  print_ok "Node.js $NODE_VER"
else
  print_err "Node.js not found. Install from https://nodejs.org"
  exit 1
fi

# Check npm
if command -v npm &>/dev/null; then
  print_ok "npm $(npm --version)"
else
  print_err "npm not found."
  exit 1
fi

# Check EAS CLI
if command -v eas &>/dev/null; then
  print_ok "EAS CLI $(eas --version 2>/dev/null | head -1)"
else
  print_warn "EAS CLI not found — installing now..."
  npm install -g eas-cli
  print_ok "EAS CLI installed"
fi

# Check Expo CLI
if command -v expo &>/dev/null; then
  print_ok "Expo CLI found"
else
  print_warn "Expo CLI not found — installing..."
  npm install -g expo-cli
fi

# ────────────────────────────────────────────────
print_step 2 "EAS Login"
# ────────────────────────────────────────────────

print_info "You'll need your Expo account credentials."
print_info "Don't have one? Create at: https://expo.dev/signup"
echo ""

eas whoami &>/dev/null && {
  EXPO_USER=$(eas whoami 2>/dev/null)
  print_ok "Already logged in as: $EXPO_USER"
} || {
  eas login
  print_ok "Logged in successfully"
}

# ────────────────────────────────────────────────
print_step 3 "EAS Project Init"
# ────────────────────────────────────────────────

# Check if projectId is already set
CURRENT_ID=$(node -e "const a=require('./app.json'); console.log(a.expo.extra.eas.projectId)" 2>/dev/null)

if [ "$CURRENT_ID" = "YOUR_EAS_PROJECT_ID" ] || [ -z "$CURRENT_ID" ]; then
  print_warn "No EAS project ID found. Running 'eas init'..."
  echo ""
  eas init --id "$(eas project:init 2>/dev/null | grep 'projectId' | awk '{print $2}')" 2>/dev/null || eas init
  
  # Grab the new project ID
  NEW_ID=$(node -e "const a=require('./app.json'); console.log(a.expo.extra.eas.projectId)" 2>/dev/null)
  
  if [ "$NEW_ID" != "YOUR_EAS_PROJECT_ID" ] && [ -n "$NEW_ID" ]; then
    print_ok "Project registered! ID: $NEW_ID"
    # Also update the updates.url in app.json
    node -e "
      const fs = require('fs');
      const app = require('./app.json');
      app.expo.updates = { url: 'https://u.expo.dev/$NEW_ID' };
      fs.writeFileSync('./app.json', JSON.stringify(app, null, 2));
    "
    print_ok "app.json updated with real project ID"
  else
    print_warn "Could not auto-read project ID from app.json."
    print_info "Copy the project ID shown above and paste it into app.json:"
    print_info '  "extra": { "eas": { "projectId": "PASTE_YOUR_ID_HERE" } }'
    echo ""
    read -p "  Press Enter once you've updated app.json to continue..."
  fi
else
  print_ok "Project ID already set: $CURRENT_ID"
fi

# ────────────────────────────────────────────────
print_step 4 "Install dependencies"
# ────────────────────────────────────────────────

if [ -d "node_modules" ]; then
  print_ok "node_modules found — skipping install"
  print_info "Run 'npm install' if you've added new packages"
else
  print_info "Installing npm dependencies..."
  npm install
  print_ok "Dependencies installed"
fi

# ────────────────────────────────────────────────
print_step 5 "Asset verification"
# ────────────────────────────────────────────────

check_asset() {
  local file=$1
  local desc=$2
  if [ -f "$file" ]; then
    SIZE=$(du -h "$file" | cut -f1)
    print_ok "$desc ($SIZE) — $file"
  else
    print_err "$desc MISSING — $file"
    echo "         Required before App Store submission!"
  fi
}

check_asset "assets/icon.png"          "App icon (1024x1024 PNG, no alpha)"
check_asset "assets/splash.png"        "Splash screen"
check_asset "assets/adaptive-icon.png" "Android adaptive icon"

# ────────────────────────────────────────────────
print_step 6 "Backend health check"
# ────────────────────────────────────────────────

print_info "Checking production backend..."
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://bossyboo-5e1a.onrender.com/ 2>/dev/null)
if [ "$HEALTH" = "200" ]; then
  print_ok "Backend live at https://bossyboo-5e1a.onrender.com"
else
  print_warn "Backend returned HTTP $HEALTH — may be sleeping (Render free tier spins down)"
  print_info "Visit https://bossyboo-5e1a.onrender.com to wake it up, then re-run this script"
fi

# ────────────────────────────────────────────────
print_step 7 "iOS Build (TestFlight)"
# ────────────────────────────────────────────────

echo ""
echo -e "  ${BOLD}Build options:${RESET}"
echo "  [1] production  — Full App Store / TestFlight build (default)"
echo "  [2] preview     — Internal testing build (.ipa, not for App Store)"
echo "  [3] skip        — Skip build, go to submit only"
echo ""
read -p "  Choose [1/2/3] (default: 1): " BUILD_CHOICE
BUILD_CHOICE=${BUILD_CHOICE:-1}

case $BUILD_CHOICE in
  1)
    print_info "Starting production iOS build — this takes 10–20 minutes..."
    print_info "You'll be asked to set up iOS credentials if this is your first build."
    echo ""
    eas build --platform ios --profile production
    print_ok "iOS build complete!"
    ;;
  2)
    print_info "Starting preview iOS build..."
    eas build --platform ios --profile preview
    print_ok "Preview build complete!"
    ;;
  3)
    print_warn "Skipping build step"
    ;;
  *)
    print_warn "Invalid choice — skipping build"
    ;;
esac

# ────────────────────────────────────────────────
print_step 8 "Submit to App Store (optional)"
# ────────────────────────────────────────────────

echo ""
read -p "  Submit to App Store Connect now? (y/n): " DO_SUBMIT

if [ "$DO_SUBMIT" = "y" ] || [ "$DO_SUBMIT" = "Y" ]; then
  # Check eas.json has real Apple credentials
  APPLE_ID=$(node -e "const e=require('./eas.json'); console.log(e.submit.production.ios.appleId)" 2>/dev/null)
  if [ "$APPLE_ID" = "YOUR_APPLE_ID" ] || [ -z "$APPLE_ID" ]; then
    print_warn "Apple credentials not set in eas.json"
    print_info "Update eas.json submit.production.ios with:"
    print_info "  appleId:    your Apple ID email"
    print_info "  ascAppId:   App Store Connect app numeric ID"
    print_info "  appleTeamId: your 10-character Apple Team ID"
    echo ""
    read -p "  Press Enter once eas.json is updated to continue..."
  fi

  print_info "Submitting to App Store Connect..."
  eas submit --platform ios --profile production --latest
  print_ok "Submitted! Check App Store Connect for TestFlight build."
else
  print_info "Skipping submit. Run later with:"
  echo ""
  echo "    eas submit --platform ios --profile production --latest"
fi

# ────────────────────────────────────────────────
print_step 9 "Android Build (optional)"
# ────────────────────────────────────────────────

echo ""
read -p "  Also build for Android? (y/n): " DO_ANDROID

if [ "$DO_ANDROID" = "y" ] || [ "$DO_ANDROID" = "Y" ]; then
  print_info "Starting Android production build (AAB for Play Store)..."
  eas build --platform android --profile production
  print_ok "Android build complete!"

  read -p "  Submit to Google Play? (y/n): " DO_ANDROID_SUBMIT
  if [ "$DO_ANDROID_SUBMIT" = "y" ]; then
    eas submit --platform android --profile production --latest
    print_ok "Submitted to Google Play internal track!"
  fi
else
  print_info "Skipping Android. Run later with:"
  echo "    eas build --platform android --profile production"
fi

# ────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════╗${RESET}"
echo -e "${GREEN}${BOLD}║   🎉  Launch sequence complete!              ║${RESET}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  ${BOLD}Next steps:${RESET}"
echo "  1. Check App Store Connect → TestFlight for your build"
echo "  2. Add internal testers in TestFlight"
echo "  3. Fill in App Store listing (use APP_STORE_LISTING.md)"
echo "  4. Submit for Apple review when ready"
echo ""
echo -e "  ${BOLD}Reviewer credentials (from APP_STORE_LISTING.md):${RESET}"
echo "  Email:    reviewer@moresimpletax.com"
echo "  Password: AppReview2026!"
echo "  Tier:     Premium (pre-activated)"
echo ""
echo -e "  ${BOLD}Docs:${RESET} https://github.com/teaw153-stack/Willis-Dynasty-Trust-8"
echo ""

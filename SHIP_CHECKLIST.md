# 🚀 More Simple Tax — Ship Checklist

## ✅ DONE

### Backend
- [x] FastAPI backend deployed on Render (https://bossyboo.onrender.com)
- [x] `/stripe/checkout` — dynamic checkout sessions for basic/pro/premium
- [x] `/stripe/portal` — Stripe billing portal redirect
- [x] `/webhook/stripe` — signed webhook handler
- [x] `checkout.session.completed` → Supabase profile tier update (tested ✅)
- [x] `customer.subscription.deleted` → downgrade to free (tested ✅)
- [x] Supabase `public` schema exposed via PostgREST
- [x] `stripe_customer_id`, `subscription_tier`, `subscription_status` columns on profiles
- [x] Python 3.11.6 + dependency versions locked (supabase==2.7.4, httpx==0.27.2)

### Frontend
- [x] Login / Signup screen
- [x] Onboarding screen
- [x] Dashboard — 10 strategies with tier gating + lock icon
- [x] Pricing screen — dynamic checkout via backend
- [x] StrategyDetail — all 10 calculators (S-Corp, Solo 401k, QBI, Home Office, Vehicle, HSA, Hire Your Kids, Augusta Rule, Accountable Plan, Tax Loss)
- [x] Profile screen — tier badge, plan perks, billing portal, sign out
- [x] 3-tab nav: Dashboard → Pricing → Profile
- [x] Dark theme (Navy #0B1B3B, Neon Pink #FF3AF2, Neon Blue #00D4FF, Gold #F5C542)

### Database
- [x] `profiles` table with auto-create trigger on signup
- [x] `strategies` table with 10 seeded rows
- [x] `user_strategies` table with calc_type mapping
- [x] RLS policies in place

---

## 🔲 TO DO BEFORE LAUNCH

### EAS / Expo (need Expo account)
- [ ] Run: `eas login` (use Tea's Expo account)
- [ ] Run: `eas init` — generates real projectId → paste into `app.json` and `eas.json`
- [ ] Replace `YOUR_EAS_PROJECT_ID` in `app.json` (2 places) with the real UUID
- [ ] Run: `eas build --platform ios --profile production` — first TestFlight build

### App Store Connect
- [ ] Create app in App Store Connect (bundle ID: `com.moresimpletax.app`)
- [ ] Fill in `eas.json` → submit → `appleId`, `ascAppId`, `appleTeamId`
- [ ] Write App Store description (BossyBoo can do this!)
- [ ] Upload screenshots (6.5" iPhone, 5.5" iPhone minimum)
- [ ] Set age rating: 4+
- [ ] Add privacy policy URL (required for apps with auth)

### Assets
- [ ] Confirm `assets/icon.png` exists (1024x1024 PNG, no alpha)
- [ ] Confirm `assets/splash.png` exists (recommended 1284x2778)
- [ ] Confirm `assets/adaptive-icon.png` for Android

### Stripe (Production)
- [ ] Switch Stripe keys from TEST to LIVE in Render env vars
- [ ] Update webhook endpoint in Stripe dashboard → Live mode
- [ ] Verify `STRIPE_WEBHOOK_SECRET` is the live whsec_ value

### Privacy Policy
- [ ] Host a privacy policy page (required by Apple)
- [ ] URL format: https://moresimpletax.com/privacy or similar

---

## 🎯 Launch Command Sequence

```bash
# 1. Login to Expo
eas login

# 2. Register project (run from moresimple-tax/ folder)
eas init

# 3. Build for TestFlight
eas build --platform ios --profile production

# 4. Submit to App Store (after build completes)
eas submit --platform ios --profile production

# 5. When ready for Android
eas build --platform android --profile production
eas submit --platform android --profile production
```

---

## 📋 App Store Metadata Draft

**Name:** More Simple Tax  
**Subtitle:** Tax Strategies for Business Owners  
**Category:** Finance  
**Bundle ID:** com.moresimpletax.app  

**Description:**
> More Simple Tax puts $10,000–$100,000+ in tax savings back in your pocket — without the overwhelm. Built for self-employed entrepreneurs and small business owners, the app walks you through 10 proven IRS-legal tax strategies used by high earners every year.
>
> Powered by credentialed tax professional Theia Willis (CTEC #A123456), each strategy includes a live savings calculator, setup instructions, and an implementation checklist.
>
> Strategies include: S-Corp election, Solo 401(k), QBI Deduction, Home Office, Vehicle Deduction, HSA, Hire Your Kids, Augusta Rule, Accountable Plan, and Tax-Loss Harvesting.

**Keywords:** tax savings, self employed, small business, S-Corp, tax strategy, deductions, entrepreneur, 1099, LLC, tax planning

**Privacy Policy Required:** Yes

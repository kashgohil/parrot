# Onboarding Flow Design

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        FIRST LAUNCH                              │
│                     (no setup_mode set)                          │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  /mode-selection                                                │
│  ┌─────────────────────┐    ┌─────────────────────┐             │
│  │   🖥️ LOCAL MODE     │    │   ☁️ CLOUD MODE     │             │
│  │   Free Forever      │    │   From $5/mo        │             │
│  │                     │    │                     │             │
│  │   • Works offline   │    │   • Sync devices    │             │
│  │   • Maximum privacy │    │   • Higher accuracy │             │
│  │   • No subscription │    │   • Cloud backup    │             │
│  └─────────────────────┘    └─────────────────────┘             │
│           │                            │                        │
└───────────┼────────────────────────────┼────────────────────────┘
            │                            │
            ▼                            ▼
┌─────────────────────┐      ┌─────────────────────────────────┐
│  LOCAL PATH         │      │  CLOUD PATH                     │
│  (no auth required) │      │  (requires login + subscription)│
├─────────────────────┤      ├─────────────────────────────────┤
│                     │      │                                 │
│  /local-profile     │      │  /setup-mode                    │
│  (create profile)   │      │  (choose pricing tier)          │
│         │           │      │         │                       │
│         ▼           │      │         ▼                       │
│  /local-setup       │      │  ┌─────────────┐                │
│  (API keys)         │      │  │ BYOK ($5)   │───/login────┐  │
│         │           │      │  │ Managed     │   or        │  │
│         ▼           │      │  │ ($15)       │──/signup────┤  │
│  /tour              │      │  └─────────────┘             │  │
│  (quick tour)       │      │                              │  │
│         │           │      │                              ▼  │
│         ▼           │      │  ┌─────────────────────────┐    │
│  / (main app)       │      │  │ Checkout flow (Polar)   │    │
│                     │      │  └─────────────────────────┘    │
└─────────────────────┘      │              │                  │
                             │              ▼                  │
                             │  /cloud-setup                   │
                             │  (configure API keys)           │
                             │           │                     │
                             │           ▼                     │
                             │  /tour                          │
                             │  (quick tour)                   │
                             │           │                     │
                             │           ▼                     │
                             │  / (main app)                   │
                             │                                 │
                             └─────────────────────────────────┘
```

## Key Design Decisions

### 1. Mode Selection First
- Users immediately understand the fundamental choice: privacy vs convenience
- No forced login for local users
- Clear pricing transparency for cloud users

### 2. Local Mode Benefits
- **Zero friction**: No account creation, immediate use
- **Privacy-first**: Appeals to security-conscious users
- **Try before buy**: Users can test the app before committing to cloud

### 3. Cloud Mode Flow
- **Pricing before signup**: Users see costs before creating account (reduces abandonment)
- **Tier selection**: Choose between BYOK (Bring Your Own Key) or Managed
- **Authentication**: Login/signup happens after tier selection
- **Checkout**: Polar.sh integration for subscription management

### 4. Routing Structure

```
/mode-selection           → Entry point, choose mode
/local-profile            → Create local user profile
/local-setup              → Configure API keys (OpenAI, etc.)
/setup-mode               → Choose cloud pricing tier
/cloud-setup              → Configure cloud API keys
/tour                     → Quick app tour (both modes)
/login, /signup           → Authentication (cloud only)
```

## Recommended Improvements

### 1. Add Progress Persistence
Store partial onboarding state so users can resume if they quit mid-flow:
- `setup_mode`: "local" | "cloud" | null
- `onboarding_step`: string (current route)
- `onboarding_data`: JSON (partial form data)

### 2. Add "Skip for Now" Options
- Allow users to skip API key setup and use defaults
- Add "Remind me later" for tour

### 3. Better Error Handling
- Show clear error states if API keys are invalid
- Offer "Test Connection" button on setup pages
- Provide helpful links to get API keys

### 4. Post-Onboarding Upsell
For local users, add subtle upgrade prompts:
- Settings banner: "Want to sync across devices? Upgrade to Cloud"
- History page: "Cloud users get unlimited history sync"

## File Structure

```
app/
├── routes/
│   ├── mode-selection.tsx      # Mode selection (entry point)
│   ├── _onboarding.tsx         # Onboarding layout wrapper
│   ├── _onboarding/
│   │   ├── local-profile.tsx   # Local user creation
│   │   ├── local-setup.tsx     # API key configuration
│   │   ├── setup-mode.tsx      # Cloud pricing tiers
│   │   ├── cloud-setup.tsx     # Cloud API configuration
│   │   └── tour.tsx            # App tour
│   └── _auth/
│       ├── login.tsx           # Cloud login
│       └── signup.tsx          # Cloud signup
```

## State Management

The `setup_mode` setting determines available routes:
- `null` → Can only access `/mode-selection`
- `"local"` → Can access local routes, redirected from auth routes
- `"cloud"` → Requires auth, redirected to login if not authenticated

This is enforced in:
- `/_onboarding.tsx`: Checks `setup_mode` and auth status
- `/__root.tsx`: Redirects based on onboarding completion

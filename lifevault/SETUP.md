# LifeVault — Setup Guide

## Prerequisites
- Node.js 18+
- A Supabase account (free tier works)

## 1. Clone & Install

```bash
cd lifevault
npm install
```

## 2. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be provisioned

## 3. Set up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Open `supabase/migrations/001_initial_schema.sql`
3. Copy the entire contents and paste into the SQL Editor
4. Run the query

## 4. Create Storage Bucket

1. In your Supabase dashboard, go to **Storage**
2. Click **New bucket**
3. Name it `documents`
4. Keep it **private** (do NOT enable public access)
5. Click Create

The SQL migration already sets up storage RLS policies, so files are protected by default.

## 5. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Find these in: **Supabase Dashboard → Project Settings → API**

## 6. Configure Auth (Optional)

In Supabase Dashboard → Authentication → URL Configuration:
- Set **Site URL** to your app URL (e.g., `http://localhost:5173` for dev)
- Add redirect URLs if needed

## 7. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## 8. Build for Production

```bash
npm run build
```

## Architecture

```
src/
├── components/
│   ├── ui/            # Base UI components (Button, Input, etc.)
│   ├── layout/        # AppLayout, BottomNav
│   ├── documents/     # VerificationBadge, CategoryIcon, ActivityLogPanel
│   ├── sharing/       # ShareDialog
│   ├── reminders/     # ReminderDialog
│   └── corrections/   # CorrectionDialog
├── context/
│   └── AuthContext    # Auth state & methods
├── hooks/
│   ├── useDocuments   # Document CRUD + signed URLs
│   └── useProfiles    # Profile CRUD
├── pages/
│   ├── DashboardPage  # Home with stats & widgets
│   ├── DocumentsPage  # Document listing with filters
│   ├── DocumentDetailPage  # Full document view + actions
│   ├── UploadPage     # Multi-step upload with OCR
│   ├── SearchPage     # Global search with filters
│   ├── ProfilesPage   # Manage people/pets/vehicles/property
│   ├── RemindersPage  # View & manage reminders
│   └── SettingsPage   # Account, security, data export
├── services/
│   ├── aiService      # Rule-based classification & metadata extraction
│   ├── ocrService     # Tesseract.js OCR
│   └── activityService # Activity log helper
├── lib/
│   ├── supabase       # Supabase client
│   └── utils          # Date formatting, file size, etc.
└── types/
    └── database       # Full TypeScript type definitions
```

## Features

| Feature | Status |
|---------|--------|
| Auth (signup, login, forgot password) | ✅ |
| Dashboard with stats | ✅ |
| Document upload (PDF, image, camera) | ✅ |
| OCR text extraction (Tesseract.js) | ✅ |
| Smart auto-classification | ✅ |
| Document detail page | ✅ |
| Verification badges | ✅ |
| Expiry detection | ✅ |
| Profiles (family, pet, vehicle, property) | ✅ |
| Global search with filters | ✅ |
| Secure sharing (signed URLs, WhatsApp, email) | ✅ |
| Password protection / expiry-based share | ✅ |
| Share logs & revocation | ✅ |
| Reminders (expiry, renewal, etc.) | ✅ |
| Correction workflows with step-by-step guides | ✅ |
| Activity logs | ✅ |
| Settings (profile, export data, sign out) | ✅ |
| Row Level Security (all tables) | ✅ |
| Private storage bucket | ✅ |
| Mobile-first responsive design | ✅ |
| AI layer (rule-based, pluggable) | ✅ |

## Security

- All documents stored in private Supabase Storage bucket
- RLS enforced on all database tables
- Files served via signed URLs (time-limited)
- No public bucket access
- No sensitive data logged to console
- OCR processing is 100% client-side (Tesseract.js)

## Future Enhancements

- [ ] Real AI classification via Claude API
- [ ] PDF multi-page preview
- [ ] Biometric app lock
- [ ] Push notifications for reminders
- [ ] Document version history
- [ ] Bulk upload
- [ ] Offline-first with IndexedDB

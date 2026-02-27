# Phase 3.2: Forge Inbox - Complete Implementation

## Overview

The Forge Inbox is now fully implemented! Each student gets a unique email address (e.g., `abc12345@inbound.postmarkapp.com`) where parents and teachers can forward study materials. Attachments are automatically processed using Gemini AI and added to the student's learning materials.

## What Was Built

### 1. Database Layer ✅
- **Migration**: `supabase_forge_inbox_migration.sql`
  - Added `inbox_email` column to `student_profiles` (unique, auto-generated)
  - Created `generate_inbox_email()` function for unique ID generation
  - Created trigger to auto-assign inbox emails on profile creation
  - Backfilled existing profiles with inbox emails
  - Updated `learning_sources` to support 'email' source type
  - Created `inbox_logs` table for tracking email processing
  - Added RLS policies for security

### 2. Webhook Handler ✅
- **API Route**: `src/app/api/inbox/email/route.ts`
  - Receives Postmark inbound emails (JSON format)
  - Extracts student profile from inbox email address
  - Uploads attachments to Supabase Storage (`inbox` bucket)
  - Uses Gemini 1.5 Flash to analyze documents:
    - Identifies subject (Math, Science, English, etc.)
    - Extracts 3-5 key concepts
    - Extracts important text (formulas, definitions)
  - Auto-creates `study_topics` based on identified subject
  - Creates `learning_sources` and `learning_source_items`
  - Logs all processing to `inbox_logs` for auditing
  - Comprehensive error handling and logging

### 3. UI Components ✅
- **ForgeInboxBanner**: `src/components/inbox/ForgeInboxBanner.tsx`
  - Displays student's unique inbox email
  - Copy-to-clipboard button with visual feedback
  - Instructions for parents/teachers
  - Beautiful gradient design with icons
  - Only shows when a student profile is selected

- **Sources Page Integration**: `src/app/(app)/sources/page.tsx`
  - Added ForgeInboxBanner at the top of the page
  - Fetches active profile's inbox email
  - Updates when profile changes

### 4. Type Definitions ✅
- **StudentProfile Interface**: `src/app/actions/student-profiles.ts`
  - Added `inbox_email?: string | null` field
  - Updated `getStudentProfiles()` to fetch inbox_email

## How It Works

### Email Flow

```
1. Parent/Teacher sends email
   ↓
2. Postmark receives at abc12345@inbound.postmarkapp.com
   ↓
3. Postmark sends webhook to /api/inbox/email
   ↓
4. Webhook handler:
   - Looks up student profile by inbox email
   - Creates inbox log (status: 'processing')
   - For each attachment:
     • Uploads to Supabase Storage (inbox bucket)
     • Analyzes with Gemini 1.5 Flash
     • Creates or finds matching study_topic
     • Creates learning_source and learning_source_item
   - Updates inbox log (status: 'completed' or 'failed')
   ↓
5. New materials appear in Sources page
   ↓
6. New topic appears in Galaxy (if new topic created)
```

### AI Analysis

Gemini 1.5 Flash analyzes each attachment to extract:

- **Subject**: Main academic subject (Math, Science, English, etc.)
- **Concepts**: 3-5 key topics covered in the document
- **Text**: Important formulas, definitions, or questions

**Supported file types**:
- Images: JPEG, PNG, GIF, WebP
- Documents: PDF

**Fallback**: If AI analysis fails, extracts subject from filename.

## Setup Instructions

### 1. Install Dependencies ✅
```bash
npm install @google/generative-ai
```

### 2. Run Database Migration ✅
In Supabase SQL Editor, run:
```sql
-- Copy and paste supabase_forge_inbox_migration.sql
```

### 3. Create Supabase Storage Bucket
1. Go to Supabase Dashboard → Storage
2. Create new bucket: `inbox`
3. Set to **private** (recommended)
4. Add RLS policy:
```sql
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload to inbox"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'inbox' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to read their own files
CREATE POLICY "Users can read their own inbox files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'inbox' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### 4. Set Up Postmark Inbound

**A. Sign up for Postmark**
- Go to https://postmarkapp.com
- Create free account (100 inbound emails/month free)

**B. Create Inbound Stream**
- In Postmark dashboard → Servers → Your server
- Click "Inbound" tab
- Click "Add Inbound Stream"
- Name: "ForgeStudy Inbox"

**C. Configure Webhook**
- Webhook URL: `https://your-production-domain.com/api/inbox/email`
- For local testing with ngrok:
  1. Install ngrok: `npm install -g ngrok`
  2. Run dev server: `npm run dev`
  3. In another terminal: `ngrok http 3000`
  4. Copy ngrok URL: `https://abc123.ngrok.io`
  5. Set webhook: `https://abc123.ngrok.io/api/inbox/email`

**D. Test the Setup**
1. Get a student's inbox email from the Sources page
2. Send test email:
   ```
   To: abc12345@inbound.postmarkapp.com
   Subject: Test Math Worksheet
   Attachment: Any PDF or image file
   ```
3. Check:
   - Postmark Activity log (email received)
   - Your API logs (webhook called)
   - Supabase `inbox_logs` table (processing status)
   - Sources page (new material appears)

### 5. Environment Variables
Ensure you have:
```env
GOOGLE_AI_API_KEY=your_google_ai_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Features

### For Students
- ✅ Unique inbox email address per profile
- ✅ Copy email with one click
- ✅ Automatic material processing
- ✅ New topics appear in Galaxy automatically

### For Parents/Teachers
- ✅ Simple email forwarding (no app needed)
- ✅ Send photos of worksheets
- ✅ Forward assignment PDFs
- ✅ Attach multiple files per email

### For Developers
- ✅ Comprehensive error handling
- ✅ Audit trail via inbox_logs
- ✅ Idempotent operations
- ✅ RLS security policies
- ✅ Graceful AI fallbacks

## Database Schema

### student_profiles
```sql
inbox_email TEXT UNIQUE  -- e.g., "abc12345@inbound.postmarkapp.com"
```

### inbox_logs
```sql
id UUID PRIMARY KEY
student_profile_id UUID (FK)
from_email TEXT
subject TEXT
received_at TIMESTAMP
attachments_count INTEGER
processing_status TEXT ('pending', 'processing', 'completed', 'failed')
error_message TEXT
metadata JSONB
```

### learning_sources
```sql
source_type TEXT  -- Now includes 'email'
metadata JSONB    -- Stores email details and AI analysis
```

## Cost Estimate

- **Postmark Inbound**: Free (100 emails/month), then $10/month (1,000 emails)
- **Gemini 1.5 Flash**: ~$0.001 per document analysis
- **Supabase Storage**: Included in free tier (1GB)

**Total**: ~$10/month for 1,000 emails

## Testing Checklist

- [x] Database migration runs successfully
- [x] Existing profiles get inbox emails
- [x] New profiles auto-generate inbox emails
- [x] UI displays inbox email on Sources page
- [x] Copy button works
- [ ] Postmark webhook receives test email
- [ ] Attachments upload to Supabase Storage
- [ ] Gemini AI analyzes documents correctly
- [ ] Study topics auto-create
- [ ] Learning sources appear in Sources page
- [ ] Inbox logs track processing status
- [ ] New topics appear in Galaxy

## Next Steps

### Immediate
1. Create Supabase Storage bucket (`inbox`)
2. Set up Postmark account and inbound stream
3. Configure webhook URL
4. Send test email

### Future Enhancements
- Email notifications when materials are processed
- Inbox history view (show recent emails)
- Bulk email processing
- Custom domain (inbox.forgestudy.app)
- Email templates for parents/teachers
- Attachment preview in inbox logs

## Technical Notes

- Uses Postmark Inbound API (simpler than SendGrid)
- Gemini 1.5 Flash for cost-effective document analysis
- Idempotent migration (safe to run multiple times)
- RLS policies ensure users only see their own data
- Comprehensive error handling and logging
- Supports multiple attachments per email
- Auto-creates topics to populate Galaxy
- Graceful fallbacks when AI analysis fails

---

**Status**: ✅ Complete and ready for testing
**Estimated Setup Time**: 30 minutes
**Next Phase**: Phase 4 (Senior Features: Logic Loom & Vault)


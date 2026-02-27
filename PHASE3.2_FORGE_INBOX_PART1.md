# Phase 3.2: Forge Inbox Implementation (Part 1)

## What Was Built

The Forge Inbox allows students to receive study materials via email. Each student gets a unique email address (e.g., `abc12345@inbox.forgestudy.app`), and any attachments sent to that address are automatically processed and added to their learning materials.

## Files Created

### 1. Database Migration
- `supabase_forge_inbox_migration.sql` - Complete database schema for email ingestion
  - Adds `inbox_email` column to `student_profiles` (unique, auto-generated)
  - Creates `generate_inbox_email()` function for unique ID generation
  - Creates trigger to auto-assign inbox emails on profile creation
  - Backfills existing profiles with inbox emails
  - Updates `learning_sources` to support 'email' source type
  - Creates `inbox_logs` table for tracking email processing
  - Adds RLS policies for security

### 2. Webhook Handler
- `src/app/api/inbox/email/route.ts` - Postmark inbound email webhook
  - Receives emails from Postmark Inbound API
  - Extracts student profile from inbox email address
  - Uploads attachments to Supabase Storage (`inbox` bucket)
  - Uses Gemini 1.5 Flash to analyze documents and extract:
    - Subject (e.g., "Math", "Biology", "History")
    - Key concepts (3-5 topics covered)
    - Extracted text (formulas, definitions, questions)
  - Auto-creates `study_topics` based on identified subject
  - Creates `learning_sources` and `learning_source_items`
  - Logs all processing to `inbox_logs` for auditing

## How It Works

### Email Flow

1. **Student receives unique email**: `abc12345@inbox.forgestudy.app`
2. **Parent/teacher forwards materials** to that address
3. **Postmark receives email** and sends webhook to `/api/inbox/email`
4. **Webhook handler**:
   - Looks up student profile by inbox email
   - Creates inbox log entry (status: 'processing')
   - For each attachment:
     - Uploads to Supabase Storage (`inbox` bucket)
     - Analyzes with Gemini 1.5 Flash
     - Creates or finds matching `study_topic`
     - Creates `learning_source` and `learning_source_item`
   - Updates inbox log (status: 'completed' or 'failed')
5. **New node appears in Galaxy** (if new topic created)

### AI Analysis

Gemini 1.5 Flash analyzes each attachment to extract:

- **Subject**: Main academic subject (Math, Science, English, etc.)
- **Concepts**: 3-5 key topics covered in the document
- **Text**: Important formulas, definitions, or questions

Supported file types:
- Images: JPEG, PNG, GIF, WebP
- Documents: PDF

Fallback: If AI analysis fails, extracts subject from filename.

### Database Schema

**student_profiles**:
```sql
inbox_email TEXT UNIQUE  -- e.g., "abc12345@inbox.forgestudy.app"
```

**inbox_logs**:
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

**learning_sources**:
```sql
source_type TEXT  -- Now includes 'email'
metadata JSONB    -- Stores email details and AI analysis
```

## Next Steps

### To Complete Phase 3.2:

1. **Install Dependencies**:
   ```bash
   npm install @google/generative-ai
   ```

2. **Set Up Postmark Inbound**:
   - Sign up at https://postmarkapp.com
   - Configure inbound domain: `inbox.forgestudy.app`
   - Set webhook URL: `https://yourdomain.com/api/inbox/email`
   - Add DNS records (MX, TXT for SPF)

3. **Create Supabase Storage Bucket**:
   - Create bucket named `inbox`
   - Set to public or private (recommend private with signed URLs)
   - Configure RLS policies

4. **Run Database Migration**:
   ```sql
   -- In Supabase SQL Editor:
   -- Copy and paste supabase_forge_inbox_migration.sql
   ```

5. **Add Environment Variable**:
   ```env
   GOOGLE_AI_API_KEY=your_google_ai_api_key
   ```

6. **Build UI Components** (Part 2):
   - Display inbox email on Uploads page
   - Show inbox logs/history
   - Copy-to-clipboard button
   - Instructions for parents/teachers

### Testing Checklist:

- [ ] Database migration runs successfully
- [ ] Existing profiles get inbox emails
- [ ] New profiles auto-generate inbox emails
- [ ] Postmark webhook receives test email
- [ ] Attachments upload to Supabase Storage
- [ ] Gemini AI analyzes documents correctly
- [ ] Study topics auto-create
- [ ] Learning sources appear in uploads
- [ ] Inbox logs track processing status

## Technical Notes

- Uses Postmark Inbound API (free tier: 100 emails/month)
- Gemini 1.5 Flash for cost-effective document analysis
- Idempotent migration (safe to run multiple times)
- RLS policies ensure users only see their own data
- Comprehensive error handling and logging
- Supports multiple attachments per email
- Auto-creates topics to populate Galaxy

## Cost Estimate

- Postmark Inbound: Free (100 emails/month), then $10/month (1,000 emails)
- Gemini 1.5 Flash: ~$0.001 per document analysis
- Supabase Storage: Included in free tier (1GB)

**Total**: ~$10/month for 1,000 emails

---

**Status**: Database and webhook handler complete
**Next**: Install dependencies, set up Postmark, build UI


# Chat Persistence Setup Instructions

## Step 1: Create Database Tables in Supabase

The chat persistence requires two tables: `chats` and `messages`. 

### How to Run the SQL:

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor** (left sidebar)

2. **Run the Schema**
   - Open the file `supabase_chat_schema.sql` in this project
   - Copy **ALL** the SQL code
   - Paste it into the Supabase SQL Editor
   - Click **"Run"** or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

3. **Verify Tables Were Created**
   - Go to **Table Editor** in Supabase
   - You should see two new tables:
     - `chats`
     - `messages`

## Step 2: Verify RLS Policies

The SQL schema includes Row Level Security (RLS) policies. These ensure:
- Users can only see their own chats
- Users can only create messages in their own chats

If you're testing without authentication, the policies will block access. You can temporarily disable RLS for testing:

```sql
ALTER TABLE chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
```

**⚠️ Warning:** Only disable RLS for development/testing. Re-enable it before production:

```sql
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
```

## Step 3: Test the Implementation

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Test chat persistence:**
   - Send a message in the chat
   - Navigate to a different page (e.g., `/binder`)
   - Navigate back to the chat page
   - Your messages should still be there!

## Troubleshooting

### Error: "Could not find the table 'public.chats'"
- **Solution:** Run the SQL schema in Supabase SQL Editor (Step 1)

### Error: "new row violates row-level security policy"
- **Solution:** Either:
  1. Make sure you're authenticated (logged in)
  2. Or temporarily disable RLS for testing (see Step 2)

### Chat disappears when navigating
- **Check:** Make sure the SQL schema was run successfully
- **Check:** Verify tables exist in Supabase Table Editor
- **Check:** Check browser console for errors

### Messages not loading
- **Check:** Open browser DevTools → Network tab
- **Check:** Look for `/api/history` request - check if it returns data
- **Check:** Verify `localStorage` has `forgenursing-chat-id` key


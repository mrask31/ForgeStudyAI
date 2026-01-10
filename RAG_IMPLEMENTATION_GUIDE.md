# RAG Implementation Guide

## Overview

Retrieval Augmented Generation (RAG) has been implemented to allow the tutor to answer questions based on the user's uploaded Clinical Binder documents.

## What Was Implemented

### 1. Vector Search RPC Function
- Created `supabase_vector_search_rpc.sql` with `match_documents()` function
- Performs cosine similarity search on document embeddings
- **Security**: Filters by `user_id` and `is_active` (only active documents)

### 2. RAG Retrieval in Chat Route
- Updated `src/app/api/chat/route.ts` to:
  - Generate embeddings for user messages
  - Query Supabase for relevant document chunks
  - Inject retrieved context into system prompt
  - Handle errors gracefully

### 3. System Prompt Updates
- Updated `src/lib/ai/prompts.ts` to:
  - Acknowledge binder context when provided
  - Never deny access when context exists
  - Guide users to check binder toggles when no context is found

### 4. Strict Mode Compatibility
- Strict mode works with RAG (injected after binder context)
- Only changes guidance style, not document access

## Deployment Steps

### Step 1: Create RPC Function in Supabase

1. Open Supabase SQL Editor
2. Run `supabase_vector_search_rpc.sql`
3. Verify function exists:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'match_documents';
   ```

### Step 2: Verify Vector Index (Optional but Recommended)

The SQL file creates an IVFFlat index for faster searches. Verify it exists:
```sql
SELECT indexname FROM pg_indexes WHERE tablename = 'documents' AND indexname = 'documents_embedding_idx';
```

### Step 3: Deploy Code Changes

Deploy the updated files:
- `src/app/api/chat/route.ts`
- `src/lib/ai/prompts.ts`

### Step 4: Test

See "Testing" section below.

## How It Works

1. **User asks a question** in the chat
2. **Chat route extracts** the latest user message
3. **Embedding is generated** using `text-embedding-3-small`
4. **Vector search** queries Supabase for top 5 similar chunks:
   - Filters by authenticated `user_id` (security)
   - Filters by `is_active = true` (only active documents)
   - Minimum similarity threshold: 0.7
5. **Context is injected** into system prompt
6. **Model responds** using the retrieved context

## Security

- ✅ All queries filter by `user_id` (user isolation)
- ✅ Only active documents (`is_active = true`) are retrieved
- ✅ RLS policies provide defense in depth
- ✅ RPC function defaults to `auth.uid()` for security

## Testing

### Test 1: Basic RAG Functionality

1. **Upload 3 PDFs** to Clinical Binder:
   - Heart Failure notes
   - Medication Safety Policy
   - Pediatric Asthma guidelines

2. **Ensure all files are active** (toggle "Include in AI Context" ON)

3. **Ask**: "What topics am I currently studying based on my uploaded materials?"

4. **Expected**: 
   - ✅ Tutor lists topics from all 3 documents
   - ✅ No denial language ("I can't view files")
   - ✅ Specific topics mentioned (HF, med safety, peds asthma)

### Test 2: Toggle OFF Behavior

1. **Turn OFF** one file's "Include in AI Context" toggle
2. **Ask the same question**
3. **Expected**: 
   - ✅ Only topics from active files are mentioned
   - ✅ The toggled-off file's content is excluded

### Test 3: No Documents

1. **Toggle all files OFF** (or delete all)
2. **Ask**: "What topics am I studying?"
3. **Expected**: 
   - ✅ Tutor mentions checking "My Clinical Binder" toggles
   - ✅ No generic denial

### Test 4: Strict Mode with RAG

1. **Enable Strict NCLEX Mode**
2. **Ask**: "What topics am I studying?"
3. **Expected**: 
   - ✅ Still uses binder context
   - ✅ Response is more concise/firm (strict mode style)
   - ✅ No denial of document access

### Test 5: Security (Multi-User)

1. **Account A**: Upload "Account A Notes.pdf"
2. **Account B**: Upload "Account B Notes.pdf"
3. **As Account A**: Ask about study topics
4. **Expected**: 
   - ✅ Only Account A's documents are used
   - ✅ Account B's documents never appear

## Debugging

### Check RAG Logs

Look for console logs:
- `[RAG] Starting retrieval for user_id: ...`
- `[RAG] Found chunks: X`
- `[RAG] No relevant chunks found for user`

### Common Issues

**Issue**: "RPC function does not exist"
- **Fix**: Run `supabase_vector_search_rpc.sql` in Supabase SQL Editor

**Issue**: "No chunks found" but documents exist
- **Check**: Are documents `is_active = true`?
- **Check**: Does user_id match authenticated user?
- **Check**: Is similarity threshold too high? (try lowering to 0.5)

**Issue**: Wrong documents retrieved
- **Check**: Are embeddings correct? (verify `text-embedding-3-small` is used)
- **Check**: Is vector dimension 1536? (matches embedding model)

**Issue**: Still getting "can't view files" message
- **Check**: Is binder context being injected? (check logs)
- **Check**: System prompt includes binder context rules

## Performance Notes

- **Embedding generation**: ~100-200ms per query
- **Vector search**: ~50-100ms (with index)
- **Total RAG overhead**: ~150-300ms per chat message

The IVFFlat index significantly speeds up similarity searches on large document collections.

## Future Enhancements

- [ ] Add metadata filtering (e.g., by filename)
- [ ] Adjustable similarity threshold per query
- [ ] Hybrid search (keyword + vector)
- [ ] Re-ranking for better relevance
- [ ] Caching for repeated queries


# ForgeStudy RAG Strategy (School-Aware MVP)

This document describes the minimal School-Aware RAG foundation used by the tutor to personalize help with student materials.

## Overview
- Students (and parents) can add materials in `/sources` (syllabus, weekly plans, photos).
- Materials are stored in `learning_sources` and `learning_source_items`.
- The tutor retrieves context from these items and injects it into the system prompt as **STUDENT MATERIALS CONTEXT**.

## Data Model
- `learning_sources`
  - `user_id`, optional `profile_id`, `source_type`, `title`, `description`, `metadata`
- `learning_source_items`
  - `source_id`, `item_type`, `extracted_text`, `original_filename`, `metadata`

## Retrieval Rules (MVP)
- Tokenize user question, remove common stop words.
- Score items by matches in:
  - Source title (highest weight)
  - Source description
  - Item metadata tags
  - Extracted text
- Apply a small recency bonus (7 days / 30 days).
- Limit by `maxItems` and `maxChars` to keep prompts concise.

## Learning Modes
- **STRICT**: use only student materials; ask for more if insufficient.
- **BALANCED**: use materials first, then general knowledge if needed.
- **PRACTICE**: guide with hints and questions instead of full answers.

## Tutor Prompt Integration
- When context exists, the API adds:
  - `STUDENT MATERIALS CONTEXT` system block
  - Instruction to cite sources in a `Sources:` line
- Example citations format:
  - `Sources: [Unit 2 Fractions — weekly], [ELA Scope & Sequence — syllabus]`

## Limitations (Intentional)
- File uploads are stored as metadata only until storage pipelines are added.
- No embeddings or vector search yet; keyword scoring is used for MVP.
- No per-item visibility controls beyond RLS.

## Testing Notes
- Add a syllabus source and paste text; ask a related tutor question and verify citations.
- Add weekly notes and confirm recency prioritization.
- Verify RLS: users can only see their own sources and items.

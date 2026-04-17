-- ============================================
-- Workstream A: 6 new email templates
-- ============================================

-- founding_day_30
INSERT INTO public.email_templates (slug, name, subject, body_markdown, audience, is_active)
VALUES (
  'founding_day_30',
  'Founding Day 30 — Feedback Ask',
  '30 days in — one honest question',
  'Hi {{parent_first_name}},

You''re a month into your Founding Families access. I haven''t bothered you much on purpose — you signed up to use a product, not to answer surveys.

But 30 days is when the real product stuff shows up. You''ve seen what works. You''ve also seen where your kid rolled their eyes, where the AI said something dumb, where the Sunday email missed the mark.

So two honest questions, and your reply comes straight to me:

What''s working? (Even one small thing.)

What''s frustrating? (Even one small thing.)

That''s it. No form. No link. Just hit reply.

I read every response and the answers shape what ships next.

Michael',
  'parent',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  subject = EXCLUDED.subject,
  body_markdown = EXCLUDED.body_markdown,
  name = EXCLUDED.name,
  is_active = true,
  updated_at = NOW();

-- founding_day_88
INSERT INTO public.email_templates (slug, name, subject, body_markdown, audience, is_active)
VALUES (
  'founding_day_88',
  'Founding Day 88 — 2-Day Warning',
  'Your Founding Families access ends in 2 days',
  'Hi {{parent_first_name}},

Two days left on your Founding Families access.

Here''s how it ends:

If you want to keep going, lock in at forgestudyai.com/subscribe. Individual is $14.99/mo, Family is $29.99/mo — same price as everyone else. We never raised it on you.

If you want to walk away, do nothing. We still don''t have your card. Nothing charges. {{student_first_name}}''s data stays safe for 90 days in case you change your mind.

If you''re on the fence, hit reply. I''d rather know what''s making you hesitate than lose you silently.

Michael',
  'parent',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  subject = EXCLUDED.subject,
  body_markdown = EXCLUDED.body_markdown,
  name = EXCLUDED.name,
  is_active = true,
  updated_at = NOW();

-- founding_day_90
INSERT INTO public.email_templates (slug, name, subject, body_markdown, audience, is_active)
VALUES (
  'founding_day_90',
  'Founding Day 90 — Final Day',
  'Today''s the day — keep going or walk away',
  'Hi {{parent_first_name}},

Your Founding Families access ends at midnight.

If you want to keep going: forgestudyai.com/subscribe. $14.99/mo Individual or $29.99/mo Family. Same rate as every other parent. No tricks, no introductory-price-that-jumps-later games.

If you do nothing, access pauses. No charge. {{student_first_name}}''s data stays safe for 90 more days if you change your mind.

Either way — thank you for being Founding Family #{{founding_signup_number}}. You signed up when this product had no reviews, no case studies, and no proof, and you gave it a shot anyway. I don''t forget that.

Michael',
  'parent',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  subject = EXCLUDED.subject,
  body_markdown = EXCLUDED.body_markdown,
  name = EXCLUDED.name,
  is_active = true,
  updated_at = NOW();

-- trial_day_7 (single template, body selected at send-time based on session_count in metadata)
INSERT INTO public.email_templates (slug, name, subject, body_markdown, audience, is_active)
VALUES (
  'trial_day_7',
  'Trial Day 7 — First Week Check',
  'One week in — here''s what {{student_first_name}}''s done so far',
  '{{#if has_sessions}}Hi {{parent_first_name}},

One week into your trial. Here''s what {{student_first_name}} has actually done:

Sessions: {{session_count}}
Subjects worked on: {{subjects_list}}
Mastery movement: {{mastery_summary}}

Tomorrow (Sunday at 6pm) you''ll get your first full weekly summary — the real version with what they got stuck on and where they pushed through. If your kid barely opened the app this week, the summary will tell you that too, straight up. No spin.

You''ve got 7 days left on your trial. No card on file, no auto-charge.

Michael{{else}}Hi {{parent_first_name}},

One week into your trial. {{student_first_name}} hasn''t opened the app yet — which is normal, honestly. Most kids don''t start a new homework app on their own. They need a direct handoff.

One that works roughly 7 times out of 10:

"Snap a photo of a worksheet you hate. I want to see what this thing does."

You''ve got 7 days left on your trial. No card on file, no auto-charge. Try that tonight, and if it doesn''t click, hit reply and tell me what happened. I''ll help you figure out the angle.

Michael{{/if}}',
  'parent',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  subject = EXCLUDED.subject,
  body_markdown = EXCLUDED.body_markdown,
  name = EXCLUDED.name,
  is_active = true,
  updated_at = NOW();

-- trial_day_14
INSERT INTO public.email_templates (slug, name, subject, body_markdown, audience, is_active)
VALUES (
  'trial_day_14',
  'Trial Day 14 — Trial Ended',
  'Your trial ends today',
  'Hi {{parent_first_name}},

Your 14-day trial ends today at midnight.

Lock in here if you want to keep going: forgestudyai.com/subscribe

If you do nothing, access pauses. We still don''t have your card. No charge.

If ForgeStudy wasn''t the fit, I''d rather know why than guess. One sentence back to this email — even "my kid didn''t open it" — helps me build the next version.

{{student_first_name}}''s data stays safe for 90 days if you come back.

Michael',
  'parent',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  subject = EXCLUDED.subject,
  body_markdown = EXCLUDED.body_markdown,
  name = EXCLUDED.name,
  is_active = true,
  updated_at = NOW();

-- subscription_confirmation
INSERT INTO public.email_templates (slug, name, subject, body_markdown, audience, is_active)
VALUES (
  'subscription_confirmation',
  'Subscription Confirmation',
  'You''re in. Everything carried over.',
  'Hi {{parent_first_name}},

You''re subscribed. Thank you.

Everything from your trial carried over — {{student_first_name}}''s sessions, mastery scores, the subjects they''ve built up. Nothing got reset.

Your Sunday summary fires this week at 6pm. That''s the email I actually want you to read.

One link, bookmark it: forgestudyai.com/app

Reply to this email anytime. Still me on the other side.

Michael',
  'parent',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  subject = EXCLUDED.subject,
  body_markdown = EXCLUDED.body_markdown,
  name = EXCLUDED.name,
  is_active = true,
  updated_at = NOW();

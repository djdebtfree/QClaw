# Human Texture Layer — Skill Definition

## What It Does

The Human Texture Layer is a post-processing utility that transforms agent-generated SMS messages to read like they were typed by a real person on a phone. It strips corporate polish and adds the natural imperfections that signal authenticity.

This is NOT about being sloppy. It is about matching the communication style of the person Sandy Beach is pretending to be: a busy professional who texts casually, like everyone else.

## Rules

- **NEVER apply to email.** Email has different norms. Lowercase and missing apostrophes look unprofessional in email.
- **NEVER apply to voice.** Vapi voice agents speak naturally by design. Human Texture is a text-only utility.
- **NEVER apply to Telegram.** Telegram messages to Keith are operational, not sales. They should be clear and structured.
- **ONLY apply to SMS.** Every outbound SMS from Sandy Beach to a lead passes through this layer.

## Transformations

| Rule | Before | After |
|------|--------|-------|
| Lowercase all | "Hey John, I wanted to..." | "hey john i wanted to..." |
| Drop apostrophes | "don't", "can't", "you're" | "dont", "cant", "youre" |
| Drop trailing periods | "Let me know." | "let me know" |
| Compress casual words | "minute", "message", "let me know" | "min", "msg", "lmk" |
| Remove emojis (first 3 texts) | "Hey! 👋" | "hey" |
| Single thought per message | "I wanted to reach out and also share..." | Split into 2 messages |
| Preserve natural typos | (no correction) | (leave minor typos) |

## Configuration

```yaml
human_texture:
  enabled: true
  channel: sms_only
  apply_to:
    - reach_out_agent
    - intent_declaration_agent
    - discovery_agent
    - clarity_agent
    - objection_agent
    - scheduling_agent
    - reminder_agent
    - exit_agent
  exclude_from:
    - orchestrator
    - alignment_detection_agent
  rules:
    force_lowercase: true
    strip_apostrophes: true
    strip_trailing_punctuation: true
    allow_abbreviations: [lmk, min, msg, nw, ty]
    emoji_block_first_n_texts: 3
    emoji_allow_after: true
    max_sentences_per_message: 1
    typo_injection: false  # We don't inject typos. We just don't correct natural ones.
```

## Integration Flow

```
Agent generates message
    ↓
DoctrineKernelEnforcer checks compliance
    ↓
Human Texture Layer transforms (SMS only)
    ↓
GHL SMS Send via PIT
    ↓
MetricsEventLogger logs the send
```

## Why This Exists

People can detect automation in 2 seconds. Perfect grammar, proper capitalization, and emoji-heavy openers are the three biggest signals that a message came from a bot or a CRM sequence. The Human Texture Layer eliminates all three.

This is not deception. Sandy Beach IS an AI. But her texts should feel like they came from the busy professional she represents — not from a marketing automation platform. The goal is respect for the recipient's attention, not trickery.

## Boundaries

- Human Texture does NOT change the meaning of messages
- Human Texture does NOT add content (no injected phrases or filler)
- Human Texture does NOT remove compliance language (opt-out instructions stay intact)
- Human Texture does NOT apply to any message containing legal, financial, or health claims
- Human Texture is ALWAYS applied AFTER doctrine compliance check, never before

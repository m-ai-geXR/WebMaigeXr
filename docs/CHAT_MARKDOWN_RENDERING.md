# Chat message rendering

How a line of markdown becomes a chat bubble on Web/Electron, iOS and Android,
and the layout trap that two of the three clients fell into.

Reported as "user messages look visually off" on iOS: a paragraph wrapped into a
narrow column on the right instead of flowing across the bubble, while the
bullet list directly beneath it wrapped normally.

---

## 1. The rule that matters

**A paragraph must be one text object.** Every client has to build a single
styled string and hand it to a single text view. Composing a line out of several
side-by-side text views breaks wrapping, because each view gets its own column
and wraps inside it.

This is easy to get wrong, because splitting a line into runs is exactly what
inline markdown parsing produces. The parse is per-run; the render must not be.

---

## 2. iOS: the HStack trap

`XRAiAssistant/Views/MarkdownMessageView.swift` classifies each line. A line
containing a backtick or an asterisk becomes `.inlineFormattedLine([InlineBlock])`;
everything else becomes `.text(String)`.

The two paths used to render very differently:

- `.text` → one `Text` → wraps across the full bubble. Correct.
- `.inlineFormattedLine` → **an `HStack` of one `Text` per run**. Wrong.

An `HStack` lays its children out horizontally and gives each one a share of the
width. So for:

```text
Create **AFTERGLOW EXPRESS**, a playable NOVA64 showcase where a tiny futuristic
train races along a floating railway through a midnight ocean of clouds.
```

the runs are `"Create "`, bold `"AFTERGLOW EXPRESS"`, and a very long remainder.
The remainder received only the width left over after the first two, and wrapped
inside that narrow column — a block of text pushed to the right with its own
ragged edge, which is what the bug report showed.

This explains the detail that made the bug look stranger than it was: **only
paragraphs containing inline formatting were affected.** A bullet with no bold in
it took the `.text` path and wrapped correctly, directly below a broken
paragraph.

It was never a user-message bug. Assistant messages used the same renderer and
had the same defect. It was simply most visible on outgoing messages, where long
prompts carry bold mid-paragraph.

### The fix

`XRAiAssistant/Views/MarkdownInlineRenderer.swift` builds one `AttributedString`
for the whole line, with per-run attributes, and the view renders it with a
single `Text`:

```swift
case .inlineFormattedLine(let blocks):
    Text(MarkdownInlineRenderer.attributedString(from: blocks, isUser: isUser))
        .frame(maxWidth: .infinity, alignment: .leading)
        .fixedSize(horizontal: false, vertical: true)
```

This is the approach `syntaxHighlightedCode` in the same file already used for
code blocks, where the comment notes that `Text` concatenation overflows the
stack on long input. `AttributedString` avoids both problems.

Parsing moved into `MarkdownInlineRenderer` along with the rendering so the
behaviour is testable without standing up SwiftUI.

### Two things that changed with it

- **Inline code on the outgoing bubble.** It used `.primary` text on a
  `systemGray6` fill, which on a blue bubble is close to unreadable. It is now
  white on a translucent white wash. An attributed run cannot carry padding or
  rounded corners the way a styled view can, so the run is padded with thin
  spaces (`U+2009`) to keep the background off the glyphs.
- **Unterminated `**`.** The old parser consumed the rest of the line into a
  bold run that never closed, and dropped it. It now renders literally.

---

## 3. Web/Electron: inherited alignment

A different mechanism, same symptom, in
`src/components/chat/chat-message.tsx`.

The message wrapper carries `text-right` for user messages so that the
`inline-block` bubble floats to the right edge. But `text-align` inherits, so the
text *inside* the bubble was right-aligned too, giving multi-line prompts a
ragged left edge.

The fix is to let the wrapper keep positioning the bubble while the bubble
itself resets alignment for its content:

```tsx
<div className={`inline-block p-3 rounded-lg text-left ${...}`}>
```

This matches iOS, where `ThreadedMessageView` places the bubble trailing while
`MarkdownMessageView` lays its content out leading.

---

## 4. Android: already correct

`app/src/main/java/com/xraiassistant/ui/components/MarkdownText.kt` builds a
single `AnnotatedString` with `withStyle(SpanStyle(...))` per run and passes it
to one `Text`. That is the Compose equivalent of the iOS fix and needs no change.

**Do not "simplify" this into a `Row` of `Text` composables.** It would
reintroduce the iOS bug on Android. The `Row` further down that file is the code
block header, which holds the language label and copy button — not body text.

---

## 5. Verifying changes

iOS has sixteen tests across two files:

- `XRAiAssistantTests/MarkdownInlineRendererTests.swift` — fourteen unit tests.
  Both paragraphs from the original report round-trip with their markers removed
  and nothing lost; a long tail after a bold run stays a single run; runs carry
  the right font and colour; outgoing text stays white and inline code stays
  legible on blue; unterminated markers lose no text.
- `XRAiAssistantTests/MarkdownBubbleSnapshotTests.swift` — two tests that render
  a bubble through `ImageRenderer` at a fixed width and assert its shape. A
  paragraph that wraps across the bubble is short; the old narrow-column layout
  was far taller for the same content.

```sh
xcodebuild test -scheme XRAiAssistant \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -only-testing:XRAiAssistantTests/MarkdownInlineRendererTests \
  -only-testing:XRAiAssistantTests/MarkdownBubbleSnapshotTests
```

To look at the rendered bubbles rather than just assert on them, point the
snapshot tests at a directory on the host. `xcodebuild` only forwards host
environment variables to the test runner when they carry the `TEST_RUNNER_`
prefix:

```sh
TEST_RUNNER_SNAPSHOT_DIR=/tmp/maigexr-snapshots xcodebuild test ... \
  -only-testing:XRAiAssistantTests/MarkdownBubbleSnapshotTests
```

The layout itself is not directly unit-testable, so the unit tests lock down the
property that made the layout wrong — the line surviving as one contiguous
styled string — and the snapshot tests cover the rest.

On Web, `pnpm test` and `pnpm type-check` cover the component compiling and the
existing suites; the alignment change itself is CSS and was verified by
inspection.

---

## 6. Known rough edges

- **The iOS test target carries pre-existing failures.** It did not compile at
  all until this work: `SecureCodeSandboxService` is a singleton whose private
  initializer three test files called directly, and `ChatViewModelTests` was not
  `@MainActor` while `ChatViewModel` is. Both were fixed mechanically, which
  exposed about thirty runtime failures in those older suites. They assert
  against a superseded model catalog — `testOpenAIModels` expects `gpt-4` or
  `gpt-3.5`, for instance, where the catalog is now GPT-6 and GPT-5.6. They are
  unrelated to message rendering and still need their own pass.
- **Web does not render markdown in user messages.** Outgoing messages go
  through a plain `<p>`, so `**bold**` typed by the user shows its asterisks,
  while iOS and Android parse markdown in both directions. Worth reconciling,
  but it is a behaviour change rather than a layout fix.
- **The inline-code background is a flat wash, not a chip.** Rounded corners and
  real padding would require going back to separate views, which is the thing
  that broke wrapping. The thin-space padding is the compromise.

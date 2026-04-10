# QuickReply AI

Professional email replies in one click. No API key, no account, no setup.

---

## Chrome Web Store Listing

### Title
QuickReply AI — Instant Professional Email Replies

### Short Description (132 chars max)
Generate professional email replies instantly. One click, three tones, zero setup. Works on Gmail. No API key or account needed.

### Detailed Description

**Stop spending 10 minutes writing every email reply.**

QuickReply AI reads the email you're looking at and instantly generates three reply options — Professional, Friendly, and Quick Acknowledgment. One click to copy or insert directly into your reply box.

**How it works:**
1. Open any email in Gmail
2. Click the purple QuickReply button (bottom-right corner)
3. Pick your tone — Professional, Friendly, or Quick
4. Copy to clipboard or insert directly into your reply

**Smart email detection** — QuickReply AI recognizes what kind of email you received and tailors the reply:
- Meeting and scheduling requests
- Questions and information requests
- Invoices and payment messages
- Follow-ups and check-ins
- Introductions and networking
- Feedback and review requests
- Proposals and estimates
- Complaints and issues
- Thank-you notes
- Deadline reminders
- And more (12+ email categories)

**Privacy first:**
- No data ever leaves your browser
- No API keys, no accounts, no sign-up
- No tracking, no analytics
- Works 100% offline after install

**Built for small business owners** who reply to dozens of emails a day and need to sound professional every time — without burning out.

### Category
Productivity

### Language
English

### Pricing

**Free tier** — All core features:
- Smart email detection (12+ categories)
- Three reply tones (Professional, Friendly, Quick)
- Copy to clipboard
- Insert into reply box
- Works on Gmail

**Pro tier — $4.99/month** (future release):
- Custom reply templates
- Tone customization (adjust formality level)
- Multi-language replies
- Reply history and favorites
- Priority support

---

## Screenshots Guidance

Prepare 5 screenshots at 1280x800 or 640x400 resolution:

1. **Hero shot** — Gmail inbox with the purple QuickReply FAB visible in the bottom-right corner. Clean, real-looking inbox.

2. **Reply panel open** — The QuickReply panel showing three generated replies for a meeting request email. Shows the "Detected: Meeting Request" label.

3. **Copy/Insert action** — The "Copied!" success state on one of the reply cards, showing the green confirmation button.

4. **Popup UI** — The extension popup showing the "Active on Gmail" status with how-it-works steps.

5. **Before/After** — Split image: left side shows a blank Gmail reply box, right side shows the same box filled with a professional reply via QuickReply AI.

---

## Installation (Developer Mode)

1. Clone or download this folder
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the `quickreply-ai` folder
6. Navigate to Gmail — the purple button appears in the bottom-right corner

---

## File Structure

```
quickreply-ai/
  manifest.json       Manifest V3 configuration
  background.js       Service worker for message routing
  content.js          Gmail content script (email extraction, reply generation, UI)
  styles.css          Content script styles (FAB, panel, cards, toast)
  popup.html          Extension popup UI
  popup.js            Popup logic (Gmail detection)
  icons/
    icon-48.png       Toolbar icon
    icon-128.png      Store listing icon
    icon-48.svg       Source SVG
    icon-128.svg      Source SVG
  README.md           This file
```

---

## How Reply Generation Works

No AI API calls. The extension uses pattern matching to detect the email's intent (meeting, question, invoice, complaint, etc.) from subject line and body text, then selects from hand-written, contextual reply templates. The sender's first name is extracted and used in the greeting.

**Intent categories:** meeting, question, request, invoice, followup, intro, feedback, thankyou, apology, deadline, proposal, complaint, general.

Each category has three reply variants: formal, friendly, and quick acknowledgment.

---

## Technical Notes

- **Manifest V3** — uses service worker, not background page
- **Content script** runs only on `mail.google.com`
- **No external requests** — everything runs locally in the browser
- **Gmail DOM selectors** target standard Gmail classes (`.hP`, `.gD`, `.a3s.aiL`, etc.). These may change if Google updates Gmail's markup.
- **Clipboard API** used with `execCommand('copy')` fallback for older contexts
- Reply insertion targets Gmail's contenteditable reply box and triggers `input` events so Gmail registers the content change

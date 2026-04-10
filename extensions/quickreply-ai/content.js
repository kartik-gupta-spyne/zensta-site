// QuickReply AI — Content Script
// Runs on Gmail pages. Adds floating button and handles email extraction + reply insertion.

(function () {
  'use strict';

  // ── Floating Action Button ──────────────────────────────────────────
  function createFloatingButton() {
    if (document.getElementById('qr-ai-fab')) return;

    const fab = document.createElement('div');
    fab.id = 'qr-ai-fab';
    fab.title = 'QuickReply AI — Generate a reply';
    fab.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" fill="white"/>
        <path d="M7 9H17M7 13H14" stroke="#4F46E5" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;
    document.body.appendChild(fab);

    fab.addEventListener('click', () => {
      togglePanel();
    });
  }

  // ── Reply Panel ─────────────────────────────────────────────────────
  let panelOpen = false;

  function togglePanel() {
    const existing = document.getElementById('qr-ai-panel');
    if (existing) {
      existing.remove();
      panelOpen = false;
      return;
    }
    panelOpen = true;
    showPanel();
  }

  function showPanel() {
    const emailData = extractEmailFromPage();

    const panel = document.createElement('div');
    panel.id = 'qr-ai-panel';

    if (!emailData.subject && !emailData.body) {
      panel.innerHTML = `
        <div class="qr-ai-header">
          <span class="qr-ai-title">QuickReply AI</span>
          <button class="qr-ai-close" id="qr-ai-close">&times;</button>
        </div>
        <div class="qr-ai-body">
          <p class="qr-ai-empty">Open an email first, then click QuickReply AI to generate replies.</p>
        </div>
      `;
    } else {
      const replies = generateReplies(emailData);
      panel.innerHTML = `
        <div class="qr-ai-header">
          <span class="qr-ai-title">QuickReply AI</span>
          <button class="qr-ai-close" id="qr-ai-close">&times;</button>
        </div>
        <div class="qr-ai-detected">
          <span class="qr-ai-label">Detected:</span>
          <span class="qr-ai-subject">${escapeHtml(emailData.subject || 'No subject')}</span>
        </div>
        <div class="qr-ai-body">
          ${replies.map((r, i) => `
            <div class="qr-ai-reply-card" data-index="${i}">
              <div class="qr-ai-reply-tone">${r.icon} ${r.tone}</div>
              <div class="qr-ai-reply-text">${escapeHtml(r.text)}</div>
              <div class="qr-ai-reply-actions">
                <button class="qr-ai-btn qr-ai-btn-copy" data-index="${i}">Copy</button>
                <button class="qr-ai-btn qr-ai-btn-insert" data-index="${i}">Insert into reply</button>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      setTimeout(() => {
        panel.querySelectorAll('.qr-ai-btn-copy').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.index);
            copyToClipboard(replies[idx].text, e.target);
          });
        });
        panel.querySelectorAll('.qr-ai-btn-insert').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.index);
            insertIntoReplyBox(replies[idx].text);
          });
        });
      }, 0);
    }

    document.body.appendChild(panel);

    // Animate in
    requestAnimationFrame(() => {
      panel.classList.add('qr-ai-panel-visible');
    });

    setTimeout(() => {
      const closeBtn = document.getElementById('qr-ai-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          panel.remove();
          panelOpen = false;
        });
      }
    }, 0);
  }

  // ── Email Extraction ────────────────────────────────────────────────
  function extractEmailFromPage() {
    const result = { sender: '', subject: '', body: '', intent: 'general' };

    // Subject line
    const subjectEl = document.querySelector('h2.hP') ||
                      document.querySelector('[data-thread-perm-id] h2') ||
                      document.querySelector('.ha h2');
    if (subjectEl) {
      result.subject = subjectEl.textContent.trim();
    }

    // Sender name
    const senderEl = document.querySelector('.gD') ||
                     document.querySelector('[email]') ||
                     document.querySelector('.go');
    if (senderEl) {
      result.sender = senderEl.getAttribute('name') || senderEl.textContent.trim();
    }

    // Email body — get the most recent message in the thread
    const messageEls = document.querySelectorAll('.a3s.aiL, .a3s, .ii.gt div');
    if (messageEls.length > 0) {
      const lastMessage = messageEls[messageEls.length - 1];
      result.body = lastMessage.textContent.trim().substring(0, 2000);
    }

    // Detect intent from content
    result.intent = detectIntent(result.subject, result.body);

    return result;
  }

  // ── Intent Detection ────────────────────────────────────────────────
  function detectIntent(subject, body) {
    const text = (subject + ' ' + body).toLowerCase();

    const patterns = {
      meeting:    /\b(meeting|schedule|calendar|call|zoom|availability|free time|slot|appointment)\b/,
      question:   /\b(how|what|when|where|why|could you|can you|would you|please explain|wondering|curious)\b.*\?/,
      request:    /\b(please|kindly|could you|can you|would you|need you to|requesting|ask that you)\b/,
      invoice:    /\b(invoice|payment|billing|receipt|charge|amount due|pay|remittance)\b/,
      followup:   /\b(follow up|following up|checking in|just wanted to|circling back|touching base|any update)\b/,
      intro:      /\b(introduce|introduction|meet|connecting you|putting you in touch|i'd like you to meet)\b/,
      feedback:   /\b(feedback|review|thoughts|opinion|comment|suggestion|input)\b/,
      thankyou:   /\b(thank you|thanks|appreciate|grateful)\b/,
      apology:    /\b(sorry|apologize|apologies|my mistake|my bad)\b/,
      deadline:   /\b(deadline|due date|by end of|asap|urgent|time.?sensitive|priority)\b/,
      proposal:   /\b(proposal|quote|estimate|pricing|offer|scope)\b/,
      complaint:  /\b(issue|problem|complaint|dissatisfied|unhappy|not working|broken|disappointed)\b/,
    };

    for (const [intent, regex] of Object.entries(patterns)) {
      if (regex.test(text)) return intent;
    }
    return 'general';
  }

  // ── Reply Generation ────────────────────────────────────────────────
  function generateReplies(emailData) {
    const { sender, subject, body, intent } = emailData;
    const firstName = sender.split(/[\s,]/)[0] || 'there';

    const templates = {
      meeting: {
        formal: `Dear ${firstName},\n\nThank you for reaching out regarding scheduling. I would be happy to find a mutually convenient time.\n\nCould you please share a few available slots? I am generally available on weekdays between 9 AM and 5 PM.\n\nLooking forward to our conversation.\n\nBest regards`,
        friendly: `Hi ${firstName}!\n\nSounds great — let's get something on the calendar. I'm pretty flexible this week, so just send over a few times that work for you and I'll make it happen.\n\nTalk soon!`,
        quick: `Hi ${firstName},\n\nThat works for me. Please send over a calendar invite and I'll confirm.\n\nThanks!`
      },
      question: {
        formal: `Dear ${firstName},\n\nThank you for your inquiry. That is a great question.\n\nI have reviewed the details and would like to provide the following response: [your answer here]\n\nPlease do not hesitate to reach out if you have any further questions.\n\nBest regards`,
        friendly: `Hi ${firstName}!\n\nGreat question! Here's what I think:\n\n[your answer here]\n\nLet me know if that helps or if you need anything else!`,
        quick: `Hi ${firstName},\n\nGood question — [your answer here].\n\nLet me know if you need more details.\n\nThanks!`
      },
      request: {
        formal: `Dear ${firstName},\n\nThank you for reaching out. I have received your request and will look into it promptly.\n\nI expect to have an update for you by [timeline]. Should you need anything in the meantime, please do not hesitate to contact me.\n\nBest regards`,
        friendly: `Hi ${firstName}!\n\nGot it — I'll take care of this. You should hear back from me by [timeline].\n\nLet me know if anything changes on your end in the meantime!`,
        quick: `Hi ${firstName},\n\nReceived — I'm on it. Will follow up shortly.\n\nThanks!`
      },
      invoice: {
        formal: `Dear ${firstName},\n\nThank you for sending this over. I have received the invoice and will process it according to our standard payment terms.\n\nIf there are any discrepancies, I will reach out directly. Otherwise, please expect payment by [date].\n\nBest regards`,
        friendly: `Hi ${firstName}!\n\nGot the invoice — thanks for sending it over. I'll get this processed and you should see payment by [date].\n\nLet me know if you need anything else!`,
        quick: `Hi ${firstName},\n\nInvoice received. Will process and follow up if needed.\n\nThanks!`
      },
      followup: {
        formal: `Dear ${firstName},\n\nThank you for following up. I appreciate your patience.\n\nI wanted to provide you with an update: [status update]. I expect to have more information by [timeline].\n\nPlease let me know if you have any questions in the meantime.\n\nBest regards`,
        friendly: `Hi ${firstName}!\n\nThanks for checking in! Here's where things stand: [status update].\n\nI should have a full update by [timeline]. Appreciate your patience!`,
        quick: `Hi ${firstName},\n\nThanks for the follow-up. Quick update: [status]. More details coming by [timeline].\n\nThanks!`
      },
      intro: {
        formal: `Dear ${firstName},\n\nThank you for making this introduction. I truly appreciate you connecting us.\n\nI look forward to learning more about [their work/company] and exploring potential synergies.\n\n[Name], it is a pleasure to e-meet you. Would you be available for a brief call this week?\n\nBest regards`,
        friendly: `Hi ${firstName}!\n\nThanks so much for the intro — really appreciate it!\n\n[Name] — great to meet you! I'd love to chat and learn more about what you're working on. Want to grab a quick call this week?\n\nLooking forward to it!`,
        quick: `Hi ${firstName},\n\nThanks for the introduction! [Name], great to connect — happy to set up a quick call whenever works.\n\nBest!`
      },
      feedback: {
        formal: `Dear ${firstName},\n\nThank you for sharing your feedback. I value your input and will take your suggestions into careful consideration.\n\nI plan to incorporate the relevant changes and will share an updated version by [timeline].\n\nBest regards`,
        friendly: `Hi ${firstName}!\n\nReally appreciate the feedback — some great points in there! I'll work through the suggestions and get back to you with an update soon.\n\nThanks for taking the time!`,
        quick: `Hi ${firstName},\n\nThanks for the feedback — noted and will act on it. Updated version coming soon.\n\nThanks!`
      },
      thankyou: {
        formal: `Dear ${firstName},\n\nYou are very welcome. It was my pleasure to assist.\n\nPlease do not hesitate to reach out if there is anything else I can help with in the future.\n\nBest regards`,
        friendly: `Hi ${firstName}!\n\nHappy to help! Anytime you need anything, just give me a shout.\n\nCheers!`,
        quick: `Hi ${firstName},\n\nGlad I could help! Don't hesitate to reach out anytime.\n\nBest!`
      },
      apology: {
        formal: `Dear ${firstName},\n\nThank you for reaching out. I appreciate your understanding, and please know that no apology is necessary.\n\nLet us move forward and focus on [next steps]. I am confident we can resolve this smoothly.\n\nBest regards`,
        friendly: `Hi ${firstName}!\n\nNo worries at all — these things happen! Let's just focus on moving forward. Here's what I suggest for next steps: [next steps].\n\nAll good on my end!`,
        quick: `Hi ${firstName},\n\nNo problem at all. Let's keep moving — [next steps].\n\nThanks!`
      },
      deadline: {
        formal: `Dear ${firstName},\n\nThank you for the reminder regarding the deadline. I am aware of the timeline and am on track to deliver by the specified date.\n\nI will ensure all deliverables are completed as expected. Should any issues arise, I will communicate them immediately.\n\nBest regards`,
        friendly: `Hi ${firstName}!\n\nGot it — deadline noted! I'm on track and will have everything wrapped up in time. If anything comes up, I'll let you know ASAP.\n\nThanks for the heads up!`,
        quick: `Hi ${firstName},\n\nNoted — on track to meet the deadline. Will flag any issues early.\n\nThanks!`
      },
      proposal: {
        formal: `Dear ${firstName},\n\nThank you for sending over the proposal. I have reviewed the details and would like to discuss a few points further before we proceed.\n\nWould you be available for a brief call this week to go over the specifics?\n\nBest regards`,
        friendly: `Hi ${firstName}!\n\nThanks for the proposal — I've gone through it and it looks promising! I have a couple of questions I'd love to chat about. Free for a quick call?\n\nLooking forward to it!`,
        quick: `Hi ${firstName},\n\nProposal received — looks good overall. Let's schedule a quick call to finalize details.\n\nThanks!`
      },
      complaint: {
        formal: `Dear ${firstName},\n\nThank you for bringing this to my attention. I sincerely apologize for the inconvenience and understand your frustration.\n\nI am looking into this matter immediately and will provide a resolution by [timeline]. Your satisfaction is my top priority.\n\nBest regards`,
        friendly: `Hi ${firstName}!\n\nI'm really sorry to hear about this — I totally understand the frustration. Let me look into it right away and get back to you with a fix by [timeline].\n\nWe'll get this sorted!`,
        quick: `Hi ${firstName},\n\nSorry about this — I'm looking into it now and will have a resolution shortly.\n\nThanks for your patience!`
      },
      general: {
        formal: `Dear ${firstName},\n\nThank you for your email. I have reviewed the contents and appreciate you reaching out.\n\nI will look into this and follow up with a detailed response shortly. Please feel free to reach out if you have any additional questions.\n\nBest regards`,
        friendly: `Hi ${firstName}!\n\nThanks for reaching out! I've gone through your email and will get back to you with a proper response soon.\n\nIn the meantime, let me know if there's anything else you need!`,
        quick: `Hi ${firstName},\n\nThanks for your email — received and noted. I'll follow up shortly.\n\nBest!`
      }
    };

    const t = templates[intent] || templates.general;

    return [
      { tone: 'Professional', icon: '\uD83D\uDC54', text: t.formal },
      { tone: 'Friendly', icon: '\uD83D\uDE0A', text: t.friendly },
      { tone: 'Quick Acknowledgment', icon: '\u26A1', text: t.quick }
    ];
  }

  // ── Clipboard ───────────────────────────────────────────────────────
  function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
      const original = button.textContent;
      button.textContent = 'Copied!';
      button.classList.add('qr-ai-btn-success');
      setTimeout(() => {
        button.textContent = original;
        button.classList.remove('qr-ai-btn-success');
      }, 1500);
    }).catch(() => {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      button.textContent = 'Copied!';
      button.classList.add('qr-ai-btn-success');
      setTimeout(() => {
        button.textContent = 'Copy';
        button.classList.remove('qr-ai-btn-success');
      }, 1500);
    });
  }

  // ── Insert into Gmail Reply Box ─────────────────────────────────────
  function insertIntoReplyBox(text) {
    // First try: look for an already-open compose/reply box
    let replyBox = document.querySelector('.Am.Al.editable[role="textbox"]') ||
                   document.querySelector('[g_editable="true"]') ||
                   document.querySelector('div[aria-label="Message Body"]') ||
                   document.querySelector('.editable[contenteditable="true"]');

    if (replyBox) {
      replyBox.focus();
      replyBox.innerHTML = text.replace(/\n/g, '<br>');
      // Trigger input event so Gmail registers the change
      replyBox.dispatchEvent(new Event('input', { bubbles: true }));
      showToast('Reply inserted!');
      return;
    }

    // Second try: click the reply button, wait, then insert
    const replyBtn = document.querySelector('[data-tooltip="Reply"]') ||
                     document.querySelector('.ams.bkH');
    if (replyBtn) {
      replyBtn.click();
      setTimeout(() => {
        replyBox = document.querySelector('.Am.Al.editable[role="textbox"]') ||
                   document.querySelector('[g_editable="true"]') ||
                   document.querySelector('div[aria-label="Message Body"]') ||
                   document.querySelector('.editable[contenteditable="true"]');
        if (replyBox) {
          replyBox.focus();
          replyBox.innerHTML = text.replace(/\n/g, '<br>');
          replyBox.dispatchEvent(new Event('input', { bubbles: true }));
          showToast('Reply inserted!');
        } else {
          // Fallback: copy to clipboard
          copyToClipboard(text, null);
          showToast('Copied to clipboard — paste into your reply.');
        }
      }, 800);
    } else {
      // No reply box available at all — copy to clipboard
      navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard — open a reply and paste.');
      });
    }
  }

  // ── Toast Notification ──────────────────────────────────────────────
  function showToast(message) {
    const existing = document.getElementById('qr-ai-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'qr-ai-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('qr-ai-toast-visible'));
    setTimeout(() => {
      toast.classList.remove('qr-ai-toast-visible');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // ── Utilities ───────────────────────────────────────────────────────
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ── Message Listener (for popup communication) ──────────────────────
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'extractEmail') {
      const data = extractEmailFromPage();
      sendResponse(data);
    }
    if (message.action === 'insertReply') {
      insertIntoReplyBox(message.text);
      sendResponse({ success: true });
    }
  });

  // ── Initialize ──────────────────────────────────────────────────────
  // Wait for Gmail to fully load, then inject the FAB
  function init() {
    // Gmail can take a moment to render; retry until the main view is ready
    const checkReady = setInterval(() => {
      if (document.querySelector('.aeH, .nH, .bkK')) {
        clearInterval(checkReady);
        createFloatingButton();
      }
    }, 500);
    // Safety timeout — inject anyway after 5s
    setTimeout(() => {
      clearInterval(checkReady);
      createFloatingButton();
    }, 5000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

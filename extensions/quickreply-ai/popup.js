// QuickReply AI — Popup Script
// Detects whether the user is on Gmail and shows appropriate status

document.addEventListener('DOMContentLoaded', () => {
  const status = document.getElementById('status');
  const notice = document.getElementById('notice');
  const rateLink = document.getElementById('rate-link');

  // Check if we're on a Gmail tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    const isGmail = tab && tab.url && tab.url.includes('mail.google.com');

    if (isGmail) {
      status.querySelector('.status-text').textContent = 'Active on Gmail';
      status.style.background = '#f0fdf4';
      status.style.borderColor = '#bbf7d0';
      status.querySelector('.status-dot').style.background = '#22c55e';
      status.querySelector('.status-text').style.color = '#166534';
      notice.classList.remove('visible');
    } else {
      status.querySelector('.status-text').textContent = 'Not on Gmail';
      status.style.background = '#fef3c7';
      status.style.borderColor = '#fde68a';
      status.querySelector('.status-dot').style.background = '#f59e0b';
      status.querySelector('.status-dot').style.animation = 'none';
      status.querySelector('.status-text').style.color = '#92400e';
      notice.classList.add('visible');
    }
  });

  // Rate link — opens Chrome Web Store page (placeholder)
  rateLink.addEventListener('click', (e) => {
    e.preventDefault();
    // Replace with actual Chrome Web Store URL after publishing
    chrome.tabs.create({
      url: 'https://chrome.google.com/webstore'
    });
  });
});

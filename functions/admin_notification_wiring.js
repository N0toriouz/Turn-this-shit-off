// ============================================================
// ADD THIS BLOCK inside admin.html, alongside the other script
// content (anywhere after the existing unsubscribe wiring is fine).
// ============================================================

document.getElementById('notifySendBtn').addEventListener('click', async () => {
  const subject = document.getElementById('notifySubject').value.trim();
  const attentionTo = document.getElementById('notifyAttn').value.trim();
  const messageBody = document.getElementById('notifyBody2').value.trim();
  const btn = document.getElementById('notifySendBtn');
  const statusMsg = document.getElementById('notifyStatusMsg');

  statusMsg.classList.remove('show', 'success', 'error');

  if (!subject || !messageBody) {
    statusMsg.textContent = 'Subject and message body are required.';
    statusMsg.classList.add('show', 'error');
    return;
  }

  const confirmed = confirm(`Send this notification to all active subscribers?\n\nSubject: ${subject}`);
  if (!confirmed) return;

  btn.disabled = true;
  btn.textContent = 'Sending...';

  try {
    const response = await fetch('/admin-send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, attentionTo, messageBody })
    });
    const result = await response.json();

    btn.disabled = false;
    btn.textContent = 'Save & Send Notification';

    statusMsg.textContent = result.message;
    statusMsg.classList.add('show', result.success ? 'success' : 'error');

    if (result.success) {
      document.getElementById('notifySubject').value = '';
      document.getElementById('notifyAttn').value = '';
      document.getElementById('notifyBody2').value = '';
    }

  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Save & Send Notification';
    statusMsg.textContent = 'Network error. No emails were sent.';
    statusMsg.classList.add('show', 'error');
  }
});

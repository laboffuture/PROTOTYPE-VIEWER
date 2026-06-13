// Helpers for sharing a batch's vote link.

export function voteLink(sessionId, origin) {
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/vote/${sessionId}`;
}

// wa.me deep link with the message + link prefilled, so one tap opens WhatsApp
// ready to send. Works on phone and desktop WhatsApp alike.
export function whatsappShareUrl(link, message = 'Rate our 3D prototypes and share your feedback:') {
  return `https://wa.me/?text=${encodeURIComponent(`${message} ${link}`)}`;
}

// mailto: link with the subject + body prefilled, opening the user's mail app.
export function emailShareUrl(
  link,
  subject = 'Rate our 3D prototypes',
  body = 'Open this link to rate our 3D prototypes and share your feedback:'
) {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`${body} ${link}`)}`;
}

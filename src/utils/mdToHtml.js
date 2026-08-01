/**
 * 📝 Markdown → Telegram-HTML converter for user-facing messages.
 *
 * Admins write messages with **bold**, *italic* and `code` markers. Telegram
 * broadcasts are sent with parse_mode: 'HTML', so the raw markers must be
 * converted server-side — otherwise users literally see `**PANEL RESELLER**`.
 *
 * Order of operations matters: HTML-escape first, then apply the markers, so
 * any <script>/<b> the admin typed is neutralized before conversion.
 */
const escHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const mdToHtml = (text = '') =>
  escHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>')
    .replace(/`([^`\n]+)`/g, '<code>$1</code>');

/** Strip all markdown markers without keeping any HTML (plain-text context). */
const mdToPlain = (text = '') =>
  String(text)
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1$2')
    .replace(/`([^`\n]+)`/g, '$1');

module.exports = { mdToHtml, mdToPlain, escHtml };

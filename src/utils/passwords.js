const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;

const normalizeAccessUsername = (value) => String(value || '').trim().toLowerCase();

const validateAccessUsername = (value) => /^[a-z0-9][a-z0-9._-]{3,31}$/.test(normalizeAccessUsername(value));

const validatePassword = (value) => {
  const password = String(value || '');
  return password.length >= 10 && password.length <= 128;
};

const hashPassword = async (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scrypt(String(password), salt, KEY_LENGTH);
  return `scrypt$${salt}$${derived.toString('hex')}`;
};

const verifyPassword = async (password, storedHash) => {
  try {
    const [algorithm, salt, expectedHex] = String(storedHash || '').split('$');
    if (algorithm !== 'scrypt' || !salt || !expectedHex) return false;
    const expected = Buffer.from(expectedHex, 'hex');
    const actual = await scrypt(String(password), salt, expected.length);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch (_) {
    return false;
  }
};

const generatePassword = () => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%';
  const all = upper + lower + digits + symbols;
  const pick = (chars) => chars[crypto.randomInt(chars.length)];
  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  while (chars.length < 16) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
};

module.exports = {
  normalizeAccessUsername,
  validateAccessUsername,
  validatePassword,
  hashPassword,
  verifyPassword,
  generatePassword
};

import crypto from 'node:crypto';

// Transliteration focused on Arabic input -> ASCII/Latin output.
// Goal: stable, URL-safe slugs while still allowing Arabic names.
const ARABIC_CHAR_MAP = {
  // Alef variants
  'ا': 'a',
  'أ': 'a',
  'إ': 'i',
  'آ': 'aa',
  'ٱ': 'a',

  // Hamza / carriers
  'ء': '',
  'ؤ': 'w',
  'ئ': 'y',

  // Common letters
  'ب': 'b',
  'ت': 't',
  'ث': 'th',
  'ج': 'j',
  'ح': 'h',
  'خ': 'kh',
  'د': 'd',
  'ذ': 'dh',
  'ر': 'r',
  'ز': 'z',
  'س': 's',
  'ش': 'sh',
  'ص': 's',
  'ض': 'd',
  'ط': 't',
  'ظ': 'z',
  'ع': 'a',
  'غ': 'gh',
  'ف': 'f',
  'ق': 'q',
  'ك': 'k',
  'ل': 'l',
  'م': 'm',
  'ن': 'n',
  'ه': 'h',
  'و': 'w',
  'ي': 'y',

  // Ta marbuta / alef maqsura
  'ة': 'h',
  'ى': 'a',

  // Persian/Urdu letters (often used on Arabic keyboards)
  'پ': 'p',
  'چ': 'ch',
  'ژ': 'zh',
  'گ': 'g',
};

const ARABIC_INDIC_DIGIT_MAP = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
  // Eastern Arabic-Indic (Persian)
  '۰': '0',
  '۱': '1',
  '۲': '2',
  '۳': '3',
  '۴': '4',
  '۵': '5',
  '۶': '6',
  '۷': '7',
  '۸': '8',
  '۹': '9',
};

function stripLatinDiacritics(input) {
  // Turns "Café" -> "Cafe"
  return input.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function stripArabicMarks(input) {
  // Removes tashkeel, tatweel, and other combining marks commonly found in Arabic text.
  return input.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '');
}

function transliterateArabicToAscii(input) {
  // Preserve non-Arabic characters; transliterate only known Arabic letters/digits.
  return Array.from(input, (ch) => {
    if (ARABIC_INDIC_DIGIT_MAP[ch]) return ARABIC_INDIC_DIGIT_MAP[ch];
    if (ARABIC_CHAR_MAP[ch] !== undefined) return ARABIC_CHAR_MAP[ch];
    return ch;
  }).join('');
}

function slugifyAscii(input) {
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function fallbackSlug(prefix = 'cat') {
  const short = crypto.randomUUID().split('-')[0]; // 8 chars
  return `${prefix}-${short}`;
}

/**
 * Generate a URL-safe ASCII slug for expense categories, allowing Arabic names.
 * - Arabic is transliterated to Latin/ASCII.
 * - If slug ends up empty, uses a random fallback.
 */
export function makeExpenseCategorySlug(name, { maxLength = 140, fallbackPrefix = 'cat' } = {}) {
  const raw = String(name ?? '').trim();
  const normalized = stripArabicMarks(stripLatinDiacritics(raw));
  const transliterated = transliterateArabicToAscii(normalized);

  let slug = slugifyAscii(transliterated);
  if (maxLength && slug.length > maxLength) {
    slug = slug.slice(0, maxLength).replace(/-+$/g, '').replace(/^-+/g, '');
  }

  if (!slug) slug = fallbackSlug(fallbackPrefix);
  return slug;
}


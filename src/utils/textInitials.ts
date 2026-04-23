const CHINESE_PINYIN_INITIAL_BOUNDARIES = [
  '啊', '芭', '擦', '搭', '蛾', '发', '噶', '哈', '机', '喀', '垃',
  '妈', '拿', '哦', '啪', '期', '然', '撒', '塌', '挖', '昔', '压', '匝',
] as const;
const CHINESE_PINYIN_INITIAL_LETTERS = 'abcdefghjklmnopqrstwxyz' as const;
const zhPinyinCollator = new Intl.Collator('zh-CN-u-co-pinyin');

function isHanCharacter(ch: string): boolean {
  const codePoint = ch.codePointAt(0);
  if (codePoint === undefined) return false;
  return (
    (codePoint >= 0x3400 && codePoint <= 0x9fff) ||
    (codePoint >= 0xf900 && codePoint <= 0xfaff)
  );
}

export function getChinesePinyinInitial(ch: string): string {
  for (let i = CHINESE_PINYIN_INITIAL_BOUNDARIES.length - 1; i >= 0; i -= 1) {
    if (zhPinyinCollator.compare(ch, CHINESE_PINYIN_INITIAL_BOUNDARIES[i]) >= 0) {
      return CHINESE_PINYIN_INITIAL_LETTERS[i];
    }
  }
  return '';
}

export function resolveLeadingAlphabetIndex(value: string): string | null {
  if (!value) return null;

  for (const ch of value) {
    if (/[a-z]/i.test(ch)) return ch.toUpperCase();
    if (/[0-9]/.test(ch)) return '#';

    if (isHanCharacter(ch)) {
      const chineseInitial = getChinesePinyinInitial(ch);
      return chineseInitial ? chineseInitial.toUpperCase() : '#';
    }

    if (/\p{L}|\p{N}/u.test(ch)) return '#';
  }

  return null;
}

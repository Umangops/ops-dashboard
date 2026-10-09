const MOBILE_KEYWORDS = ['mobile', 'phone', 'contact'];
const TEXT2_KEYWORDS  = ['address', 'city', 'state'];

function norm(s: string): string {
  return s.toLowerCase().replace(/[\s_\-]+/g, '');
}

export function getMaskType(
  colName: string,
  keywords: string[],
): 'mobile' | 'text2' | 'email' | null {
  const n = norm(colName);
  for (const kw of keywords) {
    const nkw = norm(kw);
    if (nkw === 'email') {
      if (n.includes('email')) return 'email';
    } else if (MOBILE_KEYWORDS.includes(nkw)) {
      if (n.includes(nkw)) return 'mobile';
    } else if (nkw === 'state') {
      // whole-word match; must NOT be "status"
      if (/\bstate\b/i.test(colName) && !/status/i.test(colName)) return 'text2';
    } else if (nkw === 'city') {
      if (/\bcity\b/i.test(colName)) return 'text2';
    } else if (TEXT2_KEYWORDS.includes(nkw)) {
      if (n.includes(nkw)) return 'text2';
    }
  }
  return null;
}

export function maskStr(val: string, type: 'mobile' | 'text2' | 'email'): string {
  if (!val) return val;
  if (type === 'email') {
    const at = val.indexOf('@');
    if (at > 0) {
      const local = val.slice(0, at);
      const domain = val.slice(at); // includes '@'
      if (local.length <= 4) return '*'.repeat(local.length) + domain;
      return local.slice(0, 2) + '*'.repeat(local.length - 2) + domain;
    }
    // no @ — fall through to text2
  }
  if (val.length <= 4) return '*'.repeat(val.length);
  if (type === 'mobile') {
    return val.slice(0, 2) + '*'.repeat(val.length - 4) + val.slice(-2);
  }
  return val.slice(0, 2) + '*'.repeat(val.length - 2);
}

// Indian numbering system: ones, tens, hundred, thousand, lakh, crore.
// Beyond crore the system repeats: 1,00,00,00,000 -> "One Hundred Crore",
// 10^12 -> "One Lakh Crore". Integers are handled as BigInt so precision never breaks.

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
]
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

export const MAX_DIGITS = 17 // 99,99,99,99,99,99,99,999 – ninety-nine lakh crore crore

function twoDigits(n) {
  if (n < 20) return ONES[n]
  const t = TENS[Math.floor(n / 10)]
  const o = ONES[n % 10]
  return o ? `${t} ${o}` : t
}

function threeDigits(n) {
  const h = Math.floor(n / 100)
  const r = n % 100
  const parts = []
  if (h) parts.push(`${ONES[h]} Hundred`)
  if (r) parts.push(twoDigits(r))
  return parts.join(' ')
}

/** Words for a non-negative BigInt in the Indian system. 0n -> "Zero". */
export function integerToWords(n) {
  if (typeof n !== 'bigint') n = BigInt(n)
  if (n < 0n) throw new RangeError('integerToWords expects a non-negative number')
  if (n === 0n) return 'Zero'

  const parts = []
  const crore = n / 10000000n
  let rest = n % 10000000n
  if (crore > 0n) parts.push(`${integerToWords(crore)} Crore`)

  const lakh = Number(rest / 100000n)
  rest %= 100000n
  const thousand = Number(rest / 1000n)
  const hundreds = Number(rest % 1000n)

  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`)
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`)
  if (hundreds) parts.push(threeDigits(hundreds))
  return parts.join(' ')
}

/**
 * Parse free-form input such as "1,00,000", "₹ 1250.50", "Rs 12,500/-".
 * Returns { ok: true, rupees: bigint, paise: number, negative, normalized }
 * or { ok: false, error }.
 */
export function parseAmount(raw) {
  let s = String(raw ?? '').trim()
  if (!s) return { ok: false, error: '' }

  s = s
    .replace(/^(?:rs\.?|inr|₹)\s*/i, '')
    .replace(/\/-\s*$/, '')
    .replace(/,/g, '')
    .replace(/\s+/g, '')

  let negative = false
  if (s.startsWith('-')) {
    negative = true
    s = s.slice(1)
  }

  const m = /^(\d*)(?:\.(\d*))?$/.exec(s)
  if (!m || (m[1] === '' && !m[2])) {
    return { ok: false, error: 'Use digits only, with an optional decimal point for paise.' }
  }

  const intPart = (m[1] || '0').replace(/^0+(?=\d)/, '')
  const fracPart = m[2] || ''

  if (intPart.length > MAX_DIGITS) {
    return { ok: false, error: `That is more than ${MAX_DIGITS} digits, which is beyond ninety-nine lakh crore crore.` }
  }

  // Round paise to two places, carrying into rupees when it rounds up to 100.
  let rupees = BigInt(intPart)
  let paise = 0
  if (fracPart) {
    const padded = (fracPart + '000').slice(0, 3)
    paise = Math.round(Number(padded) / 10)
    if (paise === 100) {
      paise = 0
      rupees += 1n
    }
  }

  if (rupees === 0n && paise === 0) negative = false

  return {
    ok: true,
    rupees,
    paise,
    negative,
    normalized: (negative ? '-' : '') + rupees.toString() + (paise ? '.' + String(paise).padStart(2, '0') : ''),
  }
}

/** Indian digit grouping: 1234567 -> "12,34,567". Accepts a BigInt or digit string. */
export function groupIndian(n) {
  const s = n.toString()
  if (s.length <= 3) return s
  const last3 = s.slice(-3)
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')
  return `${rest},${last3}`
}

/** Compact Indian short form: 150000 -> "1.5 L", 25000000 -> "2.5 Cr". Null below one thousand. */
export function shortForm(rupees, paise = 0) {
  const value = Number(rupees) + paise / 100
  if (!Number.isFinite(value) || value < 1000) return null
  const fmt = (v) => {
    const r = Math.round(v * 100) / 100
    return r.toLocaleString('en-IN', { maximumFractionDigits: 2 })
  }
  if (value >= 1e7) return `${fmt(value / 1e7)} Cr`
  if (value >= 1e5) return `${fmt(value / 1e5)} L`
  return `${fmt(value / 1e3)} K`
}

export const DEFAULT_OPTIONS = {
  prefix: 'none',      // 'none' | 'rupees' | 'inr' | 'symbol'
  suffix: true,        // append "only"
  letterCase: 'title', // 'title' | 'upper' | 'sentence'
}

const PREFIX_TEXT = { none: '', rupees: 'Rupees', inr: 'INR', symbol: '₹' }

function applyCase(text, letterCase) {
  if (letterCase === 'upper') return text.toUpperCase()
  if (letterCase === 'sentence') {
    const lower = text.toLowerCase()
    return lower.charAt(0).toUpperCase() + lower.slice(1)
  }
  return text
}

/**
 * Full formatted sentence for an amount, e.g.
 * amountToWords({rupees: 1250n, paise: 75}) -> "One Thousand Two Hundred Fifty and Seventy Five Paise only"
 */
export function amountToWords({ rupees, paise = 0, negative = false }, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const parts = []

  if (negative) parts.push('Minus')

  if (rupees > 0n || paise === 0) parts.push(integerToWords(rupees))
  if (paise > 0) {
    if (rupees > 0n) parts.push('and')
    parts.push(`${twoDigits(paise)} Paise`)
  }

  let body = parts.join(' ')
  const prefix = PREFIX_TEXT[opts.prefix] || ''
  if (prefix) body = `${prefix} ${body}`
  if (opts.suffix) body = `${body} only`
  return applyCase(body, opts.letterCase)
}

/** Convenience: raw input string -> words, or throws on invalid input. */
export function convert(raw, options) {
  const parsed = parseAmount(raw)
  if (!parsed.ok) throw new Error(parsed.error || 'Empty input')
  return amountToWords(parsed, options)
}

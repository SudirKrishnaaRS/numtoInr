import { useEffect, useMemo, useRef, useState } from 'react'
import {
  parseAmount, amountToWords, groupIndian, shortForm, DEFAULT_OPTIONS, MAX_DIGITS,
} from './numberToWords.js'
import { useLocalStorage } from './useLocalStorage.js'

const HISTORY_LIMIT = 30

const PREFIXES = [
  { value: 'none', label: 'None' },
  { value: 'rupees', label: 'Rupees' },
  { value: 'inr', label: 'INR' },
  { value: 'symbol', label: '₹' },
]
const CASES = [
  { value: 'title', label: 'Title Case' },
  { value: 'upper', label: 'UPPERCASE' },
  { value: 'sentence', label: 'Sentence case' },
]
const EXAMPLES = ['1000', '1,50,000', '12,34,567.50', '2,50,00,000']

function initialInput() {
  try {
    const n = new URLSearchParams(window.location.search).get('n')
    return n ?? ''
  } catch {
    return ''
  }
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for older browsers / non-secure contexts
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    let ok = false
    try { ok = document.execCommand('copy') } catch { ok = false }
    document.body.removeChild(ta)
    return ok
  }
}

export default function App() {
  const [input, setInput] = useState(initialInput)
  const [options, setOptions] = useLocalStorage('numtoinr:options', DEFAULT_OPTIONS)
  const [history, setHistory] = useLocalStorage('numtoinr:history', [])
  const [copied, setCopied] = useState(null) // 'words' | 'link' | null
  const inputRef = useRef(null)
  const copyTimer = useRef(null)

  const parsed = useMemo(() => parseAmount(input), [input])
  const words = parsed.ok ? amountToWords(parsed, options) : ''
  const grouped = parsed.ok
    ? (parsed.negative ? '-' : '') + groupIndian(parsed.rupees) + (parsed.paise ? '.' + String(parsed.paise).padStart(2, '0') : '')
    : ''
  const short = parsed.ok && !parsed.negative ? shortForm(parsed.rupees, parsed.paise) : null

  // Keep the URL shareable without adding history entries on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const url = new URL(window.location.href)
        if (parsed.ok) url.searchParams.set('n', parsed.normalized)
        else url.searchParams.delete('n')
        window.history.replaceState(null, '', url)
      } catch { /* ignore */ }
    }, 300)
    return () => clearTimeout(t)
  }, [parsed.ok, parsed.normalized])

  useEffect(() => () => clearTimeout(copyTimer.current), [])

  function flash(kind) {
    setCopied(kind)
    clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopied(null), 1600)
  }

  function remember() {
    if (!parsed.ok) return
    setHistory((h) => {
      const rest = h.filter((e) => e.amount !== parsed.normalized)
      return [{ amount: parsed.normalized, words, at: Date.now() }, ...rest].slice(0, HISTORY_LIMIT)
    })
  }

  async function copyWords() {
    if (!words) return
    if (await copyText(words)) {
      flash('words')
      remember()
    }
  }

  async function copyLink() {
    if (!parsed.ok) return
    if (await copyText(window.location.href)) flash('link')
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      copyWords()
    }
  }

  function setOpt(patch) {
    setOptions((o) => ({ ...o, ...patch }))
  }

  const digitCount = parsed.ok ? parsed.rupees.toString().length : 0

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Top bar */}
      <nav className="mx-auto flex w-full max-w-[1000px] items-center justify-between px-5 py-5 sm:px-6">
        <a href="./" className="font-display text-lg font-semibold tracking-tight text-ink underline decoration-ink/60 underline-offset-4">
          rupees
        </a>
        <div className="flex items-center gap-5 text-sm text-ink-soft">
          <a href="#recent" className="inline-flex items-center gap-1.5 hover:text-ink">
            <ClockIcon /> Recent
          </a>
          <a href="#options" className="inline-flex items-center gap-1.5 hover:text-ink">
            <SlidersIcon /> Options
          </a>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-[1000px] flex-1 px-5 sm:px-6">
        {/* Hero */}
        <section className="pt-12 pb-10 text-center sm:pt-20 sm:pb-14">
          <h1 className="font-display text-[3.25rem] font-bold leading-[0.95] tracking-[-0.02em] text-ink sm:text-[5.5rem]" style={{ textWrap: 'balance' }}>
            Rupees <span className="relative inline-block text-violet-500">in words<span aria-hidden="true" className="blob absolute -right-4 -top-2 -z-10 size-9 rounded-full rounded-tl-none bg-violet-100 sm:-right-6 sm:-top-3 sm:size-14" /></span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-soft sm:text-xl" style={{ textWrap: 'pretty' }}>
            Type an amount and get it spelled out in <strong className="font-semibold text-ink">lakh</strong> and <strong className="font-semibold text-ink">crore</strong>, ready for a cheque or invoice. Nothing leaves your browser.
          </p>
        </section>

        {/* Converter card */}
        <section className="rounded-card border border-violet-200/70 bg-ground p-5 shadow-[0_20px_60px_-30px_rgba(100,46,255,0.25)] sm:p-8">
          <label htmlFor="amount" className="mb-2 block text-sm font-medium text-ink-soft">
            Amount in rupees
          </label>
          <div className="flex items-center gap-3 rounded-2xl border border-line-strong bg-ground-soft px-4 transition focus-within:border-violet-500 focus-within:bg-ground focus-within:ring-4 focus-within:ring-violet-500/15">
            <span aria-hidden="true" className="font-display text-2xl font-medium text-ink-faint">₹</span>
            <input
              ref={inputRef}
              id="amount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              autoFocus
              spellCheck={false}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="1,00,000"
              aria-describedby="amount-help"
              aria-invalid={!!(input && !parsed.ok)}
              className="tabular w-full min-w-0 bg-transparent py-3.5 font-display text-3xl font-medium text-ink outline-none placeholder:text-ink-faint/70 sm:text-4xl"
            />
            {input && (
              <button
                type="button"
                onClick={() => { setInput(''); inputRef.current?.focus() }}
                aria-label="Clear amount"
                className="rounded-pill border border-line px-3 py-1 text-xs font-medium text-ink-soft hover:border-line-strong hover:text-ink focus-visible:outline-2 focus-visible:outline-violet-500"
              >
                Clear
              </button>
            )}
          </div>
          <div id="amount-help" className="mt-2.5 flex min-h-6 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {input && !parsed.ok && parsed.error && (
              <span role="alert" className="text-red-600">{parsed.error}</span>
            )}
            {parsed.ok && (
              <>
                <span className="tabular font-medium text-ink">{grouped}</span>
                {short && (
                  <span className="inline-flex items-center gap-1.5 rounded-pill bg-mint-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-mint-700">
                    <span className="size-1.5 rounded-full bg-mint-700" /> ₹{short}
                  </span>
                )}
                <span className="text-xs text-ink-faint">{digitCount} of {MAX_DIGITS} digits</span>
              </>
            )}
            {!input && (
              <span className="text-ink-faint">
                Try{' '}
                {EXAMPLES.map((ex, i) => (
                  <span key={ex}>
                    <button type="button" onClick={() => setInput(ex)} className="tabular font-medium text-violet-500 underline decoration-violet-200 underline-offset-4 hover:decoration-violet-500">
                      {ex}
                    </button>
                    {i < EXAMPLES.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </span>
            )}
          </div>

          {/* Result */}
          <div className="mt-6 rounded-2xl bg-ground-soft p-5 sm:p-7">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">In words</p>
            <p
              key={words}
              aria-live="polite"
              className={`rise font-display text-2xl font-medium leading-snug sm:text-[2rem] ${words ? 'text-ink' : 'text-ink-faint'}`}
              style={{ textWrap: 'pretty', overflowWrap: 'anywhere' }}
            >
              {words || 'Your amount in words appears here.'}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={copyWords}
                disabled={!words}
                className="inline-flex items-center gap-2 rounded-pill bg-violet-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CopyIcon />
                {copied === 'words' ? 'Copied!' : 'Copy words'}
              </button>
              <button
                type="button"
                onClick={copyLink}
                disabled={!words}
                className="inline-flex items-center gap-2 rounded-pill border border-line-strong bg-ground px-6 py-3 text-sm font-medium text-ink transition hover:border-ink hover:bg-ground-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <LinkIcon />
                {copied === 'link' ? 'Link copied' : 'Copy link'}
              </button>
              <span className="ml-auto text-xs text-ink-faint">Press Enter to copy</span>
            </div>
          </div>
        </section>

        {/* Options */}
        <section id="options" className="mt-6 scroll-mt-6 rounded-card border border-line bg-ground p-5 sm:p-8">
          <SectionHeading icon={<SlidersIcon />}>Options</SectionHeading>
          <div className="mt-5 grid gap-6 sm:grid-cols-3">
            <Field label="Prefix">
              <Segmented name="prefix" value={options.prefix} onChange={(v) => setOpt({ prefix: v })} items={PREFIXES} />
            </Field>
            <Field label="Letter case">
              <Segmented name="case" value={options.letterCase} onChange={(v) => setOpt({ letterCase: v })} items={CASES} />
            </Field>
            <Field label="Ending">
              <label className="inline-flex cursor-pointer items-center gap-2.5 self-start rounded-pill border border-line px-4 py-2 text-sm text-ink hover:border-line-strong">
                <input
                  id="suffix"
                  type="checkbox"
                  checked={options.suffix}
                  onChange={(e) => setOpt({ suffix: e.target.checked })}
                  className="size-4 accent-violet-500"
                />
                Append “only”
              </label>
            </Field>
          </div>
        </section>

        {/* History */}
        <section id="recent" className="mt-6 scroll-mt-6 rounded-card border border-line bg-ground p-5 sm:p-8">
          <div className="flex items-center justify-between">
            <SectionHeading icon={<ClockIcon />}>Recent</SectionHeading>
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => setHistory([])}
                className="rounded-pill px-3 py-1 text-xs font-medium text-ink-soft hover:bg-ground-soft hover:text-red-600 focus-visible:outline-2 focus-visible:outline-violet-500"
              >
                Clear all
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <p className="mt-4 text-sm text-ink-faint">
              Amounts you copy are kept here, in this browser only.
            </p>
          ) : (
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {history.map((e) => (
                <li key={e.amount} className="group relative">
                  <button
                    type="button"
                    onClick={() => { setInput(e.amount); inputRef.current?.focus(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    className="block w-full rounded-2xl border border-line bg-ground p-4 pr-10 text-left transition hover:border-violet-200 hover:shadow-[0_12px_30px_-18px_rgba(100,46,255,0.35)] focus-visible:outline-2 focus-visible:outline-violet-500"
                    title="Load this amount"
                  >
                    <span className="tabular block font-display text-lg font-semibold text-ink">
                      ₹{groupIndianDisplay(e.amount)}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-ink-soft">{e.words}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistory((h) => h.filter((x) => x.amount !== e.amount))}
                    aria-label={`Remove ${e.amount} from history`}
                    className="absolute right-3 top-3 rounded-full p-1 text-ink-faint opacity-0 transition hover:bg-ground-soft hover:text-red-600 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-violet-500 group-hover:opacity-100"
                  >
                    <XIcon />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="mx-auto mt-16 w-full max-w-[1000px] px-5 pb-10 text-center text-sm text-ink-faint sm:px-6">
        Indian numbering system: hundred, thousand, lakh, crore. Paise rounded to two places. Runs entirely in your browser.
      </footer>
    </div>
  )
}

function groupIndianDisplay(normalized) {
  const neg = normalized.startsWith('-')
  const [int, frac] = (neg ? normalized.slice(1) : normalized).split('.')
  return (neg ? '-' : '') + groupIndian(int) + (frac ? '.' + frac : '')
}

function SectionHeading({ icon, children }) {
  return (
    <h2 className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
      <span className="text-ink-faint">{icon}</span>
      {children}
    </h2>
  )
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
    </div>
  )
}

function Segmented({ name, value, onChange, items }) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-1.5">
      {items.map((it) => {
        const active = it.value === value
        return (
          <button
            key={it.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(it.value)}
            className={`rounded-pill border px-3.5 py-1.5 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 ${
              active
                ? 'border-ink bg-ink font-medium text-white'
                : 'border-line bg-ground text-ink-soft hover:border-line-strong hover:text-ink'
            }`}
          >
            {it.label}
          </button>
        )
      })}
    </div>
  )
}

const iconProps = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }

function CopyIcon() {
  return (
    <svg {...iconProps}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}
function LinkIcon() {
  return (
    <svg {...iconProps}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}
function ClockIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}
function SlidersIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
    </svg>
  )
}
function XIcon() {
  return (
    <svg {...iconProps} width={14} height={14}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

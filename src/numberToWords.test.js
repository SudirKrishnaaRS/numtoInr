import { describe, it, expect } from 'vitest'
import { integerToWords, parseAmount, groupIndian, shortForm, amountToWords, convert } from './numberToWords.js'

describe('integerToWords', () => {
  const cases = [
    [0n, 'Zero'],
    [1n, 'One'],
    [10n, 'Ten'],
    [19n, 'Nineteen'],
    [20n, 'Twenty'],
    [21n, 'Twenty One'],
    [99n, 'Ninety Nine'],
    [100n, 'One Hundred'],
    [101n, 'One Hundred One'],
    [110n, 'One Hundred Ten'],
    [999n, 'Nine Hundred Ninety Nine'],
    [1000n, 'One Thousand'],
    [1001n, 'One Thousand One'],
    [10000n, 'Ten Thousand'],
    [12345n, 'Twelve Thousand Three Hundred Forty Five'],
    [99999n, 'Ninety Nine Thousand Nine Hundred Ninety Nine'],
    [100000n, 'One Lakh'],
    [100001n, 'One Lakh One'],
    [1000000n, 'Ten Lakh'],
    [1234567n, 'Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven'],
    [9999999n, 'Ninety Nine Lakh Ninety Nine Thousand Nine Hundred Ninety Nine'],
    [10000000n, 'One Crore'],
    [10000001n, 'One Crore One'],
    [100000000n, 'Ten Crore'],
    [1000000000n, 'One Hundred Crore'],
    [10000000000n, 'One Thousand Crore'],
    [100000000000n, 'Ten Thousand Crore'],
    [1000000000000n, 'One Lakh Crore'],
    [100000000000000n, 'One Crore Crore'],
  ]
  for (const [n, words] of cases) {
    it(`${n} -> ${words}`, () => expect(integerToWords(n)).toBe(words))
  }
  it('123456789012345 (crore of crore)', () => {
    // 1,23,45,678 crore + 90,12,345
    expect(integerToWords(123456789012345n)).toBe(
      'One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight Crore Ninety Lakh Twelve Thousand Three Hundred Forty Five',
    )
  })
  it('accepts numbers and strings', () => {
    expect(integerToWords(1000)).toBe('One Thousand')
    expect(integerToWords('1000')).toBe('One Thousand')
  })
  it('rejects negatives', () => {
    expect(() => integerToWords(-1n)).toThrow(RangeError)
  })
})

describe('parseAmount', () => {
  it('strips commas, prefixes and /-', () => {
    expect(parseAmount('1,00,000').normalized).toBe('100000')
    expect(parseAmount('₹ 1,250.50').normalized).toBe('1250.50')
    expect(parseAmount('Rs. 12,500/-').normalized).toBe('12500')
    expect(parseAmount('INR 5').normalized).toBe('5')
  })
  it('handles leading zeros and bare decimals', () => {
    expect(parseAmount('007').normalized).toBe('7')
    expect(parseAmount('.5').normalized).toBe('0.50')
    expect(parseAmount('5.').normalized).toBe('5')
    expect(parseAmount('0').normalized).toBe('0')
  })
  it('rounds paise to two places with carry', () => {
    expect(parseAmount('1.005').normalized).toBe('1.01')
    expect(parseAmount('1.999').normalized).toBe('2')
    expect(parseAmount('0.994').normalized).toBe('0.99')
  })
  it('keeps big integers exact', () => {
    expect(parseAmount('12345678901234567').rupees).toBe(12345678901234567n)
  })
  it('rejects junk and overflow', () => {
    expect(parseAmount('abc').ok).toBe(false)
    expect(parseAmount('1.2.3').ok).toBe(false)
    expect(parseAmount('1e5').ok).toBe(false)
    expect(parseAmount('1'.repeat(18)).ok).toBe(false)
    expect(parseAmount('').ok).toBe(false)
    expect(parseAmount('-').ok).toBe(false)
    expect(parseAmount('.').ok).toBe(false)
  })
  it('negative zero is not negative', () => {
    expect(parseAmount('-0').negative).toBe(false)
  })
})

describe('groupIndian', () => {
  it.each([
    ['0', '0'],
    ['999', '999'],
    ['1000', '1,000'],
    ['12345', '12,345'],
    ['100000', '1,00,000'],
    ['1234567', '12,34,567'],
    ['10000000', '1,00,00,000'],
    ['123456789012', '1,23,45,67,89,012'],
  ])('%s -> %s', (input, out) => expect(groupIndian(input)).toBe(out))
})

describe('shortForm', () => {
  it('formats lakh and crore', () => {
    expect(shortForm(999n)).toBeNull()
    expect(shortForm(1000n)).toBe('1 K')
    expect(shortForm(150000n)).toBe('1.5 L')
    expect(shortForm(25000000n)).toBe('2.5 Cr')
    expect(shortForm(12345678n)).toBe('1.23 Cr')
  })
})

describe('amountToWords', () => {
  it('matches the requested default: 1000 -> "One Thousand only"', () => {
    expect(convert('1000')).toBe('One Thousand only')
  })
  it('handles paise', () => {
    expect(convert('1250.75')).toBe('One Thousand Two Hundred Fifty and Seventy Five Paise only')
    expect(convert('0.50')).toBe('Fifty Paise only')
    expect(convert('0')).toBe('Zero only')
  })
  it('applies prefix, suffix and case', () => {
    expect(convert('1000', { prefix: 'rupees' })).toBe('Rupees One Thousand only')
    expect(convert('1000', { prefix: 'inr', suffix: false })).toBe('INR One Thousand')
    expect(convert('1000', { prefix: 'symbol' })).toBe('₹ One Thousand only')
    expect(convert('1000', { letterCase: 'upper' })).toBe('ONE THOUSAND ONLY')
    expect(convert('1000', { letterCase: 'sentence', prefix: 'rupees' })).toBe('Rupees one thousand only')
  })
  it('handles negatives', () => {
    expect(convert('-500')).toBe('Minus Five Hundred only')
  })
  it('accepts parsed objects', () => {
    expect(amountToWords({ rupees: 100000n, paise: 0 })).toBe('One Lakh only')
  })
})

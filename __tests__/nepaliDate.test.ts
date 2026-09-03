import {
  adYmdToBs,
  formatBsHeaderDate,
  formatDeviceDateAsBs,
  nepalWallClock,
  toDevanagariDigits,
} from '../src/format/nepaliDate';

describe('adYmdToBs', () => {
  it('anchors BS 2000-01-01 to AD 1943-04-14', () => {
    expect(adYmdToBs(1943, 4, 14)).toEqual({year: 2000, month: 1, day: 1});
  });

  it('matches the live site civil date for early September 2026', () => {
    expect(adYmdToBs(2026, 9, 3)).toEqual({year: 2083, month: 5, day: 18});
  });
});

describe('formatBsHeaderDate', () => {
  it('matches baahrakhari.com header copy (weekday, month day, year)', () => {
    expect(formatBsHeaderDate({year: 2083, month: 5, day: 18}, 4)).toBe(
      'बिहीबार, भदौ १८, २०८३',
    );
  });
});

describe('formatDeviceDateAsBs', () => {
  it('uses Nepal Time so a US evening still lands on the Nepal civil day', () => {
    /** 2026-09-02 20:00 EDT = 2026-09-03 05:45 NPT (UTC+5:45). */
    const edtEvening = new Date('2026-09-03T00:00:00.000Z');
    expect(nepalWallClock(edtEvening)).toMatchObject({
      year: 2026,
      month: 9,
      day: 3,
    });
    expect(formatDeviceDateAsBs(edtEvening)).toBe('बिहीबार, भदौ १८, २०८३');
  });

  it('returns null outside the 2000–2090 BS table', () => {
    expect(formatDeviceDateAsBs(new Date(Date.UTC(1900, 0, 1)))).toBeNull();
  });
});

describe('toDevanagariDigits', () => {
  it('converts a year', () => {
    expect(toDevanagariDigits(2083)).toBe('२०८३');
  });
});

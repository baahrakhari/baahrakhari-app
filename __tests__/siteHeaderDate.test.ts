import {parseSiteHeaderDate} from '../src/scrape/siteHeaderDate';

const LIVE_SNIPPET = `
<script type="text/javascript">
    [...document.getElementsByClassName('current-date')].forEach(res => {
        res.innerHTML = 'बिहीबार, भदौ १८, २०८३';
    });
</script>
<div class="date-time current-date"></div>
`;

describe('parseSiteHeaderDate', () => {
  it('reads the JS-injected current-date string from the homepage', () => {
    expect(parseSiteHeaderDate(LIVE_SNIPPET)).toBe('बिहीबार, भदौ १८, २०८३');
  });

  it('falls back to a populated current-date div', () => {
    const html =
      '<div class="date-time current-date">बुधबार, भदौ १७, २०८३</div>';
    expect(parseSiteHeaderDate(html)).toBe('बुधबार, भदौ १७, २०८३');
  });

  it('returns null when the homepage has no date', () => {
    expect(parseSiteHeaderDate('<html><body>no date</body></html>')).toBeNull();
  });
});

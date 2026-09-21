import {
  codePointToChar,
  parseAboutPage,
  parseTeamPage,
} from '../src/scrape/infoPages';

describe('info page parsers', () => {
  it('does not throw on out-of-range numeric entities', () => {
    expect(codePointToChar(0x110000)).toBe(' ');
    expect(codePointToChar(0xd800)).toBe(' ');
    const about = parseAboutPage(
      '<div class="editor-box"><p>बाह्रखरी परिचय &#999999999; &#xD800;</p></div>',
    );
    expect(about.paragraphs.join(' ')).toContain('बाह्रखरी परिचय');
  });

  it('always returns arrays for about paragraphs and team categories', () => {
    const about = parseAboutPage('<html><body>no editor</body></html>');
    expect(Array.isArray(about.paragraphs)).toBe(true);
    const team = parseTeamPage('<html><body>no team boxes</body></html>');
    expect(Array.isArray(team.categories)).toBe(true);
    expect(team.categories).toHaveLength(0);
  });

  it('parses team members and ignores non-member images', () => {
    const html = `
      <h1 class="page-title">हाम्रो टिम</h1>
      <div class="team-box">
        <span class="team-cat-name">सम्पादकीय समूह</span>
        <div class="team-item">
          <img data-src="https://baahrakhari.com/uploads/members/a.jpg" />
          <span class="main-title">प्रतीक प्रधान</span>
          <span class="designation">प्रधान सम्पादक</span>
        </div>
        <div class="team-item">
          <img src="https://baahrakhari.com/themes/placeholder.png" />
          <span class="main-title">बलराम पाण्डे</span>
          <span class="designation">कार्यकारी सम्पादक</span>
        </div>
        <div class="team-item">
          <img data-src="https://baahrakhari.com/uploads/members/c.jpg" />
          <span class="main-title">तेस्रो</span>
          <span class="designation">सम्पादक</span>
        </div>
      </div>
      <footer></footer>`;
    const team = parseTeamPage(html);
    expect(team.categories).toHaveLength(1);
    expect(team.categories[0].members).toHaveLength(3);
    expect(team.categories[0].members[0].imageUrl).toContain('uploads/members/');
    expect(team.categories[0].members[1].imageUrl).toBeUndefined();
  });
});

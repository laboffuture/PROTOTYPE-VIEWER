import { voteLink, whatsappShareUrl } from './share';

describe('voteLink', () => {
  it('builds the vote path from an explicit origin', () => {
    expect(voteLink('abc123', 'https://3dviewer.laboffuture.com')).toBe(
      'https://3dviewer.laboffuture.com/vote/abc123'
    );
  });
});

describe('whatsappShareUrl', () => {
  it('wraps the link in a wa.me deep link with the message prefilled', () => {
    const link = 'https://3dviewer.laboffuture.com/vote/abc123';
    const url = whatsappShareUrl(link);
    expect(url.startsWith('https://wa.me/?text=')).toBe(true);
    // the link must survive encoding intact
    expect(decodeURIComponent(url.split('text=')[1])).toContain(link);
  });

  it('encodes a custom message', () => {
    const url = whatsappShareUrl('https://x.test/vote/1', 'Vote now:');
    expect(decodeURIComponent(url.split('text=')[1])).toBe('Vote now: https://x.test/vote/1');
  });
});

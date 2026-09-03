import {useEffect, useMemo, useState} from 'react';
import {formatDeviceDateAsBs} from '../format/nepaliDate';
import {fetchSiteHeaderDate} from '../scrape/siteHeaderDate';

/**
 * Nepali (Bikram Sambat) date shown under the header logo.
 * Prefers the live baahrakhari.com header string; falls back to converting
 * the device instant into Nepal Time → BS in the same format.
 */
export function useSiteHeaderDate(): string {
  const fallback = useMemo(() => formatDeviceDateAsBs(new Date()) ?? '', []);
  const [label, setLabel] = useState(fallback);

  useEffect(() => {
    let cancelled = false;
    fetchSiteHeaderDate()
      .then(text => {
        if (!cancelled && text) {
          setLabel(text);
        }
      })
      .catch(() => {
        /* keep fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return label;
}

import {useEffect, useRef, useState} from 'react';
import {
  emptyHomeAds,
  fetchHomeAdvertisements,
  type HomeAdsMap,
} from '../scrape/advertisements';

/** Home-only static banners from `getAdvertisementData`. */
export function useHomeAds() {
  const [ads, setAds] = useState<HomeAdsMap>(emptyHomeAds);
  const [loading, setLoading] = useState(true);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;
    (async () => {
      try {
        const next = await fetchHomeAdvertisements();
        setAds(next);
      } catch {
        setAds(emptyHomeAds());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return {ads, loading};
}

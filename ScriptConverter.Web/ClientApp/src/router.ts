import { useState, useEffect, useCallback } from 'react';

export interface Route {
  page: string;
  dictionaryId: string | null;
  params: Record<string, string>;
}

export function parseRoute(): Route {
  const path = window.location.pathname.replace(/^\/+/, '') || 'converter';
  const parts = path.split('/');
  const params = Object.fromEntries(new URLSearchParams(window.location.search));

  if (parts[0] === 'natural-dictionary' && parts[1]) {
    return { page: 'natural-dictionary', dictionaryId: parts[1], params };
  }

  return { page: parts[0] || 'converter', dictionaryId: null, params };
}

export function navigate(path: string, params?: Record<string, string>, replace = false) {
  let url = '/' + path;
  if (params && Object.keys(params).length > 0) {
    const qs = Object.entries(params)
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    if (qs) url += '?' + qs;
  }

  if (replace) {
    window.history.replaceState(null, '', url);
  } else {
    window.history.pushState(null, '', url);
  }
  window.dispatchEvent(new Event('routechange'));
}

export function updateParams(params: Record<string, string>) {
  const path = window.location.pathname.replace(/^\/+/, '') || 'converter';
  navigate(path, params, true);
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(parseRoute);

  useEffect(() => {
    const handle = () => setRoute(parseRoute());
    window.addEventListener('popstate', handle);
    window.addEventListener('routechange', handle);
    return () => {
      window.removeEventListener('popstate', handle);
      window.removeEventListener('routechange', handle);
    };
  }, []);

  const setPage = useCallback((page: string) => navigate(page), []);
  const browseDictionary = useCallback((id: string) => navigate(`natural-dictionary/${id}`), []);
  const backToList = useCallback(() => navigate('natural-dictionary'), []);

  return { route, setPage, browseDictionary, backToList };
}

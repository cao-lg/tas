const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (import.meta.env.DEV) {
    return '';
  }
  return 'https://tas-worker.cao-lg.workers.dev';
};

export const API_BASE_URL = getApiBaseUrl();

export const apiFetch = async (path: string, options: RequestInit = {}): Promise<Response> => {
  const url = API_BASE_URL ? `${API_BASE_URL}${path}` : path;
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
};

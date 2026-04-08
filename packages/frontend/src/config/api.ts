// 使用实际的 Worker 地址
export const API_BASE_URL = 'https://tas-worker.56170496.workers.dev';

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

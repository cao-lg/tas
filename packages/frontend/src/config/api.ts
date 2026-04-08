// 使用相对路径，这样前端会使用与自己相同的域名
// 这样可以避免硬编码 Worker URL 的问题
export const API_BASE_URL = '';

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

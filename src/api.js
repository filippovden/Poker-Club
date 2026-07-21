const TOKEN_KEY = 'lp_admin_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  const res = await fetch(`/api${path}`, { ...options, headers })

  if (!res.ok) {
    let message = `Ошибка запроса (${res.status})`
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      /* ignore parse error */
    }
    throw new Error(message)
  }

  if (res.status === 204) return null
  return res.json()
}

export const api = {
  login: (username, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  getTournaments: () => request('/tournaments'),
  createTournament: (data) =>
    request('/tournaments', { method: 'POST', body: JSON.stringify(data) }),
  updateTournament: (id, data) =>
    request(`/tournaments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteTournament: (id) =>
    request(`/tournaments/${id}`, { method: 'DELETE' }),

  getNews: () => request('/news'),
  getNewsArticle: (slug) => request(`/news/${slug}`),
  createNews: (data) =>
    request('/news', { method: 'POST', body: JSON.stringify(data) }),
  updateNews: (id, data) =>
    request(`/news/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteNews: (id) => request(`/news/${id}`, { method: 'DELETE' }),
}

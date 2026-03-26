// tests/helpers/api-client.ts
export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    public path: string
  ) {
    super(`API Error ${status} on ${path}: ${JSON.stringify(body)}`);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  constructor(
    private baseURL: string,
    private accessToken?: string
  ) {}

  setToken(token: string): this {
    this.accessToken = token;
    return this;
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
    headers: Record<string, string> = {}
  ): Promise<T> {
    const url = `${this.baseURL}${path}`;
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = text; }

    if (!response.ok) {
      throw new ApiError(response.status, data, path);
    }

    if (response.status === 204) return undefined as T;
    return data as T;
  }

  async get<T>(path: string): Promise<T> { return this.request<T>('GET', path); }
  async post<T>(path: string, body?: unknown): Promise<T> { return this.request<T>('POST', path, body); }
  async patch<T>(path: string, body?: unknown): Promise<T> { return this.request<T>('PATCH', path, body); }
  async put<T>(path: string, body?: unknown): Promise<T> { return this.request<T>('PUT', path, body); }
  async delete<T>(path: string): Promise<T> { return this.request<T>('DELETE', path); }

  async upload<T>(path: string, fieldName: string, filePath: string): Promise<T> {
    const url = `${this.baseURL}${path}`;
    const formData = new FormData();
    const file = await fetch(`file://${filePath}`).then(r => r.blob());
    formData.append(fieldName, file, filePath.split('/').pop()!);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {}),
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) throw new ApiError(response.status, data, path);
    return data as T;
  }
}

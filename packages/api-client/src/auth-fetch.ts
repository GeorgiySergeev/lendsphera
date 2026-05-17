export function createAuthClient(getToken: () => Promise<string | null>) {
  return {
    async fetch(url: string, init?: RequestInit): Promise<Response> {
      const token = await getToken();
      const headers = new Headers(init?.headers);

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      const response = await fetch(url, { ...init, headers });

      if (response.status === 401) {
        throw new Error("Unauthorized - token refresh required");
      }

      return response;
    }
  };
}

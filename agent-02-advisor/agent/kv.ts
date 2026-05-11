function baseUrl() {
  const u = process.env.KV_API_URL;
  if (!u) throw new Error('KV_API_URL must be set');
  return u.replace(/\/$/, '');
}

function namespace() {
  const ns = process.env.NAMESPACE;
  if (!ns) throw new Error('NAMESPACE must be set');
  return ns;
}

export async function kvGet(key: string): Promise<string | null> {
  const url = `${baseUrl()}/key?namespace=${encodeURIComponent(namespace())}&key=${encodeURIComponent(key)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`KV GET failed: HTTP ${res.status}`);
  const data = await res.json() as { value: string | null };
  return data.value;
}

export async function kvPut(key: string, value: string): Promise<void> {
  const res = await fetch(`${baseUrl()}/key`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ namespace: namespace(), key, value }),
  });
  if (!res.ok) throw new Error(`KV PUT failed: HTTP ${res.status}`);
}

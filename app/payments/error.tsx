"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Payments page crashed</h1>
      <p style={{ color: '#666', marginBottom: 16 }}>
        An error occurred while rendering the Payments page. You can try again.
      </p>
      <pre style={{ whiteSpace: 'pre-wrap', background: '#f6f6f6', padding: 12, borderRadius: 8, maxWidth: 900, overflow: 'auto' }}>
        {String(error?.message || error)}
      </pre>
      <button onClick={() => reset()} style={{ marginTop: 16, padding: '8px 12px', borderRadius: 8, background: '#111827', color: 'white' }}>
        Retry
      </button>
    </div>
  );
}


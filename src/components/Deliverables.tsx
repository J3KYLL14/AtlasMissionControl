import React from 'react';

const deliverablesUrl = import.meta.env.VITE_DELIVERABLES_URL ?? '';

const Deliverables: React.FC = () => {
  const handleClick = () => {
    if (deliverablesUrl) {
      window.open(deliverablesUrl, '_blank', 'noreferrer');
    }
  };

  return (
    <div className="page-panel">
      <div className="section-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h1 style={{ margin: 0 }}>Deliverables</h1>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {deliverablesUrl ? 'OneDrive link ready' : 'Link pending'}
          </span>
        </div>
        <p style={{ marginTop: '1rem', color: 'var(--text-main)' }}>
          This section will give you quick access into the shared OneDrive space. Once you provide the full URL,
          it will open directly in a new tab.
        </p>
        <button
          type="button"
          onClick={handleClick}
          disabled={!deliverablesUrl}
          style={{
            marginTop: '1.5rem',
            padding: '0.85rem 1.5rem',
            background: deliverablesUrl ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '12px',
            fontWeight: 600,
            color: deliverablesUrl ? '#fff' : 'var(--text-muted)',
            cursor: deliverablesUrl ? 'pointer' : 'not-allowed',
          }}
        >
          {deliverablesUrl ? 'Open Deliverables' : 'Awaiting URL'}
        </button>
        {!deliverablesUrl && (
          <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Set `VITE_DELIVERABLES_URL` in your environment to make this link actionable.
          </p>
        )}
      </div>
    </div>
  );
};

export default Deliverables;

import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function BackButton() {
  const navigate = useNavigate();
  return (
    <button
      className="back-btn"
      onClick={() => navigate('/')}
      style={{
        position: 'fixed', bottom: 20, left: 20, padding: '10px 22px',
        background: 'rgba(10,10,20,0.85)', color: '#fff', border: '2px solid #00e5ff',
        borderRadius: 8, fontSize: 15, cursor: 'pointer', zIndex: 1000,
        transition: 'all .2s', fontWeight: 600, backdropFilter: 'blur(6px)',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = '#00e5ff'; e.currentTarget.style.color = '#000'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(10,10,20,0.85)'; e.currentTarget.style.color = '#fff'; }}
    >
      ← Back to Arcade
    </button>
  );
}

import React, { useState, useRef, useEffect } from 'react';

export default function Navbar({ user, onLogin, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef();

  // Close menu if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const avatarLetter = user?.name ? user.name.charAt(0).toUpperCase() : '?';

  return (
    <nav style={{
      height: 64,
      backgroundColor: '#2563eb', // blue-600
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      fontFamily: 'system-ui, sans-serif',
      userSelect: 'none',
      position: 'relative',
      boxShadow: '0 2px 4px rgb(0 0 0 / 0.1)',
      zIndex: 10,
    }}>
      {/* Left: Project Title */}
      <div style={{ fontWeight: '700', fontSize: 24 }}>
        INFO AI
      </div>

      {/* Right: User Info and Menu */}
      <div style={{ position: 'relative' }} ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            gap: 12,
            fontWeight: '600',
            fontSize: 16,
            padding: 8,
            borderRadius: 6,
          }}
          aria-haspopup="true"
          aria-expanded={menuOpen}
        >
          {/* Avatar Circle */}
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: '#1e40af', // blue-800
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
            fontSize: 18,
            userSelect: 'none',
          }}>
            {avatarLetter}
          </div>

          {/* User Name or Login */}
          <span>{user?.name || 'Guest'}</span>
        </button>

        {/* Dropdown Menu */}
        {menuOpen && (
          <ul style={{
            position: 'absolute',
            right: 0,
            marginTop: 8,
            backgroundColor: 'white',
            color: '#1f2937',
            borderRadius: 6,
            boxShadow: '0 4px 8px rgb(0 0 0 / 0.15)',
            listStyle: 'none',
            padding: '8px 0',
            minWidth: 140,
            zIndex: 20,
          }}>
            {!user ? (
              <li>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onLogin && onLogin();
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: 14,
                    color: '#1f2937',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Login
                </button>
              </li>
            ) : (
              <li>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout && onLogout();
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: 14,
                    color: '#1f2937',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Logout
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
    </nav>
  );
}

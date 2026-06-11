import React, { useState, useEffect } from 'react';
import { User } from './googleIcons';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getSettings } from './aiService';

const ProfileDropdown = () => {
  const [user, setUser] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      {user ? (
        <button className="profile-btn" style={{ padding: 0, overflow: 'hidden' }} onClick={() => setProfileOpen(!profileOpen)}>
          <img src={user.photoURL} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
        </button>
      ) : (
        <Link to="/auth" style={{ textDecoration: 'none' }}>
          <button className="profile-btn">
            <User size={19} />
          </button>
        </Link>
      )}

      <AnimatePresence>
        {profileOpen && user && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 10px)',
              right: 0,
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '16px',
              boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.08), 0 0 1px 1px rgba(0, 0, 0, 0.03)',
              width: '250px',
              padding: '0.75rem',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              transformOrigin: 'top right'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.5rem 0.75rem 0.5rem', borderBottom: '1px solid #e5e7eb', marginBottom: '0.25rem' }}>
              <img src={user.photoURL} style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid #e5e7eb' }} referrerPolicy="no-referrer" />
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.displayName || 'User'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'var(--font-mono)' }}>
                  {user.email}
                </div>
              </div>
            </div>

            <button
              onClick={() => { setProfileOpen(false); navigate('/settings'); }}
              style={{ width: '100%', textAlign: 'left', padding: '0.6rem 0.75rem', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 500, color: '#111827', transition: 'all 0.2s ease' }}
              onMouseOver={e => e.currentTarget.style.background = '#f3f4f6'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              Settings
            </button>

            <button
              onClick={() => { setProfileOpen(false); navigate('/help'); }}
              style={{ width: '100%', textAlign: 'left', padding: '0.6rem 0.75rem', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 500, color: '#111827', transition: 'all 0.2s ease' }}
              onMouseOver={e => e.currentTarget.style.background = '#f3f4f6'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              Help & Setup Guide
            </button>

            <button
              onClick={() => { setProfileOpen(false); navigate('/docs'); }}
              style={{ width: '100%', textAlign: 'left', padding: '0.6rem 0.75rem', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 500, color: '#111827', transition: 'all 0.2s ease' }}
              onMouseOver={e => e.currentTarget.style.background = '#f3f4f6'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              Documentation
            </button>

            <button
              onClick={() => {
                signOut(auth);
                setUser(null);
                setProfileOpen(false);
                navigate('/auth');
              }}
              style={{ width: '100%', textAlign: 'left', padding: '0.6rem 0.75rem', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, color: '#ef4444', transition: 'all 0.2s ease', marginTop: '0.25rem', borderTop: '1px solid #f3f4f6', paddingTop: '0.6rem' }}
              onMouseOver={e => e.currentTarget.style.background = '#fee2e2'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfileDropdown;

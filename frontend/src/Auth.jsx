import React, { useState, useEffect } from 'react';
import { signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { auth, provider } from './firebase';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap } from './googleIcons';

const Auth = () => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Handle redirect sign-in result when returning from Google
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          navigate('/diagrams');
        }
      } catch (err) {
        console.error("Redirect Auth Error:", err);
        setError("Failed to sign in with Google redirect. Please try again.");
      }
    };
    handleRedirectResult();
  }, [navigate]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, provider);
      // User signed in successfully
      navigate('/diagrams');
    } catch (err) {
      console.error("Popup Auth Error:", err);
      // If popup is blocked or closed, fall back to redirect
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        try {
          await signInWithRedirect(auth, provider);
        } catch (redirectErr) {
          console.error("Redirect Trigger Error:", redirectErr);
          setError("Failed to open sign-in screen. Please try again.");
          setIsLoading(false);
        }
      } else {
        setError("Failed to sign in with Google. Please try again.");
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="diagrams-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          background: '#ffffff',
          padding: '3rem',
          borderRadius: '1.5rem',
          border: '2px solid #e5e7eb',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: '400px',
          width: '90%',
          textAlign: 'center'
        }}
      >
        <div className="logo-wrapper" style={{ marginBottom: '2.5rem' }}>
          <span className="logo-arka">ARKA</span>
        </div>

        <p style={{ color: 'var(--text-alt)', marginBottom: '2rem', fontSize: '0.9rem', fontFamily: 'var(--font-mono)' }}>
          Sign in or create an account to start building flawless technical architecture.
        </p>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ 
              background: '#fef2f2', 
              color: '#ef4444', 
              padding: '0.75rem', 
              borderRadius: '0.75rem', 
              marginBottom: '1.5rem', 
              fontSize: '0.85rem', 
              width: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              border: '1px solid #fca5a5'
            }}
          >
             <Zap size={16} /> {error}
          </motion.div>
        )}

        <button 
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className={`submit-btn ${isLoading ? 'inactive' : 'active'}`}
          style={{
            width: '100%',
            height: '3.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            fontSize: '1rem',
            borderRadius: '1rem',
            opacity: isLoading ? 0.7 : 1
          }}
        >
          {isLoading ? (
            <div className="loader" style={{ width: '20px', height: '20px' }}></div>
          ) : (
            <>
              <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

      </motion.div>
    </div>
  );
};

export default Auth;

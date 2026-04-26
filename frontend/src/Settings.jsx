import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Database, Cloud, Zap, Eye, Check, X } from './googleIcons';
import { auth } from './firebase';
import { getSettings, saveSettings, getCreditsInfo, CLOUD_PROVIDERS, LOCAL_MODELS } from './aiService';

const Settings = () => {
  const navigate = useNavigate();
  const [providerType, setProviderType] = useState('free');
  const [cloudProvider, setCloudProvider] = useState('gemini');
  const [cloudModel, setCloudModel] = useState('gemini-combo-3');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [localUrl, setLocalUrl] = useState('http://localhost:11434');
  const [localModel, setLocalModel] = useState('gemma3:12b');
  const [credits, setCredits] = useState({ used: 0, total: 3 });
  const [saved, setSaved] = useState(false);
  const [savedModel, setSavedModel] = useState(null);

  useEffect(() => {
    const s = getSettings();
    setProviderType(s.providerType);
    setCloudProvider(s.cloudProvider);
    setCloudModel(s.cloudModel);
    setApiKey(s.apiKey);
    setLocalUrl(s.localUrl);
    setLocalModel(s.localModel);
    setCredits(getCreditsInfo());
    if (s.providerType === 'cloud') setSavedModel(s.cloudModel);
    else if (s.providerType === 'local') setSavedModel(s.localModel);
  }, []);



  const handleSave = () => {
    saveSettings({ providerType, cloudProvider, cloudModel, apiKey, localUrl, localModel });
    setSavedModel(providerType === 'cloud' ? cloudModel : localModel);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const cardStyle = {
    background: '#ffffff',
    borderRadius: '1.25rem',
    border: '1px solid #e5e7eb',
    padding: '2rem',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)',
    marginBottom: '1.5rem',
  };
  const labelStyle = { display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' };
  const inputStyle = { width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s' };
  const tabBtn = (active) => ({
    flex: 1, padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
    borderRadius: '0.75rem', border: active ? '2px solid #000' : '1px solid #e5e7eb',
    background: active ? '#f8fafc' : 'transparent', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
    fontFamily: 'var(--font-sans)', color: '#000', transition: 'all 0.2s'
  });

  const activeProviderModels = CLOUD_PROVIDERS[cloudProvider]?.models || [];

  return (
    <div style={{ height: '100vh', background: '#f5f5f5', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '4rem', paddingBottom: '4rem' }}>
      <div style={{ width: '100%', maxWidth: '640px', padding: '0 1rem' }}>

        {/* Back */}
        <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: 'none', fontFamily: 'var(--font-sans)', fontWeight: 600, cursor: 'pointer', marginBottom: '1.5rem', color: '#6b7280', fontSize: '0.9rem' }}>
          <ChevronLeft size={18} /> Back
        </button>

        <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem', color: '#000' }}>Settings</h1>
        <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '2rem', fontFamily: 'var(--font-mono)' }}>Configure how Arka generates your diagrams.</p>

        {/* ─── Credits Card ─── */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Free Tier</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.15rem', fontSize: '0.9rem' }}>Arka AI Credits</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>Powered by Sarvam</div>
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: credits.used >= credits.total ? '#ef4444' : '#000' }}>
              {credits.used}/{credits.total}
            </div>
          </div>
          {credits.used >= credits.total && (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', background: '#fef2f2', borderRadius: '0.5rem', fontSize: '0.8rem', color: '#b91c1c', fontWeight: 600 }}>
              Free credits exhausted. Add your own API key below to continue generating.
            </div>
          )}
        </div>

        {/* ─── Provider Selection ─── */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>AI Provider</h2>
          <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginBottom: '1.25rem', fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}>
            Bring your own API key or run models locally. Your key stays in your browser — never sent to our servers.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <button onClick={() => setProviderType('free')} style={tabBtn(providerType === 'free')}>
              <Zap size={16} /> Free Tier
            </button>
            <button onClick={() => setProviderType('cloud')} style={tabBtn(providerType === 'cloud')}>
              <Cloud size={16} /> Cloud API
            </button>
            <button onClick={() => setProviderType('local')} style={tabBtn(providerType === 'local')}>
              <Database size={16} /> Local
            </button>
          </div>

          {/* ─── Free Tier ─── */}
          {providerType === 'free' && (
            <div style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                You get <strong>3 free diagram generations</strong> powered by Arka AI (Sarvam) via our servers. After that, add your own API key or run models locally for unlimited generation.
              </p>
            </div>
          )}

          {/* ─── Cloud API ─── */}
          {providerType === 'cloud' && (
            <>
              {/* Cloud Provider Selector */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={labelStyle}>Provider</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {Object.entries(CLOUD_PROVIDERS).map(([key, prov]) => (
                    <button key={key} onClick={() => { setCloudProvider(key); setCloudModel(prov.models[0].id); setSavedModel(null); }} style={{
                      flex: 1, padding: '0.6rem', borderRadius: '0.5rem', fontSize: '0.85rem', fontWeight: 600,
                      border: cloudProvider === key ? '2px solid #000' : '1px solid #e5e7eb',
                      background: cloudProvider === key ? '#f0f0f0' : '#fff', cursor: 'pointer', fontFamily: 'var(--font-sans)', color: '#000'
                    }}>
                      {prov.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Model Selector */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={labelStyle}>Model</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {activeProviderModels.map(m => (
                    <button key={m.id} onClick={() => setCloudModel(m.id)} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0.85rem',
                      borderRadius: '0.6rem', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s',
                      border: cloudModel === m.id ? '2px solid #000' : (savedModel === m.id ? '2px solid #06b6d4' : '1px solid #e5e7eb'),
                      background: savedModel === m.id ? '#cffafe' : (cloudModel === m.id ? '#f8fafc' : '#fff'), fontFamily: 'var(--font-sans)',
                      outline: 'none'
                    }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', border: cloudModel === m.id ? '5px solid #000' : (savedModel === m.id ? '5px solid #06b6d4' : '2px solid #d1d5db'), flexShrink: 0, transition: 'all 0.15s' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {m.label}
                          {m.badge && <span style={{ fontSize: '0.65rem', background: '#000', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>{m.badge}</span>}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>{m.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Combo advantage notice */}
              {cloudModel.includes('combo') && (
                <div style={{ padding: '0.75rem 1rem', background: '#f0fdf4', borderRadius: '0.5rem', border: '1px solid #bbf7d0', marginBottom: '1.25rem', fontSize: '0.8rem', color: '#166534', lineHeight: 1.5 }}>
                  <strong>💡 Combo advantage:</strong> Combos use a fast model for classification (cheaper, faster) and a powerful model for generation (higher quality). This saves tokens and gives you the best of both worlds.
                </div>
              )}

              {/* API Key */}
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={labelStyle}>API Key</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder={cloudProvider === 'gemini' ? 'AIzaSy...' : 'sk_...'}
                    style={inputStyle}
                  />
                  <button onClick={() => setShowKey(!showKey)} style={{
                    position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px'
                  }}>
                    <Eye size={16} />
                  </button>
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'var(--font-mono)', lineHeight: 1.5, display: 'flex', gap: '0.35rem', alignItems: 'flex-start' }}>
                <span style={{ color: '#22c55e', flexShrink: 0, marginTop: '1px' }}>🔒</span>
                Your API key is stored only in your browser's localStorage. It is never sent to Arka servers.
              </div>
            </>
          )}

          {/* ─── Local Model ─── */}
          {providerType === 'local' && (
            <>
              <div style={{ padding: '0.75rem 1rem', background: '#eff6ff', borderRadius: '0.5rem', border: '1px solid #bfdbfe', marginBottom: '1.25rem', fontSize: '0.8rem', color: '#1e40af', lineHeight: 1.5 }}>
                <strong>Requires Ollama</strong> running on your machine. Install from <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>ollama.com</a> and pull the model first.
              </div>

              {/* Ollama URL */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={labelStyle}>Ollama API URL</label>
                <input type="text" value={localUrl} onChange={e => setLocalUrl(e.target.value)} placeholder="http://localhost:11434" style={inputStyle} />
              </div>

              {/* Model Selector */}
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={labelStyle}>Model</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '320px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                  {LOCAL_MODELS.map(m => (
                    <button key={m.id} onClick={() => setLocalModel(m.id)} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.85rem',
                      borderRadius: '0.6rem', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s',
                      border: localModel === m.id ? '2px solid #000' : (savedModel === m.id ? '2px solid #06b6d4' : '1px solid #e5e7eb'),
                      background: savedModel === m.id ? '#cffafe' : (localModel === m.id ? '#f8fafc' : '#fff'), fontFamily: 'var(--font-sans)',
                      outline: 'none'
                    }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', border: localModel === m.id ? '5px solid #000' : (savedModel === m.id ? '5px solid #06b6d4' : '2px solid #d1d5db'), flexShrink: 0, transition: 'all 0.15s' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {m.label}
                          <span style={{ fontSize: '0.6rem', background: '#f3f4f6', color: '#6b7280', padding: '1px 5px', borderRadius: '3px', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{m.size}</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '1px' }}>{m.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'var(--font-mono)', lineHeight: 1.5, marginTop: '0.5rem' }}>
                Pull command: <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>ollama pull {localModel}</code>
              </div>
            </>
          )}
        </div>

        {/* ─── Save Button ─── */}
        <button
          onClick={handleSave}
          style={{
            width: '100%', padding: '0.9rem', borderRadius: '0.75rem', fontWeight: 700, fontSize: '0.95rem',
            background: '#000', color: '#fff', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            transition: 'all 0.2s', opacity: saved ? 0.7 : 1,
          }}
        >
          {saved ? <><Check size={18} /> Saved!</> : 'Save Settings'}
        </button>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1.5rem' }}>
          <button onClick={() => navigate('/help')} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 600, textDecoration: 'underline' }}>Setup Guide</button>
          <button onClick={() => navigate('/docs')} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 600, textDecoration: 'underline' }}>Documentation</button>
        </div>
      </div>
    </div>
  );
};

export default Settings;

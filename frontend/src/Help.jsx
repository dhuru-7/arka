import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from './googleIcons';

const Help = () => {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '4rem', paddingBottom: '4rem' }}>
      <div style={{ width: '100%', maxWidth: '720px', padding: '0 1rem' }}>
        
        <button onClick={() => navigate('/diagrams')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', color: '#6b7280', fontSize: '0.9rem', cursor: 'pointer', marginBottom: '2rem', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
          <ChevronLeft size={16} /> Back to Arena
        </button>

        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem', fontFamily: 'var(--font-logo)' }}>Setup Guide</h1>
        <p style={{ color: '#6b7280', fontSize: '1rem', marginBottom: '3rem', fontFamily: 'var(--font-mono)' }}>Learn how to set up your API keys or run models locally for unlimited diagrams.</p>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#2563eb' }}>☁️</span> Cloud API Setup
          </h2>

          <div style={{ background: '#fff', borderRadius: '1rem', border: '1px solid #e5e7eb', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Invidia (NVIDIA NIM)</h3>
            <ol style={{ paddingLeft: '1.2rem', margin: 0, color: '#4b5563', lineHeight: 1.7, fontSize: '0.95rem' }}>
              <li style={{ marginBottom: '0.5rem' }}>Go to the <a href="https://build.nvidia.com" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>NVIDIA API Catalog</a>.</li>
              <li style={{ marginBottom: '0.5rem' }}>Sign in or create an account.</li>
              <li style={{ marginBottom: '0.5rem' }}>Select the model (e.g., Gemma 4 31B IT) and click on <strong>"Get API Key"</strong>.</li>
              <li style={{ marginBottom: '0.5rem' }}>Copy the generated key (it usually starts with <code style={{ background: '#f3f4f6', padding: '2px 4px', borderRadius: '4px' }}>nvapi-...</code>).</li>
              <li>Paste the key into the <strong>Cloud API</strong> section in Arka's <span style={{ cursor: 'pointer', color: '#2563eb', textDecoration: 'underline' }} onClick={() => navigate('/settings')}>Settings page</span>.</li>
            </ol>
          </div>

          <div style={{ background: '#fff', borderRadius: '1rem', border: '1px solid #e5e7eb', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Sarvam AI</h3>
            <ol style={{ paddingLeft: '1.2rem', margin: 0, color: '#4b5563', lineHeight: 1.7, fontSize: '0.95rem' }}>
              <li style={{ marginBottom: '0.5rem' }}>Go to the <a href="https://sarvam.ai" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>Sarvam AI Platform</a>.</li>
              <li style={{ marginBottom: '0.5rem' }}>Create an account or log in.</li>
              <li style={{ marginBottom: '0.5rem' }}>Navigate to your dashboard and look for <strong>API Keys</strong>.</li>
              <li style={{ marginBottom: '0.5rem' }}>Generate a new key and copy it.</li>
              <li>Select Sarvam as the provider in Arka's <span style={{ cursor: 'pointer', color: '#2563eb', textDecoration: 'underline' }} onClick={() => navigate('/settings')}>Settings page</span> and paste your key.</li>
            </ol>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#10b981' }}>💻</span> Local LLM Setup (Ollama)
          </h2>
          
          <div style={{ background: '#fff', borderRadius: '1rem', border: '1px solid #e5e7eb', padding: '1.5rem' }}>
            <p style={{ color: '#4b5563', lineHeight: 1.6, marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              Running models locally means 100% privacy and zero API costs. Your prompts never leave your computer. You'll need a reasonably powerful machine (ideally 8GB+ RAM, or 16GB+ for larger models).
            </p>
            
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>1. Install Ollama</h3>
            <p style={{ color: '#4b5563', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              Download and install Ollama from <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>ollama.com</a>. Available for macOS, Windows, and Linux.
            </p>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>2. Enable CORS (Required)</h3>
            <p style={{ color: '#4b5563', fontSize: '0.95rem', marginBottom: '0.5rem' }}>
              By default, Ollama blocks requests from web browsers. You must set the <code>OLLAMA_ORIGINS</code> environment variable to allow Arka to communicate with it.
            </p>
            <div style={{ background: '#1e293b', color: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', marginBottom: '1.5rem', overflowX: 'auto' }}>
              <div style={{ marginBottom: '0.5rem' }}><strong>Mac/Linux (Terminal):</strong></div>
              <code style={{ display: 'block', marginBottom: '1rem' }}>OLLAMA_ORIGINS="*" ollama serve</code>
              <div style={{ marginBottom: '0.5rem' }}><strong>Windows (Command Prompt):</strong></div>
              <code style={{ display: 'block' }}>set OLLAMA_ORIGINS="*" & ollama serve</code>
            </div>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>3. Download a Model</h3>
            <p style={{ color: '#4b5563', fontSize: '0.95rem', marginBottom: '0.5rem' }}>
              Open a new terminal window and pull the model you want to use. We highly recommend Gemma 4.
            </p>
            <div style={{ background: '#1e293b', color: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              <code>ollama pull gemma4:12b</code>
            </div>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>4. Connect in Arka</h3>
            <p style={{ color: '#4b5563', fontSize: '0.95rem', marginBottom: '0.5rem' }}>
              Go to Arka's <strong>Settings &gt; Local</strong>, ensure the URL is set to <code>http://localhost:11434</code>, pick your downloaded model, and click Save.
            </p>
          </div>
        </section>

      </div>
    </div>
  );
};

export default Help;

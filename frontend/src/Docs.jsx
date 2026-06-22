import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from './googleIcons';

const Docs = () => {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '4rem', paddingBottom: '4rem' }}>
      <div style={{ width: '100%', maxWidth: '720px', padding: '0 1rem' }}>
        
        <button onClick={() => navigate('/diagrams')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', color: '#6b7280', fontSize: '0.9rem', cursor: 'pointer', marginBottom: '2rem', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
          <ChevronLeft size={16} /> Back to Arena
        </button>

        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem', fontFamily: 'var(--font-logo)' }}>Documentation</h1>
        <p style={{ color: '#6b7280', fontSize: '1rem', marginBottom: '3rem', fontFamily: 'var(--font-mono)' }}>Deep dive into Arka's architecture, security, and AI models.</p>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Security & Privacy: Bring Your Own Key</h2>
          
          <div style={{ background: '#fff', borderRadius: '1rem', border: '1px solid #e5e7eb', padding: '1.5rem' }}>
            <p style={{ color: '#4b5563', lineHeight: 1.7, fontSize: '0.95rem', marginBottom: '1rem' }}>
              Arka operates on a strict <strong>Bring Your Own Key (BYOK)</strong> architecture to guarantee user privacy and cost transparency. When you provide your NVIDIA or Sarvam API key, the platform uses it to directly facilitate the diagram generation process.
            </p>
            <div style={{ color: '#4b5563', lineHeight: 1.7, fontSize: '0.95rem', marginBottom: '1rem' }}>
              <strong>How it works:</strong>
              <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                <li style={{ marginBottom: '0.4rem' }}>Your API keys are stored <strong>only locally</strong> in your browser's <code style={{background:'#f3f4f6', padding:'2px 4px', borderRadius:'4px'}}>localStorage</code>.</li>
                <li style={{ marginBottom: '0.4rem' }}>For both NVIDIA and Sarvam AI, requests are passed securely via an ephemeral proxy endpoint on the backend to avoid CORS issues, but the keys are <strong>never saved or logged</strong> on our servers.</li>
              </ul>
            </div>
            <p style={{ color: '#4b5563', lineHeight: 1.7, fontSize: '0.95rem', margin: 0 }}>
              This means you retain absolute control over your API keys, your billing, and your prompts. 
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Model Architecture & Combos</h2>
          
          <div style={{ background: '#fff', borderRadius: '1rem', border: '1px solid #e5e7eb', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>The Dual-Model Engine</h3>
            <p style={{ color: '#4b5563', lineHeight: 1.7, fontSize: '0.95rem', marginBottom: '1rem' }}>
              Arka AI uniquely uses a dual-model approach. Generating a visual architecture from a prompt involves two very different tasks:
            </p>
            <ol style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', marginBottom: '1rem', color: '#4b5563', lineHeight: 1.7, fontSize: '0.95rem' }}>
              <li style={{ marginBottom: '0.4rem' }}><strong>Classification:</strong> Understanding the intent and determining the optimal diagram type (e.g., Sequence vs. ER Diagram).</li>
              <li style={{ marginBottom: '0.4rem' }}><strong>Generation:</strong> The heavy-lifting process of writing complex, syntactically perfect diagram code.</li>
            </ol>

            <p style={{ color: '#4b5563', lineHeight: 1.7, fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              To optimize both speed and cost, our backend default uses a fast model for rapid classification, and passes the context to a much larger model for complex diagram generation. 
            </p>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Cloud Models (Sarvam & NVIDIA)</h3>
            <div style={{ color: '#4b5563', lineHeight: 1.7, fontSize: '0.95rem', marginBottom: '0.5rem' }}>
              When using your own Cloud API keys, you can choose from these options:
              <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                <li style={{ marginBottom: '0.4rem' }}><strong>Sarvam 105B:</strong> A heavy-weight model optimized for writing intricate diagram syntax and handling complex reasoning.</li>
                <li style={{ marginBottom: '0.4rem' }}><strong>Sarvam 30B:</strong> A lighter model, great for quick classifications and simpler flows.</li>
                <li style={{ marginBottom: '0.4rem' }}><strong>Gemma 4 31B IT (NVIDIA):</strong> A highly capable model hosted on NVIDIA NIM, providing excellent balanced performance.</li>
              </ul>
            </div>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Local Inference (Ollama)</h2>
          
          <div style={{ background: '#fff', borderRadius: '1rem', border: '1px solid #e5e7eb', padding: '1.5rem' }}>
            <p style={{ color: '#4b5563', lineHeight: 1.7, fontSize: '0.95rem', marginBottom: '1rem' }}>
              Arka offers native support for local AI inference via Ollama. 
            </p>
            <p style={{ color: '#4b5563', lineHeight: 1.7, fontSize: '0.95rem', margin: 0 }}>
              The landscape of open-weight models is advancing rapidly. Models like <strong>Gemma 4</strong> and <strong>CodeGemma</strong> can now write high-quality diagram syntax previously possible only with heavy cloud models. By connecting Arka to a local Ollama instance, the app sends prompts directly to <code style={{background:'#f3f4f6', padding:'2px 4px', borderRadius:'4px'}}>localhost</code>. This provides a completely offline, zero-latency (network-wise), and zero-cost environment for power users.
            </p>
          </div>
        </section>

      </div>
    </div>
  );
};

export default Docs;

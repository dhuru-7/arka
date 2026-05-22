/**
 * aiService.js — Arka AI Routing Layer
 * Routes diagram generation to the correct provider:
 *   1. Free tier → backend (Sarvam, server key)
 *   2. BYOK Cloud → Gemini direct / Sarvam via backend proxy
 *   3. Local → Ollama REST API
 *
 * API keys are NEVER stored on the server. They live in localStorage only.
 */

import { auth, db } from './firebase';
import { doc, getDoc, setDoc, increment } from 'firebase/firestore';

// ─── Model Definitions ───

export const CLOUD_PROVIDERS = {
  sarvam: {
    name: 'Sarvam AI',
    models: [
      { id: 'sarvam-combo', label: 'Sarvam Combo', desc: '30B classifies, 105B generates. Best balance.', suggestModel: 'sarvam-30b', generateModel: 'sarvam-105b', badge: 'Recommended' },
      { id: 'sarvam-105b', label: 'Sarvam 105B', desc: 'Most powerful. Best for complex diagrams.', suggestModel: 'sarvam-105b', generateModel: 'sarvam-105b' },
      { id: 'sarvam-30b', label: 'Sarvam 30B', desc: 'Faster responses, good for simple diagrams.', suggestModel: 'sarvam-30b', generateModel: 'sarvam-30b' },
    ]
  },
  gemini: {
    name: 'Google Gemini',
    models: [
      { id: 'gemini-combo-1.5', label: 'Gemini 1.5 Combo', desc: 'Flash classifies, Pro generates. Best of both.', suggestModel: 'gemini-1.5-flash', generateModel: 'gemini-1.5-pro', badge: 'Recommended' },
      { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', desc: 'Most powerful Gemini. Complex tasks.', suggestModel: 'gemini-1.5-pro', generateModel: 'gemini-1.5-pro' },
      { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', desc: 'Fast and very capable.', suggestModel: 'gemini-1.5-flash', generateModel: 'gemini-1.5-flash' },
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', desc: 'Latest generation flash model.', suggestModel: 'gemini-2.0-flash', generateModel: 'gemini-2.0-flash' },
    ]
  }
};

export const LOCAL_MODELS = [
  { id: 'gemma3:27b', label: 'Gemma 3 27B', desc: "Google's best local model.", size: '27B' },
  { id: 'gemma3:12b', label: 'Gemma 3 12B', desc: 'Good balance of speed and quality.', size: '12B' },
  { id: 'gemma3:4b', label: 'Gemma 3 4B', desc: 'Lightweight, runs on most hardware.', size: '4B' },
  { id: 'sarvam-m:24b', label: 'Sarvam M 24B', desc: "Sarvam's open-weight local model.", size: '24B' },
  { id: 'llama3.1:8b', label: 'Llama 3.1 8B', desc: "Meta's popular open model.", size: '8B' },
  { id: 'mistral:7b', label: 'Mistral 7B', desc: 'Fast and efficient.', size: '7B' },
  { id: 'deepseek-coder-v2:16b', label: 'DeepSeek Coder V2 16B', desc: 'Great for structured output.', size: '16B' },
  { id: 'phi3:14b', label: 'Phi-3 14B', desc: "Microsoft's compact model.", size: '14B' },
  { id: 'qwen2.5:14b', label: 'Qwen 2.5 14B', desc: "Alibaba's capable model.", size: '14B' },
];

// ─── Settings helpers ───

export function getSettings() {
  return {
    providerType: localStorage.getItem('arka_provider_type') || 'free', // 'free' | 'cloud' | 'local'
    cloudProvider: localStorage.getItem('arka_cloud_provider') || 'gemini',
    cloudModel: localStorage.getItem('arka_cloud_model') || 'gemini-combo-1.5',
    apiKey: localStorage.getItem('arka_api_key') || '',
    localUrl: localStorage.getItem('arka_local_url') || 'http://localhost:11434',
    localModel: localStorage.getItem('arka_local_model') || 'gemma3:12b',
  };
}

export function saveSettings(settings) {
  if (settings.providerType) localStorage.setItem('arka_provider_type', settings.providerType);
  if (settings.cloudProvider) localStorage.setItem('arka_cloud_provider', settings.cloudProvider);
  if (settings.cloudModel) localStorage.setItem('arka_cloud_model', settings.cloudModel);
  if (settings.apiKey !== undefined) localStorage.setItem('arka_api_key', settings.apiKey);
  if (settings.localUrl) localStorage.setItem('arka_local_url', settings.localUrl);
  if (settings.localModel) localStorage.setItem('arka_local_model', settings.localModel);
}

// ─── Credit tracking ───

const FREE_LIMIT = 3;

export async function getCreditsUsed() {
  if (auth?.currentUser) {
    try {
      const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      return snap.exists() ? (snap.data().creditsUsed || 0) : 0;
    } catch { return parseInt(localStorage.getItem('arka_credits_used') || '0'); }
  }
  return parseInt(localStorage.getItem('arka_credits_used') || '0');
}

export async function incrementCredits() {
  const current = parseInt(localStorage.getItem('arka_credits_used') || '0');
  localStorage.setItem('arka_credits_used', String(current + 1));
  if (auth?.currentUser) {
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), { creditsUsed: increment(1) }, { merge: true });
    } catch (e) { console.error('Credit increment error:', e); }
  }
}

export async function hasCredits() {
  const settings = getSettings();
  if (settings.providerType !== 'free') return true; // BYOK/local = unlimited
  const used = await getCreditsUsed();
  return used < FREE_LIMIT;
}

export function getCreditsInfo() {
  return { used: parseInt(localStorage.getItem('arka_credits_used') || '0'), total: FREE_LIMIT };
}

// ─── Resolve which model IDs to use ───

function resolveModels(purpose) {
  const s = getSettings();
  if (s.providerType === 'local') {
    return { provider: 'local', model: s.localModel, url: s.localUrl };
  }
  if (s.providerType === 'cloud') {
    const providerDef = CLOUD_PROVIDERS[s.cloudProvider];
    const modelDef = providerDef?.models.find(m => m.id === s.cloudModel) || providerDef?.models[0];
    const model = purpose === 'suggest' ? modelDef.suggestModel : modelDef.generateModel;
    return { provider: s.cloudProvider, model, apiKey: s.apiKey };
  }
  // Free tier → backend
  return { provider: 'free' };
}

// ─── Gemini direct call ───

async function callGemini(apiKey, model, systemPrompt, userMessage, temperature = 0.2, maxTokens = 2500, signal) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { temperature, maxOutputTokens: maxTokens }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini API error: ${res.status}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

// ─── Sarvam direct call (via backend proxy for CORS) ───

async function callSarvam(apiKey, model, systemPrompt, userMessage, temperature = 0.2, maxTokens = 2500, signal) {
  const res = await fetch('/api/generate-byok', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, model, systemPrompt, userMessage, temperature, maxTokens }),
    signal
  });
  if (!res.ok) throw new Error(`Sarvam proxy error: ${res.status}`);
  const data = await res.json();
  return data.content || '';
}

// ─── Ollama local call ───

async function callOllama(url, model, systemPrompt, userMessage, signal) {
  const res = await fetch(`${url}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      stream: false
    }),
    signal
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
  const data = await res.json();
  return data.message?.content?.trim() || '';
}

// ─── Unified call ───

async function callModel(purpose, systemPrompt, userMessage, options = {}) {
  const { temperature = 0.2, maxTokens = 2500, signal } = options;
  const resolved = resolveModels(purpose);

  if (resolved.provider === 'free') {
    return null; // Caller should fall back to existing backend route
  }
  if (resolved.provider === 'gemini') {
    return callGemini(resolved.apiKey, resolved.model, systemPrompt, userMessage, temperature, maxTokens, signal);
  }
  if (resolved.provider === 'sarvam') {
    return callSarvam(resolved.apiKey, resolved.model, systemPrompt, userMessage, temperature, maxTokens, signal);
  }
  if (resolved.provider === 'local') {
    return callOllama(resolved.url, resolved.model, systemPrompt, userMessage, signal);
  }
  return null;
}

// ─── Public API ───

/** Returns true if the user is using BYOK or local (not free tier) */
export function isBYOK() {
  return getSettings().providerType !== 'free';
}

/** Returns the provider label for display */
export function getProviderLabel() {
  const s = getSettings();
  if (s.providerType === 'free') return 'Arka AI (Free)';
  if (s.providerType === 'local') return `Local · ${s.localModel}`;
  const prov = CLOUD_PROVIDERS[s.cloudProvider];
  const model = prov?.models.find(m => m.id === s.cloudModel);
  return `${prov?.name} · ${model?.label || s.cloudModel}`;
}

/**
 * Suggest diagram type from user prompt.
 * Returns { category: string } or null if using free tier (caller uses backend).
 */
export async function suggestDiagramType(prompt, signal) {
  const systemPrompt = `You are an expert architect. Given a user prompt, classify it into exactly one of: 'flowchart', 'architecture', 'xy', 'pie', 'sequence', 'erDiagram', or 'gantt'. Respond with ONLY the category name. No explanation.`;
  const result = await callModel('suggest', systemPrompt, prompt, { temperature: 0.1, maxTokens: 20, signal });
  if (result === null) return null; // free tier
  const lower = result.toLowerCase().trim();
  const map = { flowchart:'flowchart', architecture:'architecture', xy:'xy', pie:'pie', sequence:'sequence', erdiagram:'erDiagram', er_diagram:'erDiagram', gantt:'gantt' };
  for (const [k,v] of Object.entries(map)) { if (lower.includes(k)) return { category: v }; }
  return { category: 'architecture' };
}

/**
 * Generate a Mermaid diagram.
 * Returns { mermaid_code: string } or null if free tier.
 */
export async function generateDiagram(prompt, diagramType, signal) {
  const systemPrompt = buildGeneratePrompt(diagramType);
  const userMsg = `Create a ${diagramType} diagram for: ${prompt}`;
  const result = await callModel('generate', systemPrompt, userMsg, { temperature: 0.2, maxTokens: 2500, signal });
  if (result === null) return null;
  const cleaned = cleanMermaidOutput(result, diagramType);
  return { mermaid_code: cleaned, diagram_type: diagramType };
}

/**
 * Refine an existing diagram.
 * Returns { mermaid_code: string } or null if free tier.
 */
export async function refineDiagram(prompt, mermaidCode, diagramType, signal) {
  const systemPrompt = `You are an expert diagram editor. Modify the existing Mermaid JS code based on the user's instruction.\n\nCRITICAL:\n- Output ONLY the complete updated Mermaid JS code.\n- Do NOT wrap in markdown code blocks.\n- PRESERVE existing structure unless explicitly asked to change it.\n- ALWAYS wrap node text in double quotes.`;
  const userMsg = `CURRENT MERMAID CODE:\n${mermaidCode}\n\nREFINEMENT INSTRUCTION: ${prompt}\n\nOutput ONLY the updated Mermaid JS code:`;
  const result = await callModel('generate', systemPrompt, userMsg, { temperature: 0.2, maxTokens: 2500, signal });
  if (result === null) return null;
  const cleaned = cleanMermaidOutput(result, diagramType);
  return { mermaid_code: cleaned, diagram_type: diagramType };
}

// ─── System prompt builder (mirrors backend logic) ───

function buildGeneratePrompt(diagramType) {
  const shared = `- Output ONLY valid Mermaid JS code.\n- Do NOT wrap in markdown code blocks (no \`\`\`mermaid).\n- Do NOT include any explanation before/after the code.\n- ALWAYS wrap node text in double quotes.\n`;
  const prompts = {
    flowchart: `You are an expert process designer generating Mermaid JS diagrams.\n\nCRITICAL INSTRUCTIONS:\n${shared}- Start with 'flowchart TD'.\n- SIMPLICITY FIRST: Keep diagrams CLEAN. Focus on the happy path.\n- Use correct shapes: diamonds for decisions, stadiums for start/end.\n- Keep 4-10 nodes max.\n- Node IDs MUST be simple alphanumeric strings.`,
    architecture: `You are an expert systems architect generating Mermaid JS diagrams.\n\nCRITICAL INSTRUCTIONS:\n${shared}- Start with 'flowchart LR' or 'flowchart TD'.\n- Divide into clear subgraphs (Frontend, Backend, Data Layer).\n- Max 3-4 nodes per subgraph.\n- Use cylinders for databases, hexagons for caches, stadiums for gateways.\n- Label edges with protocols.\n- Keep 4-15 nodes max.`,
    sequence: `You are an expert generating Mermaid JS sequence diagrams.\n\nCRITICAL INSTRUCTIONS:\n${shared}- First line MUST be 'sequenceDiagram'.\n- Declare ALL participants at top.\n- Aliases MUST be simple alphanumeric.\n- Keep 3-6 participants max.\n- Message text must NOT contain colons or angle brackets.`,
    erDiagram: `You are an expert database architect generating Mermaid JS ER diagrams.\n\nCRITICAL INSTRUCTIONS:\n${shared}- First line MUST be 'erDiagram'.\n- Entity names MUST be single PascalCase words.\n- 3-6 attributes per entity.\n- Every relationship MUST have a quoted label.\n- Use proper cardinality notation.`,
    gantt: `You are an expert generating Mermaid JS Gantt charts.\n\nCRITICAL INSTRUCTIONS:\n${shared}- First line MUST be 'gantt'.\n- Include 'dateFormat YYYY-MM-DD'.\n- Group tasks into 3-5 sections.\n- Every task MUST have a unique alphanumeric ID.\n- Keep 10-25 tasks for readability.`,
    pie: `You are an expert generating Mermaid JS pie charts.\n\nCRITICAL INSTRUCTIONS:\n${shared}- Start with 'pie showData'.\n- Include a title.\n- Each slice: "Label" : value\n- Keep 3-8 categories.`,
    xy: `You are an expert generating Mermaid JS XY charts.\n\nCRITICAL INSTRUCTIONS:\n${shared}- Start with 'xychart-beta'.\n- Include title, x-axis, y-axis, and at least one data series.\n- X-axis labels in brackets.\n- Values in brackets.`,
  };
  return prompts[diagramType] || prompts.flowchart;
}

// ─── Mermaid output cleaner (mirrors backend logic) ───

function cleanMermaidOutput(content, diagramType) {
  // Remove markdown code blocks
  content = content.replace(/^```(?:mermaid)?\s*\n?/gm, '');
  content = content.replace(/\n?```\s*$/gm, '');
  content = content.replace(/```mermaid/g, '').replace(/```/g, '');
  content = content.trim();

  // Remove duplicate headers
  const headerKw = ['flowchart ', 'sequenceDiagram', 'erDiagram', 'gantt', 'pie', 'xychart-beta'];
  let headerCount = 0;
  content = content.split('\n').filter(line => {
    const isHeader = headerKw.some(kw => line.trim().startsWith(kw));
    if (isHeader) { headerCount++; if (headerCount > 1) return false; }
    return true;
  }).join('\n');

  // Replace reserved 'end' keyword in flowcharts
  if (['flowchart', 'architecture'].includes(diagramType)) {
    content = content.replace(/(^|\n)end(\s*[-=]>|[([{])/g, '$1finish$2');
    content = content.replace(/([([{])end([)\]}])/g, '$1finish$2');
  }

  return content;
}

export { callModel, resolveModels };

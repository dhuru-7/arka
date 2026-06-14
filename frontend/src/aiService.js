/**
 * aiService.js — Arka AI Routing Layer
 * Routes diagram generation to the correct provider:
 *   1. Free tier → backend (Sarvam, server key)
 *   2. BYOK Cloud → Gemini direct / Sarvam via backend proxy
 *   3. Local → Ollama REST API
 *
 * API keys are NEVER stored on the server. They live in localStorage only.
 */



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
  },
  groq: {
    name: 'Groq',
    models: [
      { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B', desc: 'Meta Llama 3.1 8B. Super fast.', suggestModel: 'llama-3.1-8b-instant', generateModel: 'llama-3.1-8b-instant', badge: 'Recommended' },
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', desc: 'Meta Llama 3.3 70B. High quality.', suggestModel: 'llama-3.3-70b-versatile', generateModel: 'llama-3.3-70b-versatile' },
      { id: 'gemma-2-2b-it', label: 'Gemma 2 2B', desc: 'Google Gemma 2 2B (if available).', suggestModel: 'gemma-2-2b-it', generateModel: 'gemma-2-2b-it' },
      { id: 'gemma4:2b', label: 'Gemma 4 2B', desc: 'Gemma 4 2B (Custom).', suggestModel: 'gemma4:2b', generateModel: 'gemma4:2b' }
    ]
  }
};

export const LOCAL_MODELS = [
  { id: 'gemma4:e2b', label: 'Gemma 4 e2b', desc: "User's local Gemma model.", size: '7.2GB' },
  { id: 'gemma2:2b', label: 'Gemma 2 2B', desc: "Google's lightweight 2B model.", size: '2B' },
  { id: 'gemma:2b', label: 'Gemma 2B', desc: "Google's lightweight 2B model (v1).", size: '2B' },
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
    providerType: localStorage.getItem('arka_provider_type') || 'free',
    cloudProvider: localStorage.getItem('arka_cloud_provider') || '',
    cloudModel: localStorage.getItem('arka_cloud_model') || '',
    apiKey: localStorage.getItem('arka_api_key') || '',
    localUrl: localStorage.getItem('arka_local_url') || 'http://localhost:11434',
    localModel: localStorage.getItem('arka_local_model') || '',
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



// ─── Resolve which model IDs to use ───

function resolveModels(purpose) {
  const s = getSettings();
  if (s.providerType === 'free' || !s.providerType) {
    return { provider: 'free', model: 'sarvam-105b', apiKey: '' };
  }
  if (s.providerType === 'local') {
    if (!s.localModel) throw new Error('Select and save a local AI model in Settings.');
    return { provider: 'local', model: s.localModel, url: s.localUrl };
  }
  if (s.providerType !== 'cloud') throw new Error('Select an AI provider in Settings.');
  if (!s.cloudProvider || !s.cloudModel) throw new Error('Select and save a cloud AI model in Settings.');
  if (!s.apiKey) throw new Error('Enter and save the selected provider API key in Settings.');
  const providerDef = CLOUD_PROVIDERS[s.cloudProvider];
  const modelDef = providerDef?.models.find(m => m.id === s.cloudModel);
  if (!modelDef) throw new Error('The saved AI model is not available. Select it again in Settings.');
  const model = purpose === 'suggest' ? modelDef.suggestModel : modelDef.generateModel;
  return { provider: s.cloudProvider, model, apiKey: s.apiKey };
}

// ─── Gemini direct call ───

async function callGemini(apiKey, model, systemPrompt, userMessage, temperature = 0.2, maxTokens = 2500, signal, imageBase64) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const parts = [{ text: userMessage }];
  if (imageBase64) {
    const base64Data = imageBase64.split(',')[1];
    parts.push({
      inlineData: {
        mimeType: 'image/png',
        data: base64Data
      }
    });
  }
  const body = {
    contents: [{ role: 'user', parts }],
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

// ─── Groq direct call (via backend proxy for CORS) ───

async function callGroq(apiKey, model, systemPrompt, userMessage, temperature = 0.2, maxTokens = 2500, signal) {
  const res = await fetch('/api/generate-byok', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, model, provider: 'groq', systemPrompt, userMessage, temperature, maxTokens }),
    signal
  });
  if (!res.ok) throw new Error(`Groq proxy error: ${res.status}`);
  const data = await res.json();
  return data.content || '';
}

// ─── Ollama local call ───

async function callOllama(url, model, systemPrompt, userMessage, signal, imageBase64) {
  const images = [];
  if (imageBase64) {
    const base64Data = imageBase64.split(',')[1];
    images.push(base64Data);
  }
  const res = await fetch(`${url}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage, ...(images.length > 0 ? { images } : {}) }
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
  if (resolved.provider === 'groq') {
    return callGroq(resolved.apiKey, resolved.model, systemPrompt, userMessage, temperature, maxTokens, signal);
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

export async function optimizePrompt(prompt, signal) {
  const systemPrompt = `You are an expert prompt optimizer for generating high-quality Mermaid JS diagrams.
Your task is to take the user's input prompt (which may have spelling mistakes, typos, or be extremely short/simple) and optimize it.

Optimization rules:
1. Correct all spelling, grammar, and structural mistakes.
2. If the prompt is short (like "water cycle" or "photosynthesis"), rewrite it into a detailed, structured, step-by-step description of the flow, processes, components, and relationships. This detailed prompt will be used to generate a rich, accurate, and comprehensive diagram.
3. Output ONLY the final optimized, expanded prompt itself.
4. Do NOT include any explanations, introductions, headers, list of changes, markdown code blocks, or preamble.
5. Start immediately with the optimized prompt text.

Example 1:
Input: photosintesis
Output: A detailed process flowchart of Photosynthesis. It starts with light absorption by chlorophyll in the leaves. Carbon dioxide enters through the stomata, and water is absorbed by the roots. Under light energy, the light-dependent reactions produce ATP and NADPH while releasing Oxygen. Then, the light-independent Calvin Cycle uses ATP, NADPH, and Carbon Dioxide to synthesize Glucose (sugar).

Example 2:
Input: login logic with bad password
Output: A flow diagram showing user login logic. The user enters their username and password. The system checks if the username exists. If no, show user not found error. If yes, check password. If password is incorrect, increment failed attempts, check if attempts exceed 3. If yes, lock account and notify user. If no, show incorrect password error and prompt retry. If password is correct, reset failed attempts counter, generate session token, and redirect to dashboard.`;

  let providerPayload = {};
  try {
    providerPayload = buildAgentProviderPayload('generate');
  } catch (e) {
    providerPayload = { provider: 'free' };
  }

  if (providerPayload.provider === 'local') {
    return callOllama(
      providerPayload.localUrl,
      providerPayload.model,
      systemPrompt,
      prompt,
      signal
    );
  }

  if (providerPayload.provider === 'gemini') {
    return callGemini(
      providerPayload.apiKey,
      providerPayload.model,
      systemPrompt,
      prompt,
      0.3,
      1500,
      signal
    );
  }

  const res = await fetch('/api/agent/optimize-prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      ...providerPayload
    }),
    signal
  });
  
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Failed to optimize prompt: ${res.status}`);
  }
  
  const data = await res.json();
  return data.optimized_prompt;
}


/**
 * Suggest diagram type from user prompt.
 * Returns { category: string } or null if using free tier (caller uses backend).
 */
export async function suggestDiagramType(prompt, signal) {
  const systemPrompt = `You are Arka's diagram selection agent. Analyze the user's communication goal semantically. Allowed types: flowchart, architecture, sequence, erDiagram, gantt, xy, pie. Return one or more genuinely suitable types ranked best first. Return ONLY JSON: {"suggestions":[{"type":"flowchart","confidence":0.9,"reason":"..."}]}. Do not include weak options.`;
  const result = await callModel('suggest', systemPrompt, prompt, { temperature: 0.1, maxTokens: 2500, signal });
  const fenced = result?.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const match = fenced?.[1] || result?.match(/[\{\[][\s\S]*[\}\]]/)?.[0];
  if (!match) throw new Error('The selected AI model did not return diagram suggestions.');
  const parsed = JSON.parse(match);
  const data = Array.isArray(parsed) ? { suggestions: parsed } : parsed;
  const typeMap = { flowchart: 'flowchart', architecture: 'architecture', sequence: 'sequence', erdiagram: 'erDiagram', gantt: 'gantt', xy: 'xy', pie: 'pie' };
  const seenTypes = new Set();
  const suggestions = (Array.isArray(data.suggestions) ? data.suggestions : [])
    .map(item => ({
      type: typeMap[String(item?.type || '').toLowerCase().replace(/[_-]/g, '')],
      confidence: Math.max(0, Math.min(Number(item?.confidence), 1)),
      reason: String(item?.reason || '').trim()
    }))
    .filter(item => {
      if (!item.type || !Number.isFinite(item.confidence) || !item.reason || seenTypes.has(item.type)) return false;
      seenTypes.add(item.type);
      return true;
    })
    .sort((a, b) => b.confidence - a.confidence);
  if (!suggestions.length) throw new Error('The selected AI model returned no valid diagram suggestions.');
  return {
    suggestions,
    suggested_type: suggestions[0].type,
    category: suggestions[0].type,
    confidence: suggestions[0].confidence,
    reason: suggestions[0].reason
  };
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

function buildAgentProviderPayload(purpose = 'generate') {
  const resolved = resolveModels(purpose);
  if (resolved.provider === 'local') {
    return { provider: 'local', model: resolved.model, localUrl: resolved.url };
  }
  return {
    provider: resolved.provider,
    model: resolved.model,
    apiKey: resolved.apiKey || '',
  };
}

async function callAgentEndpoint(path, body, signal) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Agent API error: ${res.status}`);
  return data;
}

async function callAgentEndpointStream(path, body, onProgress, signal) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Agent API error: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (line.trim()) {
        try {
          const data = JSON.parse(line);
          if (data.type === 'progress') {
            if (onProgress) onProgress(data.content);
          } else if (data.type === 'result') {
            result = data.content;
          } else if (data.type === 'error') {
            throw new Error(data.content);
          }
        } catch (e) {
          console.error("Failed to parse line", line, e);
          if (e.message && e.message.indexOf("Error") !== -1) {
            throw e;
          }
        }
      }
    }
  }

  if (!result) {
    throw new Error("Agent failed to return a result.");
  }
  return result;
}

export async function agentSuggestDiagramType(prompt, signal) {
  const providerPayload = buildAgentProviderPayload('suggest');

  if (providerPayload.provider === 'local' || providerPayload.provider === 'gemini') {
    return suggestDiagramType(prompt, signal);
  }

  return callAgentEndpoint('/api/agent/suggest', {
    prompt,
    ...providerPayload
  }, signal);
}

export async function agentGenerateDiagram(prompt, diagramType, options = {}) {
  const providerPayload = buildAgentProviderPayload('generate');

  if (providerPayload.provider === 'local' || providerPayload.provider === 'gemini') {
    const result = await generateDiagram(prompt, diagramType, options.signal);
    return {
      ...result,
      agent_steps: ['Generated with the selected local model.'],
      repair_log: [],
      suggestions: []
    };
  }

  return callAgentEndpointStream('/api/agent/generate', {
    prompt,
    diagramType,
    ...providerPayload
  }, options.onProgress, options.signal);
}

export function hasVisionCapability(provider, model) {
  if (provider === 'gemini') return true;
  if (model && (model.toLowerCase().includes('gemma4') || model.toLowerCase().includes('vision'))) return true;
  return false;
}

export async function agentRefineDiagram(prompt, mermaidCode, diagramType, options = {}) {
  const providerPayload = buildAgentProviderPayload('generate');

  if (providerPayload.provider === 'local' || providerPayload.provider === 'gemini') {
    const result = await refineDiagram(prompt, mermaidCode, diagramType, options.signal);
    return {
      ...result,
      agent_steps: ['Refined with the selected local model.'],
      repair_log: [],
      suggestions: []
    };
  }

  return callAgentEndpointStream('/api/agent/refine', {
    prompt,
    mermaid_code: mermaidCode,
    diagramType,
    selected_context: options.selectedContext || [],
    ...providerPayload
  }, options.onProgress, options.signal);
}

export async function agentChat(systemPrompt, userMessage, signal, imageBase64) {
  let providerPayload = {};
  try {
    providerPayload = buildAgentProviderPayload('generate');
  } catch (e) {
    providerPayload = { provider: 'free' };
  }

  const modelHasVision = hasVisionCapability(providerPayload.provider, providerPayload.model);

  if (providerPayload.provider === 'local') {
    return callOllama(
      providerPayload.localUrl,
      providerPayload.model,
      systemPrompt,
      userMessage,
      signal,
      modelHasVision ? imageBase64 : null
    );
  }

  if (providerPayload.provider === 'gemini') {
    return callGemini(
      providerPayload.apiKey,
      providerPayload.model,
      systemPrompt,
      userMessage,
      0.3,
      1500,
      signal,
      modelHasVision ? imageBase64 : null
    );
  }

  const res = await fetch('/api/agent/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_prompt: systemPrompt,
      user_message: userMessage,
      image_base64: modelHasVision ? imageBase64 : null,
      ...providerPayload
    }),
    signal
  });
  
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Agent Chat error: ${res.status}`);
  }
  
  const data = await res.json();
  return data.content;
}

function buildGeneratePrompt(diagramType) {
  const shared = `- Output ONLY valid Mermaid JS code.\n- Do NOT wrap in markdown code blocks (no \`\`\`mermaid).\n- Do NOT include any explanation before/after the code.\n- ALWAYS wrap node text in double quotes.\n`;
  const prompts = {
    flowchart: `You are an expert process designer generating Mermaid JS diagrams.\n\nCRITICAL INSTRUCTIONS:\n${shared}- Start with 'flowchart TD'.\n- SIMPLICITY FIRST: Keep diagrams CLEAN. Focus on the happy path.\n- Use correct shapes: diamonds for decisions, stadiums for start/end.\n- Keep 4-10 nodes max.\n- Node IDs MUST be simple alphanumeric strings.`,
    architecture: `You are an expert systems architect generating Mermaid JS diagrams.\n\nCRITICAL INSTRUCTIONS:\n${shared}- Start with 'flowchart LR' or 'flowchart TD'.\n- Divide into clear subgraphs (Frontend, Backend, Data Layer).\n- Max 3-4 nodes per subgraph.\n- Use cylinders for databases, hexagons for caches, stadiums for gateways.\n- Label edges with protocols.\n- Keep 4-15 nodes max.`,
    sequence: `You are an expert generating Mermaid JS sequence diagrams.\n\nCRITICAL INSTRUCTIONS:\n${shared}- First line MUST be 'sequenceDiagram'.\n- Declare ALL participants at top.\n- Aliases MUST be simple alphanumeric.\n- Keep 3-6 participants max.\n- Message text must NOT contain colons or angle brackets.\n- Activations (+/-) must be balanced: if a participant is activated with '+' inside an alt, else, par, or loop block, it MUST be deactivated with '-' before that block ends. Never leave activations open at the end of a block/diagram.\n- Parallel block titles MUST use brackets: 'par [Title]' (not 'par Title').`,
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

  // Sequence diagram activation auto-healing
  if (diagramType === 'sequence') {
    const lines = content.split('\n');
    const balance = {};
    let hasActivationError = false;
    for (const line of lines) {
      const stripped = line.trim();
      if (stripped.includes(':') && (stripped.includes('->') || stripped.includes('-->'))) {
        const prefix = stripped.split(':')[0];
        const parts = prefix.split(/-+>>?[+-]?/);
        if (parts.length >= 2) {
          const dst = parts[parts.length - 1].trim();
          if (prefix.includes('->>+') || prefix.includes('->+') || stripped.startsWith('activate ')) {
            balance[dst] = (balance[dst] || 0) + 1;
          }
          if (prefix.includes('-->>-') || prefix.includes('-->-') || stripped.startsWith('deactivate ')) {
            balance[dst] = (balance[dst] || 0) - 1;
          }
          if ((balance[dst] || 0) < 0) {
            hasActivationError = true;
            break;
          }
        }
      }
    }
    for (const val of Object.values(balance)) {
      if (val !== 0) {
        hasActivationError = true;
        break;
      }
    }

    if (hasActivationError) {
      content = lines
        .filter(line => !line.trim().startsWith('activate ') && !line.trim().startsWith('deactivate '))
        .map(line => {
          return line.replace(/(-+>>?)\+/g, '$1').replace(/(-+>>?)-/g, '$1');
        })
        .join('\n');
    }
  }

  return content;
}

export { callModel, resolveModels };

/**
 * aiService.js — Arka AI Routing Layer
 * Routes diagram generation to the correct provider:
 *   1. Free tier → backend (Sarvam, server key)
 *   2. BYOK Cloud → Gemini direct / Sarvam via backend proxy
 *   3. Local → Ollama REST API
 *
 * API keys are NEVER stored on the server. They live in localStorage only.
 */
export const CLOUD_PROVIDERS = {
  gemini: {
    name: 'Google AI',
    models: [
      { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash', desc: 'Google\'s recommended flagship model for general task speed and capability.', suggestModel: 'gemini-3.5-flash', generateModel: 'gemini-3.5-flash', badge: 'Best' },
      { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite', desc: 'Google\'s highly cost-effective, ultra-fast model.', suggestModel: 'gemini-3.1-flash-lite', generateModel: 'gemini-3.1-flash-lite' }
    ]
  },
  sarvam: {
    name: 'Sarvam AI',
    models: [
      { id: 'sarvam-105b', label: 'Sarvam 105B', desc: 'Most powerful. Best for complex diagrams.', suggestModel: 'sarvam-105b', generateModel: 'sarvam-105b' },
      { id: 'sarvam-30b', label: 'Sarvam 30B', desc: 'Faster responses, good for simple diagrams.', suggestModel: 'sarvam-30b', generateModel: 'sarvam-30b' }
    ]
  }
};

export const LOCAL_MODELS = [
  { id: 'gemma4:12b', label: 'Gemma 4 12B', desc: "Google's Gemma 4 12B model.", size: '12B' },
  { id: 'codegemma:7b', label: 'CodeGemma 7B', desc: "Google's CodeGemma 7B model.", size: '7B' }
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
    return { provider: 'free', model: 'sarvam-30b', apiKey: '' };
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

// ─── Invidia direct call (via backend proxy for CORS) ───

async function callInvidia(apiKey, model, systemPrompt, userMessage, temperature = 0.2, maxTokens = 2500, signal) {
  const res = await fetch('/api/generate-byok', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, model, provider: 'invidia', systemPrompt, userMessage, temperature, maxTokens }),
    signal
  });
  if (!res.ok) throw new Error(`Invidia proxy error: ${res.status}`);
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
  if (resolved.provider === 'invidia' || resolved.provider === 'nvidia') {
    return callInvidia(resolved.apiKey, resolved.model, systemPrompt, userMessage, temperature, maxTokens, signal);
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
  // Check trial mode
  if (localStorage.getItem('arka_trial_completed') !== 'true') {
    return 'Trial · Gemini 3.1 Flash Lite';
  }
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
  let systemPrompt = `You are an expert diagram editor. Modify the existing Mermaid JS code based on the user's instruction.\n\nCRITICAL:\n- Output ONLY the complete updated Mermaid JS code.\n- Do NOT wrap in markdown code blocks.\n- PRESERVE existing structure unless explicitly asked to change it.\n- ALWAYS wrap node text in double quotes.`;
  systemPrompt += `\n- Do NOT include explanations, plans, notes, apologies, or reasoning.
- If the instruction asks for a change, the returned Mermaid code must implement a visible change.
- Do not refuse normal Mermaid edits. If a request is partly unsupported, make the closest supported code change.
- Keep the original diagram type and return one complete Mermaid document.`;
  if (diagramType === 'flowchart') {
    systemPrompt += `\n- When editing or adding colors, you MUST apply semantic colors using classDef definitions:
  * greenNode (Start, End, Success, Completion): fill:#e2f0d9, stroke:#385723, color:#000000
  * blueNode (Process / Action): fill:#ddebf7, stroke:#1f4e78, color:#000000
  * yellowNode (Decision): fill:#fff2cc, stroke:#7f6000, color:#000000
  * redNode (Errors, Failures, Rollbacks, Cancellations, Escalations): fill:#fce4d6, stroke:#c65911, color:#000000
  * goldNode (Logging, Learning, Analytics, Auditing): fill:#fff2cc, stroke:#d68a00, color:#000000
Apply them to nodes as 'nodeId:::className' and declare the classDefs at the bottom of the diagram.`;
  } else if (diagramType === 'architecture') {
    systemPrompt += `\n- When editing or adding colors/subgraphs, group nodes into logical layers using subgraphs and style the subgraphs using style statements at the bottom:
  * clientLayer: fill:#eff6ff, stroke:#2563eb, color:#1e3a8a
  * backendLayer: fill:#ecfeff, stroke:#0891b2, color:#164e63
  * aiLayer: fill:#faf5ff, stroke:#9333ea, color:#581c87
  * infraLayer: fill:#fff7ed, stroke:#ea580c, color:#7c2d12
  * dataLayer: fill:#f0fdf4, stroke:#16a34a, color:#14532d
  * msgLayer: fill:#fefce8, stroke:#ca8a04, color:#713f12
  * monitorLayer: fill:#fef2f2, stroke:#dc2626, color:#7f1d1d
  * extLayer: fill:#fafafa, stroke:#52525b, color:#18181b
Style individual nodes using classDefs:
  * clientNode: fill:#dbeafe, stroke:#1d4ed8, color:#000000
  * backendNode: fill:#cffafe, stroke:#0e7490, color:#000000
  * aiNode: fill:#f3e8ff, stroke:#7e22ce, color:#000000
  * infraNode: fill:#ffedd5, stroke:#c2410c, color:#000000
  * dataNode: fill:#dcfce7, stroke:#15803d, color:#000000
  * msgNode: fill:#fef9c3, stroke:#a16207, color:#000000
  * monitorNode: fill:#fee2e2, stroke:#b91c1c, color:#000000
  * extNode: fill:#f4f4f5, stroke:#4b5563, color:#000000
Apply node classes as 'nodeId:::className' and declare classDefs at the bottom.`;
  }
  const userMsg = `CURRENT MERMAID CODE:\n${mermaidCode}\n\nREFINEMENT INSTRUCTION: ${prompt}\n\nOutput ONLY the updated Mermaid JS code:`;
  const result = await callModel('generate', systemPrompt, userMsg, { temperature: 0.15, maxTokens: 3600, signal });
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
  if (model) {
    const lower = model.toLowerCase();
    if (lower.includes('gemma4') || lower.includes('gemma-4') || lower.includes('vision')) return true;
  }
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
      650,
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
    flowchart: `You are an expert process designer generating Mermaid JS diagrams.\n\nCRITICAL INSTRUCTIONS:\n${shared}- Start with 'flowchart TD'.\n- SIMPLICITY FIRST: Keep diagrams CLEAN. Focus on the happy path.\n- Use correct shapes: diamonds for decisions, stadiums for start/end.\n- Keep 4-10 nodes max.\n- Node IDs MUST be simple alphanumeric strings.\n- IMPORTANT: You MUST apply semantic coloring to every node in the flowchart using the following class definitions and apply them using 'nodeId:::className' syntax:\n  * greenNode (Start, End, Success, Completion): fill:#e2f0d9, stroke:#385723, color:#000000\n  * blueNode (Process / Action): fill:#ddebf7, stroke:#1f4e78, color:#000000\n  * yellowNode (Decision): fill:#fff2cc, stroke:#7f6000, color:#000000\n  * redNode (Errors, Failures, Rollbacks, Cancellations, Escalations): fill:#fce4d6, stroke:#c65911, color:#000000\n  * goldNode (Logging, Learning, Analytics, Auditing): fill:#fff2cc, stroke:#d68a00, color:#000000\n- Define these classDefs at the bottom of the diagram, for example:\n  classDef greenNode fill:#e2f0d9,stroke:#385723,color:#000000;\n  classDef blueNode fill:#ddebf7,stroke:#1f4e78,color:#000000;\n  classDef yellowNode fill:#fff2cc,stroke:#7f6000,color:#000000;\n  classDef redNode fill:#fce4d6,stroke:#c65911,color:#000000;\n  classDef goldNode fill:#fff2cc,stroke:#d68a00,color:#000000;`,
    architecture: `You are an expert systems architect generating Mermaid JS diagrams.\n\nCRITICAL INSTRUCTIONS:\n${shared}- Start with 'flowchart LR' or 'flowchart TD'.\n- Organize nodes into logical layers using subgraphs (e.g., clientLayer, backendLayer, aiLayer, dataLayer, monitorLayer, extLayer).\n- Apply semantic coloring to subgraphs using 'style subgraphId fill:#HEX,stroke:#HEX,stroke-width:2px,color:#HEX' statements at the bottom.\n- Apply semantic coloring to nodes using classDefs and the 'nodeId:::className' syntax:\n  * clientNode (Client / UI): fill:#dbeafe, stroke:#1d4ed8, color:#000000 (subgraph clientLayer: fill:#eff6ff, stroke:#2563eb, color:#1e3a8a)\n  * backendNode (Backend Services / APIs): fill:#cffafe, stroke:#0e7490, color:#000000 (subgraph backendLayer: fill:#ecfeff, stroke:#0891b2, color:#164e63)\n  * aiNode (AI / ML / LLM / RAG): fill:#f3e8ff, stroke:#7e22ce, color:#000000 (subgraph aiLayer: fill:#faf5ff, stroke:#9333ea, color:#581c87)\n  * infraNode (Infrastructure / Compute): fill:#ffedd5, stroke:#c2410c, color:#000000 (subgraph infraLayer: fill:#fff7ed, stroke:#ea580c, color:#7c2d12)\n  * dataNode (Databases / Storage / Cache): fill:#dcfce7, stroke:#15803d, color:#000000 (subgraph dataLayer: fill:#f0fdf4, stroke:#16a34a, color:#14532d)\n  * msgNode (Messaging / Queues / Events): fill:#fef9c3, stroke:#a16207, color:#000000 (subgraph msgLayer: fill:#fefce8, stroke:#ca8a04, color:#713f12)\n  * monitorNode (Monitoring / Logging / Alerts): fill:#fee2e2, stroke:#b91c1c, color:#000000 (subgraph monitorLayer: fill:#fef2f2, stroke:#dc2626, color:#7f1d1d)\n  * extNode (External / Third-party): fill:#f4f4f5, stroke:#4b5563, color:#000000 (subgraph extLayer: fill:#fafafa, stroke:#52525b, color:#18181b)\n- Define these classDefs at the bottom of the diagram.`,
    sequence: `You are an expert generating Mermaid JS sequence diagrams.\n\nCRITICAL INSTRUCTIONS:\n${shared}- First line MUST be 'sequenceDiagram'.\n- Declare ALL participants at top.\n- Aliases MUST be simple alphanumeric.\n- Keep 3-6 participants max.\n- Message text must NOT contain colons or angle brackets.\n- Activations (+/-) must be balanced: if a participant is activated with '+' inside an alt, else, par, or loop block, it MUST be deactivated with '-' before that block ends. Never leave activations open at the end of a block/diagram.\n- Parallel block titles MUST use brackets: 'par [Title]' (not 'par Title').`,
    erDiagram: `You are an expert database architect generating Mermaid JS ER diagrams.\n\nCRITICAL INSTRUCTIONS:\n${shared}- First line MUST be 'erDiagram'.\n- Entity names MUST be single PascalCase words.\n- 3-6 attributes per entity.\n- Every relationship MUST have a quoted label.\n- Use proper cardinality notation.`,
    gantt: `You are an expert generating Mermaid JS Gantt charts.\n\nCRITICAL INSTRUCTIONS:\n${shared}- First line MUST be 'gantt'.\n- Include 'dateFormat YYYY-MM-DD'.\n- Group tasks into 3-5 sections.\n- Every task MUST have a unique alphanumeric ID.\n- Keep 10-25 tasks for readability.`,
    pie: `You are an expert generating Mermaid JS pie charts.\n\nCRITICAL INSTRUCTIONS:\n${shared}- Start with 'pie showData'.\n- Include a title.\n- Each slice: "Label" : value\n- Keep 3-8 categories.`,
    xy: `You are an expert generating Mermaid JS XY charts.

CRITICAL INSTRUCTIONS:
${shared}- Start with 'xychart-beta'.
- Include title, x-axis, y-axis, and at least one data series.
- NEVER put string labels after line or bar statements — e.g. use 'line [1, 2]', NEVER 'line [1, 2] "Label"'.
- NEVER use 'legend', 'annotate', or 'grid' directives as they are completely unsupported by xychart-beta syntax.
- Category labels in 'x-axis' must be enclosed in double quotes if they contain spaces.
- Ensure the number of elements in your bar/line series matches the number of x-axis categories exactly.`,
  };
  return prompts[diagramType] || prompts.flowchart;
}

// ─── Mermaid output cleaner (mirrors backend logic) ───

export function cleanMermaidOutput(content, diagramType) {
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
    content = restoreFlowchartLineBreaks(content);
    content = content.replace(/(^|\n)end(\s*[-=]>|[([{])/g, '$1finish$2');
    content = content.replace(/([([{])end([)\]}])/g, '$1finish$2');
    content = content.replace(/(?<!:)::([a-zA-Z_]\w*)/g, ':::$1');
    content = trimInvalidLinkStyles(content);
  }

  // Sequence diagram activation auto-healing
  if (diagramType === 'sequence') {
    const lines = content.split('\n');
    const balance = {};
    let hasActivationError = false;
    for (const line of lines) {
      const stripped = line.trim();
      if (stripped.startsWith('activate ')) {
        const parts = stripped.split(/\s+/);
        if (parts.length >= 2) {
          const alias = parts[1].trim();
          balance[alias] = (balance[alias] || 0) + 1;
        }
      } else if (stripped.startsWith('deactivate ')) {
        const parts = stripped.split(/\s+/);
        if (parts.length >= 2) {
          const alias = parts[1].trim();
          balance[alias] = (balance[alias] || 0) - 1;
          if (balance[alias] < 0) {
            hasActivationError = true;
            break;
          }
        }
      } else if (stripped.includes(':') && (stripped.includes('->') || stripped.includes('-->'))) {
        const prefix = stripped.split(':')[0];
        const parts = prefix.split(/-+>>?[+-]?/);
        if (parts.length >= 2) {
          const src = parts[0].trim();
          const dst = parts[parts.length - 1].trim();
          if (prefix.includes('->>+') || prefix.includes('->+')) {
            balance[dst] = (balance[dst] || 0) + 1;
          }
          if (prefix.includes('-->>-') || prefix.includes('-->-')) {
            balance[src] = (balance[src] || 0) - 1;
            if (balance[src] < 0) {
              hasActivationError = true;
              break;
            }
          }
        }
      }
    }
    if (!hasActivationError) {
      for (const val of Object.values(balance)) {
        if (val !== 0) {
          hasActivationError = true;
          break;
        }
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

function restoreFlowchartLineBreaks(content) {
  let text = content;
  if (!text.trim().includes('\n')) {
    text = text.replace(/\s+/g, ' ').trim();
  }
  text = text.replace(/^(flowchart\s+(?:TD|LR|BT|RL)|graph\s+(?:TD|LR|BT|RL))\s+/, '$1\n    ');
  text = text.replace(
    /\s+(?=(?:[A-Za-z][A-Za-z0-9_]*\s*(?:[-.=]+[ox>]|<[-.=]+|---)|classDef\s+|linkStyle\s+|style\s+|class\s+|subgraph\s+|end\b))/g,
    '\n    '
  );
  return text.split('\n').map(line => line.trimEnd()).join('\n');
}

function trimInvalidLinkStyles(content) {
  const lines = content.split('\n');
  const edgeCount = lines.reduce((count, line) => {
    const stripped = line.trim();
    if (stripped.startsWith('linkStyle ')) return count;
    return /[-.=]+[ox>]|<[-.=]+|---/.test(stripped) ? count + 1 : count;
  }, 0);

  const seen = new Set();
  return lines
    .map(line => {
      const match = line.trim().match(/^linkStyle\s+(\d+)\s+(.+?);?\s*$/);
      if (!match) return line;
      const idx = Number(match[1]);
      if (idx >= edgeCount || seen.has(idx)) return null;
      seen.add(idx);
      return `    linkStyle ${idx} ${match[2].replace(/;$/, '')};`;
    })
    .filter(line => line !== null)
    .join('\n');
}

export { callModel, resolveModels };

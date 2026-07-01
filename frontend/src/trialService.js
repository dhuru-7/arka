/**
 * trialService.js — ARKA Trial Mode Service
 * Manages the one-time trial experience for new users.
 * Trial completion is persisted in Firestore (source of truth)
 * and cached in localStorage for fast reads.
 */

import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

const TRIAL_CACHE_KEY = 'arka_trial_completed';
const TRIAL_STEP_KEY = 'arka_trial_step';

// ─── Trial Status ───

/** Fast check: has user completed the trial? (localStorage cache) */
export function isTrialMode() {
  return localStorage.getItem(TRIAL_CACHE_KEY) !== 'true';
}

/** 
 * Sync trial status from Firestore into localStorage.
 * Call once after auth resolves. Returns true if trial is still active.
 */
export async function checkTrialStatus(uid) {
  if (!uid) return true;
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists() && userDoc.data().trialCompleted === true) {
      localStorage.setItem(TRIAL_CACHE_KEY, 'true');
      return false; // Trial already done
    }
    // Trial not completed — make sure cache reflects that
    localStorage.removeItem(TRIAL_CACHE_KEY);
    return true; // Trial still active
  } catch (err) {
    console.error('Failed to check trial status from Firestore:', err);
    // Fall back to localStorage cache
    return localStorage.getItem(TRIAL_CACHE_KEY) !== 'true';
  }
}

/**
 * Mark trial as completed. Writes to Firestore + localStorage.
 */
export async function completeTrial(uid) {
  localStorage.setItem(TRIAL_CACHE_KEY, 'true');
  localStorage.removeItem(TRIAL_STEP_KEY);
  if (!uid) return;
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      await updateDoc(userRef, { trialCompleted: true });
    } else {
      await setDoc(userRef, { trialCompleted: true });
    }
  } catch (err) {
    console.error('Failed to persist trial completion to Firestore:', err);
    // localStorage is already set, so the user won't see it again
  }
}

// ─── Trial API calls (go through backend proxy) ───

export async function trialSuggestDiagramType(prompt, signal) {
  const res = await fetch('/api/trial/suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
    signal
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Trial suggest failed: ${res.status}`);
  }
  return res.json();
}

export async function trialGenerateDiagram(prompt, diagramType, options = {}) {
  const res = await fetch('/api/trial/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, diagramType }),
    signal: options.signal
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Trial generate failed: ${res.status}`);
  }

  // Parse NDJSON streaming response (same format as agent/generate)
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
            if (options.onProgress) options.onProgress(data.content);
          } else if (data.type === 'result') {
            result = data.content;
          } else if (data.type === 'error') {
            throw new Error(data.content);
          }
        } catch (e) {
          if (e.message && e.message.indexOf('Error') !== -1) throw e;
        }
      }
    }
  }

  if (!result) throw new Error('Trial agent failed to return a result.');
  return result;
}

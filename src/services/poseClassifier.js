// On-device form quality classifier.
// -----------------------------------------------------------------------------
// Loads the same MLP that runs on the backend (pose_classifier.tflite, 18-feature
// input, 4-class output: poor / average / good / elite) so the app can score
// reps locally when the network is offline OR when we want to halve round-trip
// latency on the in-camera HUD.
//
// Inputs MUST be in the order declared in assets/norm_params.json `features`,
// normalized via (x - mean) / std with the cached params from the same file.
// We do this in JS — the model is small (19KB) and inference is sub-ms on a
// modern Android phone, so the win is in skipping JPEG encoding + upload.
//
// Usage:
//   import { classifyForm, isReady } from './services/poseClassifier'
//   await waitUntilReady()
//   const result = classifyForm({ hip_angle_l: 95, ..., limb_symmetry_idx: 0.97 }, 'vertical_jump')

import { loadTensorflowModel } from 'react-native-fast-tflite'
import normParams from '../../assets/norm_params.json'
import meta from '../../assets/pose_classifier_meta.json'

const SPORT_INDEX = {
    general: 0,
    vertical_jump: 0,
    squat: 1,
    push_up: 2,
    pull_up: 3,
    sprint: 4,
    snatch: 5,
    javelin: 6,
    cricket_bat: 7,
}

const FEATURES = normParams.features              // ordered list of 18 names
const MEAN = normParams.mean
const STD  = normParams.std
const LABELS = meta.class_labels                  // ["poor", "average", "good", "elite"]
// Map class → centerline form score (matches backend: poor=30, average=55, good=78, elite=92)
const FORM_SCORE_BY_CLASS = { poor: 30, average: 55, good: 78, elite: 92 }
const FEEDBACK_BY_CLASS = {
    poor:    'Form needs work — slow down and reset alignment.',
    average: 'Decent rep — focus on symmetry and control.',
    good:    'Solid biomechanics — keep this rhythm.',
    elite:   'Elite-tier rep — maintain the pattern.',
}

let _model = null
let _ready = false
let _loadError = null
let _loading = null

export function isReady() {
    return _ready
}

export function getLoadError() {
    return _loadError ? _loadError.message || String(_loadError) : null
}

export async function waitUntilReady(timeoutMs = 5000) {
    if (_ready) return true
    if (_loadError) return false
    if (!_loading) loadModel()
    try {
        await Promise.race([
            _loading,
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
        ])
        return _ready
    } catch {
        return false
    }
}

export function loadModel() {
    if (_loading) return _loading
    _loading = (async () => {
        try {
            _model = await loadTensorflowModel(require('../../assets/pose_classifier.tflite'))
            _ready = true
            console.log('[poseClassifier] model loaded')
        } catch (e) {
            _loadError = e
            _ready = false
            console.warn('[poseClassifier] load failed:', e?.message)
        }
    })()
    return _loading
}

function _normalize(raw) {
    const out = new Float32Array(FEATURES.length)
    for (let i = 0; i < FEATURES.length; i++) {
        const std = STD[i] || 1
        out[i] = (raw[i] - MEAN[i]) / std
    }
    return out
}

function _softmax(logits) {
    let max = -Infinity
    for (const v of logits) if (v > max) max = v
    let sum = 0
    const exps = new Float32Array(logits.length)
    for (let i = 0; i < logits.length; i++) { exps[i] = Math.exp(logits[i] - max); sum += exps[i] }
    if (sum === 0) return exps
    for (let i = 0; i < exps.length; i++) exps[i] /= sum
    return exps
}

/** Build the 18-feature input vector in the order the model was trained on. */
function _buildRaw(frame, sport) {
    const raw = new Array(FEATURES.length)
    for (let i = 0; i < FEATURES.length; i++) {
        const name = FEATURES[i]
        if (name === 'sport_idx') {
            raw[i] = (SPORT_INDEX[sport] ?? 0) / 4.0
            continue
        }
        const v = frame[name]
        raw[i] = (typeof v === 'number' && !Number.isNaN(v)) ? v : 0
    }
    return raw
}

/** Run inference. Returns null if the model isn't available; caller should
 *  fall back to backend scoring in that case. */
export async function classifyForm(frame, sport = 'vertical_jump') {
    if (!_ready) {
        if (!_loading) loadModel()
        return null
    }
    try {
        const raw = _buildRaw(frame, sport)
        const input = _normalize(raw)
        const out = await _model.run([input])
        const logits = Array.from(out[0])
        const probs = _softmax(logits)

        let bestIdx = 0
        for (let i = 1; i < probs.length; i++) if (probs[i] > probs[bestIdx]) bestIdx = i
        const quality = LABELS[bestIdx] || 'unknown'

        // Confidence-weighted form score so a high-confidence "good" returns
        // ~78 and a low-confidence "good" pulls toward the next-class average.
        const top = probs[bestIdx]
        const baseScore = FORM_SCORE_BY_CLASS[quality] ?? 50
        const formScore = Math.round(baseScore * (0.6 + 0.4 * top))

        return {
            form_score: formScore,
            form_quality: quality,
            primary_feedback: FEEDBACK_BY_CLASS[quality] || '',
            confidence: top,
            scores: Object.fromEntries(LABELS.map((l, i) => [l, probs[i]])),
            source: 'on-device',
        }
    } catch (e) {
        console.warn('[poseClassifier] inference failed:', e?.message)
        return null
    }
}

// Kick off load eagerly so the first classifyForm() call is instant.
loadModel()

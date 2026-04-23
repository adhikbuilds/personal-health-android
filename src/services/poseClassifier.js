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
// Requires React Native's New Architecture (TurboModules) — react-native-fast-
// tflite v3 routes through react-native-nitro-modules which won't load on the
// old bridge. gradle.properties has newArchEnabled=true; if you ever roll
// back, set this file's loadModel() to a no-op so the missing native module
// doesn't crash app startup.

import normParams from '../../assets/norm_params.json'
import meta from '../../assets/pose_classifier_meta.json'

// Lazy require of fast-tflite so a missing native side fails on first model
// load (recoverable) instead of crashing app startup.
let _loadTensorflowModel = null
try {
    _loadTensorflowModel = require('react-native-fast-tflite').loadTensorflowModel
} catch (e) {
    console.warn('[poseClassifier] fast-tflite not available:', e?.message)
}

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
    if (!_loadTensorflowModel) {
        _loadError = new Error('react-native-fast-tflite not available')
        _loading = Promise.resolve()
        return _loading
    }
    _loading = (async () => {
        try {
            _model = await _loadTensorflowModel(require('../../assets/pose_classifier.tflite'))
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

/** Run inference. Returns null if the model isn't ready; callers should fall
 *  back to the backend in that case. */
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

// Don't kick off load eagerly — wait until the first classifyForm() call so a
// failing native module doesn't bring down app startup. TrainScreen calls
// classifyForm() in its catch path, which lazily triggers loadModel().

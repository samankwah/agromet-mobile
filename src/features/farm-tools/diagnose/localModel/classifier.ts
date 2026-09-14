import type { TfliteModel } from 'react-native-fast-tflite';

import { CASSAVA_CLASS_IDS, MODEL_INPUT_SIZE, type CassavaClassId } from './labels';
import { preprocessImage } from './preprocess';

/**
 * Runs the bundled cassava model on a photo, with no network involved.
 *
 * The online path (shared/api/diagnosisService.ts) reaches a commercial API
 * covering two dozen crops and returns treatment prose with it. This covers one
 * crop and returns an index. What it has instead is availability: it is the only
 * path that works in a field with no signal, which is where the farmers this app
 * is built for actually are.
 */

/** Bundled by metro thanks to the `tflite` assetExt in metro.config.js. */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const MODEL_ASSET = require('../../../../../assets/models/cassava.tflite');

/**
 * Reached for only when inference actually runs, never at import time.
 *
 * `react-native-fast-tflite` calls `NitroModules.createHybridObject()` at module
 * top level, so merely importing it throws wherever the native module is
 * absent: Expo Go, and any JS-only runtime. Importing it statically here meant
 * that `useDiagnose` -> `localModel` -> `classifier` took the whole diagnose
 * screen down on those runtimes, including the online path, which does not need
 * the model at all.
 *
 * A farmer on a build without the native module should lose offline diagnosis
 * and nothing else. Hence the require sits inside the function.
 */
function loadNativeModule(): typeof import('react-native-fast-tflite') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('react-native-fast-tflite');
}

/** True when this build can run the model at all. */
export function isLocalModelSupported(): boolean {
  try {
    loadNativeModule();
    return true;
  } catch {
    return false;
  }
}

export type Prediction = {
  classId: CassavaClassId;
  /** Softmax output for the winning class, 0 to 1. */
  confidence: number;
};

/**
 * Loaded once and kept.
 *
 * Loading parses and allocates the whole graph, which is slow enough to be felt
 * between two diagnoses in a row. The model is a few megabytes and immutable,
 * so there is nothing to invalidate and no reason to pay that cost twice.
 */
let modelPromise: Promise<TfliteModel> | null = null;

/**
 * Fail loudly when the bundled model is not the one this code was written for.
 *
 * A model with a different input size or a different number of classes still
 * loads and still returns numbers. Those numbers would be read through
 * `CASSAVA_CLASS_IDS` and turned into a confident diagnosis of the wrong
 * disease. There is no runtime symptom to notice, so the check has to happen
 * here, at load, rather than being left to show up as poor accuracy later.
 */
function assertModelMatchesContract(model: TfliteModel): void {
  const input = model.inputs[0];
  const output = model.outputs[0];

  if (!input || !output) {
    throw new Error('Bundled model exposes no input or output tensor.');
  }

  // [batch, height, width, channels]
  const [, height, width, channels] = input.shape;
  if (height !== MODEL_INPUT_SIZE || width !== MODEL_INPUT_SIZE || channels !== 3) {
    throw new Error(
      `Bundled model expects ${height}x${width}x${channels}, but preprocessing produces ${MODEL_INPUT_SIZE}x${MODEL_INPUT_SIZE}x3.`,
    );
  }

  const classCount = output.shape[output.shape.length - 1];
  if (classCount !== CASSAVA_CLASS_IDS.length) {
    throw new Error(
      `Bundled model predicts ${classCount} classes, but ${CASSAVA_CLASS_IDS.length} labels are defined.`,
    );
  }
}

export async function loadClassifier(): Promise<TfliteModel> {
  if (!modelPromise) {
    modelPromise = loadNativeModule()
      .loadTensorflowModel(MODEL_ASSET, [])
      .then((model) => {
        assertModelMatchesContract(model);
        return model;
      })
      .catch((error: unknown) => {
        // Clear the cache so a later attempt retries instead of re-throwing a
        // stale rejection forever. A load can fail for reasons that do not
        // recur, such as memory pressure while another app was in the
        // foreground.
        modelPromise = null;
        throw error;
      });
  }
  return modelPromise;
}

/** Highest-scoring class and its score. */
function argmax(scores: Float32Array): Prediction {
  let bestIndex = 0;
  for (let i = 1; i < scores.length; i += 1) {
    if (scores[i] > scores[bestIndex]) {
      bestIndex = i;
    }
  }
  return { classId: CASSAVA_CLASS_IDS[bestIndex], confidence: scores[bestIndex] };
}

/**
 * Classify a photo. Throws if the model cannot be loaded or the image cannot be
 * decoded; callers turn that into a `DiagnosisUnavailable` rather than showing
 * the farmer an error about tensors.
 */
export async function classifyImage(imageUri: string): Promise<Prediction> {
  const model = await loadClassifier();
  const { data } = await preprocessImage(imageUri);

  const outputs = await model.run([data.buffer as ArrayBuffer]);
  const scores = new Float32Array(outputs[0]);

  if (scores.length !== CASSAVA_CLASS_IDS.length) {
    throw new Error(`Model returned ${scores.length} scores for ${CASSAVA_CLASS_IDS.length} classes.`);
  }

  return argmax(scores);
}

/** Test seam. Nothing in the app should need to drop a loaded model. */
export function resetClassifierForTests(): void {
  modelPromise = null;
}

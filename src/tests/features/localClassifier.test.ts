import { encode as encodeJpeg } from 'jpeg-js';

import { adaptPrediction, isCropSupportedOffline } from '../../features/farm-tools/diagnose/localModel/adapter';
import { classifyImage, resetClassifierForTests } from '../../features/farm-tools/diagnose/localModel/classifier';
import { CASSAVA_KNOWLEDGE_BASE } from '../../features/farm-tools/diagnose/localModel/knowledgeBase';
import { MODEL_INPUT_SIZE } from '../../features/farm-tools/diagnose/localModel/labels';
import { preprocessImage } from '../../features/farm-tools/diagnose/localModel/preprocess';
import { isDiagnosisUnavailable, type DiagnosisRequest } from '../../shared/domain/diagnosis';

/**
 * The on-device path, from a JPEG on disk to something a farmer can read.
 *
 * The JPEG is genuinely encoded and genuinely decoded here rather than mocked
 * away, because the decode step is where this feature is most likely to be
 * quietly wrong: a channel order swap or a stray normalisation produces a
 * perfectly valid tensor that means something different from the picture, and
 * nothing downstream can notice.
 */

/** Solid-colour 224x224 JPEG, encoded for real so the real decoder runs. */
function solidJpeg(r: number, g: number, b: number, size = MODEL_INPUT_SIZE): Uint8Array {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i += 1) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  // Quality 100: this fixture is compared against expected channel values, and
  // there is no reason to spend accuracy on compressing a test image.
  return new Uint8Array(encodeJpeg({ data, width: size, height: size }, 100).data);
}

let currentJpeg = solidJpeg(200, 100, 50);
let resizedTo: { width?: number; height?: number } | null = null;

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(async (uri: string, actions: { resize?: { width: number; height: number } }[]) => {
    mockRecordResize(actions[0]?.resize ?? null);
    return { uri };
  }),
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('expo-file-system', () => ({
  File: class {
    async bytes() {
      return mockCurrentJpeg();
    }
  },
}));

// Bridged through `mock`-prefixed globals: jest hoists the factories above the
// `let` declarations, so they cannot close over the variables directly.
function mockCurrentJpeg() {
  return currentJpeg;
}
function mockRecordResize(resize: { width: number; height: number } | null) {
  resizedTo = resize;
}
(globalThis as Record<string, unknown>).mockCurrentJpeg = mockCurrentJpeg;
(globalThis as Record<string, unknown>).mockRecordResize = mockRecordResize;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const tflite = require('react-native-fast-tflite');

const request: DiagnosisRequest = {
  crop: 'cassava',
  growthStage: 'vegetative',
  symptoms: 'yellow patches on the leaves',
  imageUri: 'file:///leaf.jpg',
};

beforeEach(() => {
  tflite.__reset();
  resetClassifierForTests();
  currentJpeg = solidJpeg(200, 100, 50);
  resizedTo = null;
});

describe('preprocessImage', () => {
  it('produces the tensor shape the model declares', async () => {
    const { data, shape } = await preprocessImage('file:///leaf.jpg');

    expect(shape).toEqual([1, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE, 3]);
    expect(data).toHaveLength(MODEL_INPUT_SIZE * MODEL_INPUT_SIZE * 3);
  });

  it('resizes to the model input rather than trusting the upload-sized photo', async () => {
    await preprocessImage('file:///leaf.jpg');

    // compressImage() produces a 1280px-wide image for upload. Decoding that in
    // JavaScript is roughly thirty times the pixels for the same picture.
    expect(resizedTo).toEqual({ width: MODEL_INPUT_SIZE, height: MODEL_INPUT_SIZE });
  });

  it('leaves pixels at 0-255 because MobileNetV3 rescales internally', async () => {
    const { data } = await preprocessImage('file:///leaf.jpg');

    // The bug this guards against is a normalisation to 0-1 that looks tidy,
    // raises no error, and halves the input range the model was trained on.
    // ml/scripts/model_def.py is the other half of the contract.
    let max = 0;
    for (let i = 0; i < data.length; i += 1) max = Math.max(max, data[i]);
    expect(max).toBeGreaterThan(1);
  });

  it('keeps RGB in order and drops alpha', async () => {
    currentJpeg = solidJpeg(200, 100, 50);

    const { data } = await preprocessImage('file:///leaf.jpg');

    // JPEG is lossy even at quality 100, so this asserts the channels are the
    // right ones in the right order, not that they survived byte-exact. A
    // BGR swap or a retained alpha channel misses by far more than 12.
    expect(data[0]).toBeCloseTo(200, -1);
    expect(data[1]).toBeCloseTo(100, -1);
    expect(data[2]).toBeCloseTo(50, -1);
  });

  it('refuses an image that is not the size it asked for', async () => {
    // The manipulator returned something other than what was requested. Feeding
    // the model a wrongly shaped tensor and reading the output as a diagnosis
    // is the failure worth preventing.
    currentJpeg = solidJpeg(10, 10, 10, 64);

    await expect(preprocessImage('file:///leaf.jpg')).rejects.toThrow(/64x64/);
  });
});

describe('classifyImage', () => {
  it('returns the highest-scoring class', async () => {
    tflite.__setScores([0.05, 0.05, 0.05, 0.8, 0.05]);

    const prediction = await classifyImage('file:///leaf.jpg');

    expect(prediction.classId).toBe('cmd');
    expect(prediction.confidence).toBeCloseTo(0.8, 5);
  });

  it('loads the model once across repeated diagnoses', async () => {
    await classifyImage('file:///leaf.jpg');
    await classifyImage('file:///leaf.jpg');

    // Parsing and allocating the graph is slow enough to be felt between two
    // diagnoses in a row, and the model is immutable.
    expect(tflite.loadTensorflowModel).toHaveBeenCalledTimes(1);
  });

  it('rejects a bundled model whose class count does not match the labels', async () => {
    // A three-class model still loads and still returns numbers. Those numbers
    // would be read through CASSAVA_CLASS_IDS and reported as a confident
    // diagnosis of the wrong disease, with no runtime symptom to notice.
    tflite.__setTensors(null, [{ name: 'probabilities', dataType: 'float32', shape: [1, 3] }]);

    await expect(classifyImage('file:///leaf.jpg')).rejects.toThrow(/3 classes/);
  });

  it('rejects a bundled model expecting a different input size', async () => {
    tflite.__setTensors([{ name: 'image', dataType: 'float32', shape: [1, 300, 300, 3] }], null);

    await expect(classifyImage('file:///leaf.jpg')).rejects.toThrow(/300x300/);
  });

  it('retries loading after a failure instead of caching the rejection', async () => {
    tflite.__failLoad(new Error('out of memory'));
    await expect(classifyImage('file:///leaf.jpg')).rejects.toThrow('out of memory');

    // A load can fail for reasons that do not recur, such as memory pressure
    // while another app was in the foreground.
    tflite.__failLoad(null);
    tflite.__setScores([0.9, 0.025, 0.025, 0.025, 0.025]);

    await expect(classifyImage('file:///leaf.jpg')).resolves.toMatchObject({ classId: 'cbb' });
  });
});

describe('adaptPrediction', () => {
  it('reports a confident prediction with its advice attached', () => {
    const outcome = adaptPrediction({ classId: 'cmd', confidence: 0.82 }, request);

    if (isDiagnosisUnavailable(outcome)) throw new Error('expected a diagnosis');
    expect(outcome.likelyIssue).toBe('Cassava Mosaic Disease');
    expect(outcome.immediateActions).toEqual(CASSAVA_KNOWLEDGE_BASE.cmd.immediateActions);
    expect(outcome.preventionGuidance).toEqual(CASSAVA_KNOWLEDGE_BASE.cmd.preventionGuidance);
  });

  it('marks the result as the on-device model', () => {
    const outcome = adaptPrediction({ classId: 'healthy', confidence: 0.91 }, request);

    if (isDiagnosisUnavailable(outcome)) throw new Error('expected a diagnosis');
    // The two engines are not equally capable, and the farmer reading the answer
    // is entitled to know which one produced it.
    expect(outcome.source).toBe('offline-model');
  });

  it('claims no observed evidence, because a classifier reports none', () => {
    const outcome = adaptPrediction({ classId: 'cbsd', confidence: 0.77 }, request);

    if (isDiagnosisUnavailable(outcome)) throw new Error('expected a diagnosis');
    // The online provider returns the symptoms it says it saw. Filling this with
    // the disease's textbook symptoms would read as "the model saw these", which
    // is a claim a convolutional classifier cannot support.
    expect(outcome.evidence).toEqual([]);
  });

  it('declines to answer below the reportable floor', () => {
    // The commercial provider refuses at exactly this score. A weaker model has
    // less licence to guess, not more.
    const outcome = adaptPrediction({ classId: 'cmd', confidence: 0.44 }, request);

    expect(isDiagnosisUnavailable(outcome)).toBe(true);
  });

  it('answers at the floor itself', () => {
    const outcome = adaptPrediction({ classId: 'cmd', confidence: 0.45 }, request);

    expect(isDiagnosisUnavailable(outcome)).toBe(false);
  });
});

describe('isCropSupportedOffline', () => {
  it.each([
    ['cassava', true],
    ['Cassava', true],
    ['  cassava  ', true],
    ['maize', false],
    [undefined, false],
  ])('treats %s as supported: %s', (crop, expected) => {
    // Feeding a maize leaf to a cassava-only model does not error, it returns a
    // cassava disease name with a confident-looking score on it.
    expect(isCropSupportedOffline(crop as string | undefined)).toBe(expected);
  });
});

describe('when the native module is absent (Expo Go, JS-only runtimes)', () => {
  /**
   * `react-native-fast-tflite` creates Nitro hybrid objects at module top
   * level, so importing it throws wherever the native side is not compiled in.
   *
   * This once took the entire diagnose screen down on iOS, because a static
   * import at the top of classifier.ts propagated up through localModel and
   * useDiagnose. The online path does not need the model at all, so losing it
   * too was pure collateral damage.
   */
  const modulePath = 'react-native-fast-tflite';

  afterEach(() => {
    jest.dontMock(modulePath);
    jest.resetModules();
  });

  it('reports the model as unsupported instead of throwing on import', () => {
    jest.resetModules();
    jest.doMock(modulePath, () => {
      throw new Error('NitroModules are not supported in Expo Go');
    });

    // Requiring the module must not throw, which is the whole point.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const classifier = require('../../features/farm-tools/diagnose/localModel/classifier');
    expect(classifier.isLocalModelSupported()).toBe(false);
  });

  it('declines the diagnosis with a reason rather than crashing the screen', async () => {
    jest.resetModules();
    jest.doMock(modulePath, () => {
      throw new Error('NitroModules are not supported in Expo Go');
    });

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { diagnoseOffline } = require('../../features/farm-tools/diagnose/localModel/adapter');
    const outcome = await diagnoseOffline(request);

    expect(outcome.status).toBe('unavailable');
    // Says the build is the problem, not the photo: no amount of retrying or
    // better light will change this one.
    expect(outcome.reason).toMatch(/cannot check crops offline/i);
  });
});

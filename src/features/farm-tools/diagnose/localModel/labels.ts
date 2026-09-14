/**
 * Class order for the bundled model.
 *
 * A classifier returns an index, not a name, so this array *is* the meaning of
 * the model's output. If it disagrees with the order the model was trained on,
 * every diagnosis is confidently wrong with no error anywhere, which is why the
 * exported `labels.json` sidecar carries the same list and `classifier.ts`
 * refuses to load a model whose sidecar does not match.
 *
 * Mirrors `CLASS_IDS` in `ml/scripts/model_def.py`.
 */
export const CASSAVA_CLASS_IDS = ['cbb', 'cbsd', 'cgm', 'cmd', 'healthy'] as const;

export type CassavaClassId = (typeof CASSAVA_CLASS_IDS)[number];

/**
 * The lowest score worth reporting at all.
 *
 * The same number as `MIN_REPORTABLE_CONFIDENCE` in `backend/app/diagnosis.py`
 * and the floor in `shared/utils/confidenceBucket.ts`, and now also the value
 * the measurements support rather than one inherited from them.
 *
 * Measured on 400 held-out test images (ml/scripts/compare_tflite.py), the
 * trade between how often the model answers and how often it is right:
 *
 * | floor | answers | correct when it answers |
 * |-------|---------|-------------------------|
 * | 0.40  |  90.2%  |          77.8%          |
 * | 0.45  |  83.0%  |          80.1%          |
 * | 0.55  |  67.8%  |          83.0%          |
 * | 0.70  |  43.8%  |          90.3%          |
 *
 * 0.45 is the chosen point. Raising it buys accuracy at a steep price in
 * coverage: at 0.70 the model is right nine times in ten but says nothing to
 * more than half of the farmers who photograph a leaf, and a tool that usually
 * refuses is a tool nobody opens twice. At 0.45 roughly one reported diagnosis
 * in five is wrong, which is why the result is framed as decision support and
 * every answer carries the disclaimer telling the farmer to confirm with an
 * extension officer before spending money.
 *
 * Re-derive this from the same script whenever the model is retrained.
 */
export const MIN_REPORTABLE_CONFIDENCE = 0.45;

/** Input edge length the model was built for. See ml/scripts/model_def.py. */
export const MODEL_INPUT_SIZE = 224;

/** Shape of the labels.json written next to the model by the export script. */
export type ModelSidecar = {
  classIds: string[];
  inputSize: number;
  inputRange: [number, number];
  quantization: string;
};

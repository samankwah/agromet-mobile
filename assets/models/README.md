# assets/models

`cassava.tflite` is bundled into the app and loaded by
`src/features/farm-tools/diagnose/localModel/classifier.ts`. It is what makes
crop diagnosis work with no network.

## What this model is

MobileNetV3-Small with a trained classification head, 3.59 MB, five classes.
Trained by `ml/scripts/train_local.py` on the TFDS `cassava` dataset (Mwebaze et
al., Ugandan field photographs, 5,656 training images).

Measured on the 1,885-image held-out test split:

| | precision | recall | F1 | support |
|---|---|---|---|---|
| cbb | 0.373 | 0.484 | 0.421 | 155 |
| cbsd | 0.742 | 0.634 | 0.684 | 481 |
| cgm | 0.571 | 0.605 | 0.588 | 258 |
| cmd | 0.875 | 0.813 | 0.843 | 886 |
| healthy | 0.514 | 0.867 | 0.645 | 105 |

**Overall accuracy 71.5%**, macro F1 0.636. For reference, always answering the
majority class (CMD) would score 47%, so the model has learned something real,
and it is nowhere near good enough to be trusted without the disclaimer.

Cassava bacterial blight is the weak class: at 0.373 precision, most CBB
diagnoses this model reports are wrong. Worth stating in the report rather than
hiding behind the headline accuracy.

Full numbers, including the confusion matrix, are in `ml/models/metrics.json`.

### Known limitations

- Trained with the backbone frozen and **no augmentation**, because features are
  cached to make CPU training viable. The Kaggle notebook in `ml/notebooks`
  augments and fine-tunes properly and should beat this.
- Trained and tested on Ugandan photographs. Performance on Ghanaian farms is
  unmeasured until the field set in `ml/data/FIELD_COLLECTION.md` exists.

## Why it is not quantized

Dynamic-range quantization takes it to 1.08 MB and holds overall accuracy
(0.7500 vs 0.7475), but changes the predicted label on about 10% of test images,
with probability gaps up to 0.36. On a model already at ~75%, that churn is not
worth 2.5 MB, and 3.59 MB sits comfortably inside the under-10 MB budget the
on-device design assumes. `ml/scripts/compare_tflite.py` re-runs that comparison.

## Retraining

```bash
./ml/.venv/Scripts/python.exe ml/scripts/train_local.py
./ml/.venv/Scripts/python.exe ml/scripts/export_tflite.py --model ml/models/cassava.keras
cp ml/models/cassava.tflite ml/models/labels.json mobile/assets/models/
```

Then re-derive the confidence floor in `localModel/labels.ts` from
`compare_tflite.py`, because the old threshold describes the old model.

## Why `labels.json` sits next to it

Class order *is* the meaning of the model's output: index 3 is a diagnosis of
Cassava Mosaic Disease only because both sides agree it is. If the app's list
and the trained model's list ever disagree, every diagnosis is confidently wrong
and nothing raises an error.

So the export writes the order it actually trained on into `labels.json`, and
`classifier.ts` refuses to load a model whose class count does not match
`CASSAVA_CLASS_IDS`. `ml/scripts/model_def.py` is the single definition both
sides are derived from.

The same file records the input contract: **0-255 float32, not 0-1**.
MobileNetV3 rescales internally, so normalising in the app would halve the input
range the model was trained on, cost accuracy, and raise no error anywhere.

## Testing the offline path needs a release build

`loadTensorflowModel()` resolves a `require()`d asset through
`Image.resolveAssetSource`. In a **debug** build that returns a metro URL, so
the model is fetched over HTTP from the dev server on every cold start. In a
release build it resolves to the file bundled in the APK.

The practical consequence: putting a debug build into airplane mode does not
test offline diagnosis, it tests what happens when the model cannot be fetched
at all. That path is handled (the diagnosis comes back unavailable and the photo
is queued) but it is not the feature.

To exercise the model on a debug build, turn on **Settings, Diagnose crops on
this phone**, which forces the on-device path while metro is still reachable.
To test genuine offline behaviour, build release:

```bash
cd mobile/android && ./gradlew assembleRelease
```

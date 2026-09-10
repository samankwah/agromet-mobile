import * as ImageManipulator from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { decode as decodeJpeg } from 'jpeg-js';

import { MODEL_INPUT_SIZE } from './labels';

/**
 * A photo on disk into the tensor the model expects.
 *
 * `react-native-fast-tflite` wants a Float32Array; what we have is a JPEG file.
 * Nothing in React Native decodes an image to pixels for us, so the path is
 * resize, read bytes, decode, and flatten, in that order.
 *
 * The resize comes first so the JPEG being decoded in JavaScript is 224px
 * rather than the 1280px one `compressImage()` produced. Decoding the large one
 * and downsampling afterwards would be the same picture and roughly thirty
 * times the pixels through a pure-JS decoder.
 */

/** The decoder returns RGBA; the model takes RGB. */
const RGBA_CHANNELS = 4;
const RGB_CHANNELS = 3;

export type PreprocessedImage = {
  data: Float32Array;
  /** Kept alongside the buffer because the caller has to hand fast-tflite a
   * shape, and deriving it from `data.length` twice invites the two to differ. */
  shape: [number, number, number, number];
};

/**
 * Resize to exactly the model's input, held separate from `compressImage()`.
 *
 * `compressImage` resizes by width alone and preserves aspect ratio, which is
 * right for a photo being uploaded and wrong here: the model has a fixed square
 * input, so this squashes rather than crops. Squashing keeps the whole leaf in
 * frame, and the training pipeline resizes the same way, so the distortion is
 * one the model has seen throughout training rather than a surprise at
 * inference.
 */
async function resizeToModelInput(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MODEL_INPUT_SIZE, height: MODEL_INPUT_SIZE } }],
    // Quality 1.0 because this file exists for about a millisecond and is read
    // by a model, not sent anywhere. Compression artefacts here are noise fed
    // straight into the classifier for no saving worth having.
    { compress: 1, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}

export async function preprocessImage(uri: string): Promise<PreprocessedImage> {
  const resizedUri = await resizeToModelInput(uri);
  const bytes = await new File(resizedUri).bytes();

  // useTArray keeps the result a Uint8Array. Without it jpeg-js reaches for
  // Buffer, which React Native does not provide.
  const decoded = decodeJpeg(bytes, { useTArray: true });

  if (decoded.width !== MODEL_INPUT_SIZE || decoded.height !== MODEL_INPUT_SIZE) {
    // The resize is explicit about both dimensions, so this means the
    // manipulator did something other than what was asked. Better to refuse
    // than to feed the model a tensor of the wrong shape and read whatever
    // comes back as a diagnosis.
    throw new Error(
      `Expected a ${MODEL_INPUT_SIZE}x${MODEL_INPUT_SIZE} image, got ${decoded.width}x${decoded.height}`,
    );
  }

  const pixelCount = MODEL_INPUT_SIZE * MODEL_INPUT_SIZE;
  const data = new Float32Array(pixelCount * RGB_CHANNELS);

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const from = pixel * RGBA_CHANNELS;
    const to = pixel * RGB_CHANNELS;
    // Values stay at 0-255. MobileNetV3 carries its own rescaling layer, so
    // normalising here would halve the input range the model was trained on and
    // quietly cost accuracy. ml/scripts/model_def.py is the other half of this
    // contract, and labels.json records it next to the model.
    data[to] = decoded.data[from];
    data[to + 1] = decoded.data[from + 1];
    data[to + 2] = decoded.data[from + 2];
    // Alpha is dropped rather than composited: these are opaque camera JPEGs,
    // so the channel is a constant 255 carrying no information.
  }

  return { data, shape: [1, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE, RGB_CHANNELS] };
}

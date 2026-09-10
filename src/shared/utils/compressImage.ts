import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Shrink a photo before it goes anywhere.
 *
 * Applied before the image reaches app state, a queue, or the network: on a
 * low-cost phone over a rural connection, a full-resolution camera capture is
 * both a memory problem and an upload that will not finish. 1280px is well
 * above what a disease classifier uses.
 *
 * Lived inside `PhotoCapture` until the chat could attach a photo too, which is
 * the second consumer and where this codebase moves a helper into the shared
 * kit.
 */
const MAX_DIMENSION = 1280;
const COMPRESS_QUALITY = 0.6;

export async function compressImage(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: MAX_DIMENSION } }], {
    compress: COMPRESS_QUALITY,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return result.uri;
}

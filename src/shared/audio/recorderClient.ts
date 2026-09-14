import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';

/**
 * The only module that imports `expo-audio`'s permission surface.
 *
 * Same shape as `shared/notifications/notificationClient.ts`, and for the same
 * reason: keeping the native call behind one module means everything above it
 * is testable, and there is one place to look when the platform behaviour
 * changes.
 *
 * Nothing here throws. A microphone that cannot be reached is a state to
 * render, not an exception to catch at every call site.
 */

export type MicPermissionState = 'unknown' | 'granted' | 'undetermined' | 'denied';

/**
 * `undetermined` and `denied` are kept apart deliberately. The first means the
 * farmer has not been asked yet and a prompt will appear; the second means the
 * OS will show nothing and the only way through is Settings. Collapsing them
 * into a boolean produces a button that silently does nothing.
 */
export async function getMicPermissionState(): Promise<MicPermissionState> {
  try {
    const permission = await getRecordingPermissionsAsync();
    if (permission.granted) return 'granted';
    return permission.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'unknown';
  }
}

/**
 * Ask for the microphone, at the moment the farmer taps the mic.
 *
 * Not at launch: a prompt that arrives with a reason attached is granted far
 * more often than one that interrupts a farmer who has not asked for anything.
 */
export async function ensureMicPermission(): Promise<MicPermissionState> {
  try {
    const current = await getRecordingPermissionsAsync();
    if (current.granted) return 'granted';
    // Already permanently refused: requesting again shows nothing at all, so
    // report it rather than appearing to hang.
    if (!current.canAskAgain) return 'denied';

    const requested = await requestRecordingPermissionsAsync();
    if (requested.granted) return 'granted';
    return requested.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'denied';
  }
}

/**
 * Let the recorder capture on iOS.
 *
 * Without this the session stays in playback mode and recording produces
 * silence rather than an error, which is the worst kind of failure: the farmer
 * speaks, the app looks like it is listening, and the transcript comes back
 * empty with nothing to explain it.
 */
export async function prepareForRecording(): Promise<void> {
  try {
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
  } catch {
    // Best effort. A failure here shows up as a failed recording, which is
    // already handled, and throwing would lose the farmer's tap for a reason
    // they cannot act on.
  }
}

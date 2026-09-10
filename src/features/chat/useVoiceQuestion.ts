import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { RecordingPresets, useAudioRecorder, useAudioRecorderState } from 'expo-audio';

import { transcribeRecording } from '../../shared/api/transcriptionService';
import { ensureMicPermission, prepareForRecording } from '../../shared/audio/recorderClient';

/**
 * Ask by speaking instead of typing.
 *
 * The transcript is handed back for the caller to put in the draft, never sent
 * straight off. Speech recognition of accented English over a rural connection
 * is not reliable enough to send unread, and a misheard question answered
 * confidently is worse than no question at all.
 */

/**
 * A minute is a long spoken question, and past it the upload starts to matter
 * on a poor connection. Recording stops itself here rather than waiting for a
 * farmer who has walked away from the phone.
 */
export const MAX_RECORDING_MS = 60_000;

export type VoiceState = 'idle' | 'recording' | 'transcribing';

export function useVoiceQuestion(onTranscript: (text: string) => void, onNotice: (message: string) => void) {
  // LOW_QUALITY is right, not a compromise: speech recognition gains nothing
  // from music-grade audio, and the file has to cross a rural connection.
  const recorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [state, setState] = useState<VoiceState>('idle');

  // Read inside the auto-stop timer, which would otherwise close over the
  // value of `state` at the moment the recording began.
  const stateRef = useRef(state);
  stateRef.current = state;

  const finish = useCallback(async () => {
    setState('transcribing');
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) {
        onNotice('That recording did not save. Try again, or type your question.');
        return;
      }

      const text = await transcribeRecording(uri);
      if (!text) {
        onNotice('No words were picked up. Try again somewhere quieter, or type your question.');
        return;
      }
      onTranscript(text);
    } catch {
      onNotice('Could not turn that recording into text. Try again, or type your question.');
    } finally {
      setState('idle');
    }
  }, [recorder, onNotice, onTranscript]);

  const start = useCallback(async () => {
    const permission = await ensureMicPermission();

    if (permission === 'denied') {
      // Asking again shows nothing at all, so send them where it can be
      // changed rather than leaving a button that appears to do nothing.
      onNotice('Microphone access is off. Turn it on in Settings to ask by voice.');
      Linking.openSettings().catch(() => {});
      return;
    }
    if (permission !== 'granted') {
      onNotice('Voice questions need the microphone. Type your question for now.');
      return;
    }

    try {
      await prepareForRecording();
      await recorder.prepareToRecordAsync();
      recorder.record();
      setState('recording');
    } catch {
      onNotice('Could not start recording. Type your question for now.');
      setState('idle');
    }
  }, [recorder, onNotice]);

  /** Throw the recording away. Distinct from stopping, which transcribes it. */
  const cancel = useCallback(async () => {
    setState('idle');
    try {
      await recorder.stop();
    } catch {
      // Nothing to tell the farmer: they asked for this to go away, and it has.
    }
  }, [recorder]);

  useEffect(() => {
    if (state !== 'recording') return;

    const timer = setTimeout(() => {
      if (stateRef.current === 'recording') finish();
    }, MAX_RECORDING_MS);

    return () => clearTimeout(timer);
  }, [state, finish]);

  return {
    state,
    start,
    finish,
    cancel,
    /** Seconds elapsed, so the farmer can see the cap approaching. */
    elapsedSeconds: Math.floor((recorderState.durationMillis ?? 0) / 1000),
  };
}

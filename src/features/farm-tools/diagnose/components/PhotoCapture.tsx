import React, { useRef, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { compressImage } from '../../../../shared/utils/compressImage';
import { Button } from '../../../../shared/ui/Button';
import { Card } from '../../../../shared/ui/Card';
import { Skeleton } from '../../../../shared/ui/Skeleton';
import { Text } from '../../../../shared/ui/Text';

type Props = {
  imageUri: string | undefined;
  onChange: (uri: string | undefined) => void;
};

const CAMERA_DENIED = 'Camera access is off. Turn it on in your device settings, or choose a photo instead.';
const GALLERY_DENIED = 'Photo library access is off. Turn it on in your device settings, or take a photo instead.';
const ATTACH_FAILED = 'Could not attach that photo. Try again, or take a new one.';

/**
 * The photo, which is the one thing this screen cannot do without.
 *
 * Camera and gallery are two direct buttons inside the empty frame, with no
 * chooser sheet in between. That is a bug fix, not a preference: the sheet was
 * an RN `Modal`, and dismissing it only *schedules* an animated
 * UIViewController dismissal that takes 250-350ms. Launching the picker in the
 * same breath meant iOS was asked to present PHPickerViewController while that
 * dismissal was still in flight — so the picker was either torn down with the
 * modal or refused outright, and an iPhone could not attach a photo at all.
 * Nothing resolved and nothing was shown. Android has no equivalent dismissal,
 * which is why it only ever failed on one platform.
 *
 * Deferring the launch until the modal had gone was the alternative and is
 * worse: `Modal.onDismiss` is iOS-only, so it needs a platform branch plus an
 * untested Android path, and waiting for React to commit `visible: false` is
 * not the same event as UIKit finishing the animation, so it re-races on a slow
 * device. Removing the modal removes the class of bug.
 *
 * An earlier revision had already tried two buttons and reverted, because they
 * were `variant="secondary"` — surfaceStrong with no border, very nearly white
 * on a surface-coloured ground. That was a contrast problem, not an argument
 * against direct affordances: primary and outline both carry a real fill or
 * edge, and keeping them inside the dashed frame means it still reads as one
 * empty photo slot rather than two loose controls.
 */
export function PhotoCapture({ imageUri, onChange }: Props) {
  const theme = useTheme();
  const cameraRef = useRef<CameraView>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  /* One slot for anything that stopped a photo arriving — a refused permission
     or a failure part-way through. They are the same thing to the farmer (no
     photo, and why), so they share a line rather than each owning one. */
  const [notice, setNotice] = useState<string | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  async function pickFromGallery() {
    setNotice(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setNotice(GALLERY_DENIED);
        return;
      }

      // Stated rather than left to the default: a video would sail through the
      // picker and then fail much later, in the classifier.
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      // A cancel is not a failure and must not leave a warning behind.
      if (result.canceled || !result.assets[0]) return;

      await processAndSet(result.assets[0].uri);
    } catch {
      setNotice(ATTACH_FAILED);
    }
  }

  async function openCamera() {
    setNotice(null);
    try {
      const permission = cameraPermission?.granted ? cameraPermission : await requestCameraPermission();
      if (!permission.granted) {
        setNotice(CAMERA_DENIED);
        return;
      }
      setIsCameraOpen(true);
    } catch {
      setNotice(ATTACH_FAILED);
    }
  }

  async function capturePhoto() {
    setNotice(null);
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) await processAndSet(photo.uri);
    } catch {
      setNotice(ATTACH_FAILED);
    } finally {
      // In `finally`, or a throw in `takePictureAsync` strands the farmer in a
      // camera with no way out but the hardware back button.
      setIsCameraOpen(false);
    }
  }

  /* Compression can throw — a codec the manipulator will not read, a file that
     has gone away underneath it. This used to have a `finally` and no `catch`,
     so a throw reset the spinner and put the empty frame back with nothing
     said, which looks exactly like the app ignoring the tap. */
  async function processAndSet(uri: string) {
    setIsProcessing(true);
    try {
      onChange(await compressImage(uri));
    } catch {
      setNotice(ATTACH_FAILED);
    } finally {
      setIsProcessing(false);
    }
  }

  if (isCameraOpen) {
    return (
      <Card style={{ padding: 0, overflow: 'hidden', aspectRatio: 3 / 4 }}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back">
          <View style={{ flex: 1, justifyContent: 'flex-end', padding: theme.spacing.lg }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Button label="Cancel" variant="outline" onPress={() => setIsCameraOpen(false)} />
              <Button
                label="Capture"
                onPress={capturePhoto}
                icon={<Ionicons name="camera" size={18} color={theme.colors.onAccent} />}
              />
            </View>
          </View>
        </CameraView>
      </Card>
    );
  }

  return (
    // Flexes so the empty frame can fill the step it owns. The photo is the
    // whole subject here, and a small box floating at the top of an otherwise
    // blank screen reads as an afterthought.
    <View style={{ flex: 1, gap: theme.spacing.sm }}>
      {imageUri ? (
        <View>
          <Image
            source={{ uri: imageUri }}
            style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: theme.radii.md }}
            accessibilityLabel="Selected crop photo"
          />
          {/* On the image rather than below it: the photo is the subject, and a
              full-width "Remove photo" button under it out-weighed the submit
              action it sat next to. */}
          <Pressable
            onPress={() => onChange(undefined)}
            accessibilityRole="button"
            accessibilityLabel="Remove photo"
            hitSlop={8}
            style={{ position: 'absolute', top: theme.spacing.sm, right: theme.spacing.sm }}
          >
            {({ pressed }) => (
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#000000AA',
                  opacity: pressed ? 0.7 : 1,
                }}
              >
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </View>
            )}
          </Pressable>
        </View>
      ) : isProcessing ? (
        /* The placeholder holds the same 4:3 box the photo will fill, so
           nothing jumps when compression finishes. The caption stays — it says
           what is happening, which a bare shape cannot. */
        <View accessibilityRole="progressbar" accessibilityLabel="Compressing photo" style={{ gap: theme.spacing.sm }}>
          <Skeleton width="100%" aspectRatio={4 / 3} radius={theme.radii.md} />
          <Text variant="caption" muted style={{ textAlign: 'center' }}>
            Compressing photo…
          </Text>
        </View>
      ) : (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing.md,
            padding: theme.spacing.xl,
            borderRadius: theme.radii.md,
            borderWidth: 1,
            // Dashed says "nothing here yet" without spending a word on it.
            borderStyle: 'dashed',
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          }}
        >
          <Ionicons name="leaf-outline" size={28} color={theme.colors.accent} />
          <Text variant="body" muted style={{ textAlign: 'center' }}>
            Photograph the affected leaf or stem, close and in daylight.
          </Text>
          {/* Full width and stacked, not side by side: at 44dp each they would
              be two half-width targets with the labels shrinking to fit. */}
          <View style={{ alignSelf: 'stretch', gap: theme.spacing.sm }}>
            <Button
              label="Take a photo"
              onPress={openCamera}
              accessibilityLabel="Take a photo of the crop"
              icon={<Ionicons name="camera" size={18} color={theme.colors.onAccent} />}
            />
            <Button
              label="Choose from gallery"
              variant="outline"
              onPress={pickFromGallery}
              accessibilityLabel="Choose a crop photo from your gallery"
              icon={<Ionicons name="images-outline" size={18} color={theme.colors.accent} />}
            />
          </View>
        </View>
      )}

      {notice ? (
        <Text variant="caption" color={theme.colors.warning}>
          {notice}
        </Text>
      ) : null}
    </View>
  );
}

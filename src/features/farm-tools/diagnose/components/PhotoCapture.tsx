import React, { useRef, useState } from 'react';
import { Image, Modal, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Button } from '../../../../shared/ui/Button';
import { Card } from '../../../../shared/ui/Card';
import { Skeleton } from '../../../../shared/ui/Skeleton';
import { Text } from '../../../../shared/ui/Text';

type Props = {
  imageUri: string | undefined;
  onChange: (uri: string | undefined) => void;
};

// Resized and compressed before it ever sits in app state or is queued
// offline — keeps both the in-memory footprint and any queued submission
// small on low-cost devices and slow connections.
const MAX_DIMENSION = 1280;
const COMPRESS_QUALITY = 0.6;

async function compressImage(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: MAX_DIMENSION } }], {
    compress: COMPRESS_QUALITY,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return result.uri;
}

/**
 * The optional photo.
 *
 * One target instead of two side-by-side buttons. The pair were rendered
 * `variant="secondary"` — surfaceStrong with no border, which is very nearly
 * white on a surface-coloured background, the exact mistake FarmToolsScreen
 * documents avoiding. They also made the farmer decide *how* to attach a photo
 * before deciding *whether* to. A single dropzone asks the real question, and
 * the camera-or-gallery choice appears only once the answer is yes.
 */
export function PhotoCapture({ imageUri, onChange }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isChoosing, setIsChoosing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState<'camera' | 'gallery' | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  async function pickFromGallery() {
    setIsChoosing(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPermissionDenied('gallery');
      return;
    }
    setPermissionDenied(null);

    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;

    await processAndSet(result.assets[0].uri);
  }

  async function openCamera() {
    setIsChoosing(false);
    const permission = cameraPermission?.granted ? cameraPermission : await requestCameraPermission();
    if (!permission.granted) {
      setPermissionDenied('camera');
      return;
    }
    setPermissionDenied(null);
    setIsCameraOpen(true);
  }

  async function capturePhoto() {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.8 });
    setIsCameraOpen(false);
    if (photo?.uri) await processAndSet(photo.uri);
  }

  async function processAndSet(uri: string) {
    setIsProcessing(true);
    try {
      onChange(await compressImage(uri));
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
    <View style={{ gap: theme.spacing.sm }}>
      <Text variant="h3">Add a photo</Text>

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
        <Pressable
          onPress={() => setIsChoosing(true)}
          accessibilityRole="button"
          accessibilityLabel="Add a photo of the crop, optional"
        >
          {({ pressed }) => (
            <View
              style={{
                aspectRatio: 16 / 9,
                alignItems: 'center',
                justifyContent: 'center',
                gap: theme.spacing.xs,
                borderRadius: theme.radii.md,
                borderWidth: 1,
                // Dashed says "nothing here yet" without spending a word on it.
                borderStyle: 'dashed',
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
                opacity: pressed ? 0.7 : 1,
              }}
            >
              <Ionicons name="camera-outline" size={26} color={theme.colors.accent} />
              <Text variant="bodyStrong" color={theme.colors.accent}>
                Add a photo
              </Text>
              <Text variant="caption" muted>
                Optional, but it makes the answer better
              </Text>
            </View>
          )}
        </Pressable>
      )}

      {permissionDenied ? (
        <Text variant="caption" color={theme.colors.warning}>
          {permissionDenied === 'camera'
            ? 'Camera access is off. Turn it on in your device settings, or choose a photo instead.'
            : 'Photo library access is off. Turn it on in your device settings, or take a photo instead.'}
        </Text>
      ) : null}

      <Modal visible={isChoosing} transparent animationType="fade" onRequestClose={() => setIsChoosing(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' }}
          onPress={() => setIsChoosing(false)}
          accessibilityRole="button"
          accessibilityLabel="Close photo options"
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{
              backgroundColor: theme.colors.bg,
              borderTopLeftRadius: theme.radii.lg,
              borderTopRightRadius: theme.radii.lg,
              padding: theme.spacing.lg,
              paddingBottom: Math.max(insets.bottom, theme.spacing.lg),
              gap: theme.spacing.md,
            }}
          >
            <View
              style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.border, alignSelf: 'center' }}
            />
            <Text variant="h3">Add a photo</Text>
            <Button
              label="Take a photo"
              onPress={openCamera}
              icon={<Ionicons name="camera" size={18} color={theme.colors.onAccent} />}
            />
            <Button
              label="Choose from gallery"
              variant="outline"
              onPress={pickFromGallery}
              icon={<Ionicons name="images-outline" size={18} color={theme.colors.accent} />}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

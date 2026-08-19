import React, { useRef, useState } from 'react';
import { ActivityIndicator, Image, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';

import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Button } from '../../../../shared/ui/Button';
import { Card } from '../../../../shared/ui/Card';
import { Text } from '../../../../shared/ui/Text';

type Props = {
  imageUri: string | undefined;
  onChange: (uri: string | undefined) => void;
};

// Resized/compressed before it ever sits in app state or is queued offline
// — keeps both the in-memory footprint and any queued submission small on
// low-cost devices and slow connections.
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
 * Optional photo attachment — owns the genuinely non-trivial behavior in
 * the diagnose flow: choosing camera vs. gallery, requesting the matching
 * permission for each, and compressing whatever comes back before handing
 * a local file URI up to the parent. Isolated from DiagnoseForm because
 * this logic is plausibly reused by a future "report crop issue" flow.
 */
export function PhotoCapture({ imageUri, onChange }: Props) {
  const theme = useTheme();
  const cameraRef = useRef<CameraView>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState<'camera' | 'gallery' | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  async function pickFromGallery() {
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
    if (photo?.uri) {
      await processAndSet(photo.uri);
    }
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
              <Button label="Cancel" variant="secondary" onPress={() => setIsCameraOpen(false)} />
              <Button label="Capture" onPress={capturePhoto} icon={<Ionicons name="camera" size={18} color={theme.colors.onAccent} />} />
            </View>
          </View>
        </CameraView>
      </Card>
    );
  }

  return (
    <Card style={{ gap: theme.spacing.md }}>
      <Text variant="bodyStrong">Photo (optional)</Text>

      {imageUri ? (
        <View style={{ gap: theme.spacing.sm }}>
          <Image
            source={{ uri: imageUri }}
            style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: theme.radii.sm }}
            accessibilityLabel="Selected crop photo"
          />
          <Button label="Remove photo" variant="outline" onPress={() => onChange(undefined)} />
        </View>
      ) : isProcessing ? (
        <View style={{ alignItems: 'center', paddingVertical: theme.spacing.lg }}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text variant="caption" muted style={{ marginTop: theme.spacing.xs }}>
            Compressing photo…
          </Text>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button
              label="Take photo"
              variant="secondary"
              onPress={openCamera}
              icon={<Ionicons name="camera-outline" size={18} color={theme.colors.text} />}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="Choose photo"
              variant="secondary"
              onPress={pickFromGallery}
              icon={<Ionicons name="images-outline" size={18} color={theme.colors.text} />}
            />
          </View>
        </View>
      )}

      {permissionDenied ? (
        <Text variant="caption" muted>
          {permissionDenied === 'camera'
            ? 'Camera access is off. Enable it in your device settings, or choose a photo instead.'
            : 'Photo library access is off. Enable it in your device settings, or take a photo instead.'}
        </Text>
      ) : (
        <Text variant="caption" muted>
          A photo helps but isn&apos;t required — you can still submit with just a description.
        </Text>
      )}
    </Card>
  );
}

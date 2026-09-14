import React from 'react';
import { Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';

import type { DiagnosisRequest, DiagnosisResult } from '../../../../shared/domain/diagnosis';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Button } from '../../../../shared/ui/Button';
import { buildWhatsAppShareText } from '../../../../shared/utils/buildWhatsAppShareText';

type Props = { result: DiagnosisResult; request: DiagnosisRequest };

/**
 * Pass the diagnosis on, with the photo.
 *
 * An extension officer asked "what does this look like to you" cannot answer
 * from a summary; the picture is the thing worth sending. So the native share
 * sheet is preferred, which also lets the farmer choose where it goes rather
 * than assuming WhatsApp.
 *
 * The wa.me deep link stays as the fallback for when there is no photo, or no
 * share sheet: it works whether or not WhatsApp is installed, falling back to
 * the web. Losing the text share to gain the image one would be a bad trade.
 */
export function ShareWhatsAppButton({ result, request }: Props) {
  const theme = useTheme();
  const text = buildWhatsAppShareText(result, request);

  async function share() {
    if (result.imageUri && (await Sharing.isAvailableAsync().catch(() => false))) {
      try {
        await Sharing.shareAsync(result.imageUri, {
          mimeType: 'image/jpeg',
          // Android's sheet uses this as the subject on targets that have one;
          // most messaging apps ignore it and send the image alone, which is
          // why the text link below remains the way to send the words.
          dialogTitle: text,
        });
        return;
      } catch {
        // Fall through: a sheet that failed to open should not cost the
        // farmer the share entirely.
      }
    }

    await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`).catch(() => {});
  }

  return (
    <Button
      label={result.imageUri ? 'Share this diagnosis' : 'Share via WhatsApp'}
      // Outline, not secondary: `secondary` is surfaceStrong with no border,
      // which is near-invisible against a surface-coloured background.
      variant="outline"
      onPress={share}
      icon={
        <Ionicons
          name={result.imageUri ? 'share-outline' : 'logo-whatsapp'}
          size={18}
          color={theme.colors.accent}
        />
      }
    />
  );
}

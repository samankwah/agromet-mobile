import React from 'react';
import { Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { DiagnosisRequest, DiagnosisResult } from '../../../../shared/domain/diagnosis';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Button } from '../../../../shared/ui/Button';
import { buildWhatsAppShareText } from '../../../../shared/utils/buildWhatsAppShareText';

type Props = { result: DiagnosisResult; request: DiagnosisRequest };

/**
 * Text-only share via a wa.me deep link — works whether or not WhatsApp is
 * installed (falls back to web). Image attachment via the native share
 * sheet is a reasonable fast-follow, not required for "a concise summary".
 */
export function ShareWhatsAppButton({ result, request }: Props) {
  const theme = useTheme();

  async function share() {
    const text = buildWhatsAppShareText(result, request);
    await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
  }

  return (
    <Button
      label="Share via WhatsApp"
      variant="secondary"
      onPress={share}
      icon={<Ionicons name="logo-whatsapp" size={18} color={theme.colors.text} />}
    />
  );
}

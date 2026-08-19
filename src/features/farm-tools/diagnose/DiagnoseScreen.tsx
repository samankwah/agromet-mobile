import React, { useState } from 'react';
import { View } from 'react-native';

import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Button } from '../../../shared/ui/Button';
import { Card } from '../../../shared/ui/Card';
import { Screen } from '../../../shared/ui/Screen';
import { Text } from '../../../shared/ui/Text';
import { DiagnoseForm } from './components/DiagnoseForm';
import { DiagnosisResultCard } from './components/DiagnosisResultCard';
import { PhotoCapture } from './components/PhotoCapture';
import { ShareWhatsAppButton } from './components/ShareWhatsAppButton';
import { useDiagnose } from './useDiagnose';

const INITIAL_CROP = 'Maize';
const INITIAL_STAGE = 'Vegetative';

export function DiagnoseScreen() {
  const theme = useTheme();
  const { submit, result, lastOutcome, isSubmitting, queuedCount } = useDiagnose();

  const [crop, setCrop] = useState(INITIAL_CROP);
  const [growthStage, setGrowthStage] = useState(INITIAL_STAGE);
  const [symptoms, setSymptoms] = useState('');
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);

  const canSubmit = symptoms.trim().length > 0 && !isSubmitting;

  function handleSubmit() {
    submit({ crop, growthStage, symptoms: symptoms.trim(), imageUri });
  }

  return (
    <Screen>
      <View>
        <Text variant="h1">Diagnose a crop issue</Text>
        <Text variant="body" muted>
          Answer a few questions and, if you can, add a photo. This gives you decision support — not a certain diagnosis.
        </Text>
      </View>

      {queuedCount > 0 ? (
        <Card>
          <Text variant="bodyStrong">Pending sync</Text>
          <Text variant="caption" muted>
            {queuedCount} submission{queuedCount === 1 ? '' : 's'} waiting to send once you&apos;re back online.
          </Text>
        </Card>
      ) : null}

      <DiagnoseForm
        crop={crop}
        growthStage={growthStage}
        symptoms={symptoms}
        onChangeCrop={setCrop}
        onChangeGrowthStage={setGrowthStage}
        onChangeSymptoms={setSymptoms}
      />

      <PhotoCapture imageUri={imageUri} onChange={setImageUri} />

      <Button
        label={isSubmitting ? 'Submitting…' : 'Get decision support'}
        onPress={handleSubmit}
        disabled={!canSubmit}
        loading={isSubmitting}
      />

      {lastOutcome === 'queued' ? (
        <Card>
          <Text variant="bodyStrong">Saved — you&apos;re offline</Text>
          <Text variant="body" muted>
            This submission will send automatically once you&apos;re back online.
          </Text>
        </Card>
      ) : null}

      {result ? (
        <View style={{ gap: theme.spacing.md }}>
          <DiagnosisResultCard result={result} />
          <ShareWhatsAppButton result={result} request={{ crop, growthStage, symptoms, imageUri }} />
        </View>
      ) : null}
    </Screen>
  );
}

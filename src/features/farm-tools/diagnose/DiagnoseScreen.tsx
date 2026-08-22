import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

/**
 * Describe a sick crop, get decision support.
 *
 * Two states, not one long page: the form, and then the answer. Previously the
 * result was appended below the form, so submitting produced no visible change
 * on a phone — the farmer tapped the button and had to work out for themselves
 * that they needed to scroll. Now the answer replaces the question, which is
 * both what happened and what every other diagnostic tool does.
 *
 * The submit action is pinned rather than sitting at the end of the scroll. It
 * is the only thing this screen exists to do, and it should never be somewhere
 * the farmer has to go looking for.
 */
export function DiagnoseScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { submit, reset, result, lastOutcome, isSubmitting, queuedCount } = useDiagnose();

  const [crop, setCrop] = useState(INITIAL_CROP);
  const [growthStage, setGrowthStage] = useState(INITIAL_STAGE);
  const [symptoms, setSymptoms] = useState('');
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);

  const trimmedSymptoms = symptoms.trim();
  const canSubmit = trimmedSymptoms.length > 0 && !isSubmitting;
  const isAnswered = Boolean(result) || lastOutcome === 'queued';

  function handleSubmit() {
    submit({ crop, growthStage, symptoms: trimmedSymptoms, imageUri });
  }

  function startOver() {
    setSymptoms('');
    setImageUri(undefined);
    reset();
  }

  if (isAnswered) {
    return (
      <DiagnosisOutcome
        result={result}
        request={{ crop, growthStage, symptoms: trimmedSymptoms, imageUri }}
        onStartOver={startOver}
      />
    );
  }

  return (
    <Screen scroll={false} padded={false}>
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.lg,
          gap: theme.spacing.xl,
          // Clears the pinned footer so the last field is never trapped under it.
          paddingBottom: theme.spacing['3xl'] * 2,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: theme.spacing.xs }}>
          <Text variant="h1">Diagnose a crop</Text>
          <Text variant="body" muted>
            Tell us what you are seeing. You will get decision support, not a certain diagnosis.
          </Text>
        </View>

        {queuedCount > 0 ? (
          <Card style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' }}>
            <Ionicons name="cloud-offline-outline" size={20} color={theme.colors.muted} />
            <Text variant="caption" muted style={{ flex: 1 }}>
              {queuedCount} earlier {queuedCount === 1 ? 'submission is' : 'submissions are'} waiting to send when you
              are back online.
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
      </ScrollView>

      <View
        style={{
          padding: theme.spacing.lg,
          paddingBottom: Math.max(insets.bottom, theme.spacing.lg),
          gap: theme.spacing.xs,
          backgroundColor: theme.colors.bg,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        }}
      >
        <Button
          label={isSubmitting ? 'Checking…' : 'Get decision support'}
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={isSubmitting}
        />
        {/* A disabled button with no explanation is a dead end. */}
        {trimmedSymptoms.length === 0 ? (
          <Text variant="caption" muted style={{ textAlign: 'center' }}>
            Describe what you see to continue
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

/**
 * The answer, or an honest account of why there is not one yet.
 *
 * Offline is not an error state here: the submission is safely queued and will
 * send itself, so it gets the same calm treatment as a result rather than a
 * warning the farmer can do nothing about.
 */
function DiagnosisOutcome({
  result,
  request,
  onStartOver,
}: {
  result: ReturnType<typeof useDiagnose>['result'];
  request: { crop: string; growthStage: string; symptoms: string; imageUri?: string };
  onStartOver: () => void;
}) {
  const theme = useTheme();

  return (
    <Screen>
      {result ? (
        <>
          <DiagnosisResultCard result={result} />
          <ShareWhatsAppButton result={result} request={request} />
        </>
      ) : (
        <Card raised style={{ gap: theme.spacing.sm, borderLeftWidth: 4, borderLeftColor: theme.colors.teal }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Ionicons name="cloud-offline-outline" size={20} color={theme.colors.teal} />
            <Text variant="h3">Saved for later</Text>
          </View>
          <Text variant="body" muted>
            You are offline, so this could not be checked yet. It has been saved and will send itself as soon as you
            have a connection. You do not need to do anything.
          </Text>
        </Card>
      )}

      <Button
        label="Diagnose another crop"
        variant="outline"
        onPress={onStartOver}
        icon={<Ionicons name="refresh" size={16} color={theme.colors.accent} />}
      />
    </Screen>
  );
}

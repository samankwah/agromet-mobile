import React, { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useNavigation } from 'expo-router';

import { HOME_LOCATIONS } from '../../../shared/data/mockWeather';
import { useLocationStore } from '../../../shared/state/locationStore';
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

type Step = 'photo' | 'details';

const STEP_TITLE: Record<Step, string> = { photo: 'Add a photo', details: 'Crop details' };

/**
 * Describe a sick crop, get decision support.
 *
 * Three states, asked one at a time: the photo, then the details, then the
 * answer. It was one page, and it did not fit one — a repeated title, an
 * intro, six crop chips, four stage chips and a description box ran to roughly
 * two screens of scrolling for a form whose only required input is the photo.
 * Splitting on that boundary is what the form was already telling us: the
 * photo is required and everything after it is optional refinement, so the
 * photo earns a screen and the rest can share one.
 *
 * The answer replaces the question rather than appending below it. Submitting
 * used to produce no visible change on a phone — the farmer tapped the button
 * and had to work out for themselves that they needed to scroll.
 *
 * The forward action is pinned rather than sitting at the end of the scroll. It
 * is the only thing this screen exists to do, and it should never be somewhere
 * the farmer has to go looking for.
 *
 * The step lives in state, not in the router. Every field, plus the
 * submit-or-queue machine, already lives in this component; two routes would
 * mean lifting all of it somewhere else purely to thread it back down.
 */
export function DiagnoseScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { submit, reset, result, unavailable, lastOutcome, isSubmitting, queuedCount, abandonedCount } =
    useDiagnose();
  const region = useLocationStore((state) => HOME_LOCATIONS.find((l) => l.id === state.selectedLocationId)?.region);

  const [step, setStep] = useState<Step>('photo');
  const [crop, setCrop] = useState(INITIAL_CROP);
  const [growthStage, setGrowthStage] = useState(INITIAL_STAGE);
  const [symptoms, setSymptoms] = useState('');
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);

  const trimmedSymptoms = symptoms.trim();
  // The provider classifies the photo, not the prose, so a submission without
  // one has nothing to ask. This is now the gate on step one rather than on
  // the submit button, which is the same rule stated where it can be acted on.
  const hasPhoto = Boolean(imageUri);
  const isAnswered = Boolean(result) || Boolean(unavailable) || lastOutcome === 'queued';

  // The answer is not a step, so it leaves the flow: the header stops counting
  // and the back gesture goes back to meaning "leave", which is what a farmer
  // reading a result expects it to do.
  const isMidFlow = !isAnswered && step === 'details';

  // The navigator header carries the step name, so the page does not spend a
  // heading on repeating it. The back gesture is disabled mid-flow because it
  // is intercepted below, and a swipe that animates out only to snap back
  // reads as a glitch.
  useEffect(() => {
    navigation.setOptions({
      title: isAnswered ? 'Diagnosis' : STEP_TITLE[step],
      gestureEnabled: !isMidFlow,
    });
  }, [navigation, step, isAnswered, isMidFlow]);

  /*
   * "Back" means the previous step, not "leave the screen".
   *
   * One listener covers the iOS header chevron, the iOS edge-swipe and the
   * Android hardware back — the alternatives are a `BackHandler` (Android only)
   * plus a custom `headerLeft` (iOS only), which is two implementations of one
   * rule and leaves the swipe gesture doing a third thing.
   */
  useEffect(() => {
    if (!isMidFlow) return;
    return navigation.addListener('beforeRemove', (event) => {
      event.preventDefault();
      setStep('photo');
    });
  }, [navigation, isMidFlow]);

  function handleSubmit() {
    submit({ crop, growthStage, symptoms: trimmedSymptoms, imageUri, region });
  }

  function startOver() {
    setSymptoms('');
    setImageUri(undefined);
    setStep('photo');
    reset();
  }

  if (isAnswered) {
    return (
      <DiagnosisOutcome
        result={result}
        unavailable={unavailable}
        request={{ crop, growthStage, symptoms: trimmedSymptoms, imageUri }}
        onStartOver={startOver}
      />
    );
  }

  return (
    <Screen scroll={false} padded={false}>
      {/* On Android `behavior` is left undefined: `app.json` sets no
          `softwareKeyboardLayoutMode`, so Expo's default `resize` already
          shrinks the window and padding on top of it leaves a dead band above
          the keys. Same reasoning as ChatScreen and ContactScreen. */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{
            padding: theme.spacing.lg,
            gap: theme.spacing.xl,
            flexGrow: 1,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <StepProgress current={step === 'photo' ? 1 : 2} />

          {step === 'photo' ? (
            <>
              <OfflineQueueNotice queuedCount={queuedCount} abandonedCount={abandonedCount} />
              <PhotoCapture imageUri={imageUri} onChange={setImageUri} />
            </>
          ) : (
            <>
              <PhotoThumbnail imageUri={imageUri} onPress={() => setStep('photo')} />
              <DiagnoseForm
                crop={crop}
                growthStage={growthStage}
                symptoms={symptoms}
                onChangeCrop={setCrop}
                onChangeGrowthStage={setGrowthStage}
                onChangeSymptoms={setSymptoms}
              />
            </>
          )}
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
          {step === 'photo' ? (
            <>
              <Button label="Next" onPress={() => setStep('details')} disabled={!hasPhoto} />
              {/* A disabled button with no explanation is a dead end. */}
              {!hasPhoto ? (
                <Text variant="caption" muted style={{ textAlign: 'center' }}>
                  Add a photo to continue
                </Text>
              ) : null}
            </>
          ) : (
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <Button label="Back" variant="outline" onPress={() => setStep('photo')} />
              {/* The primary takes the rest of the row: back is a way out, not
                  an equal choice. */}
              <View style={{ flex: 1 }}>
                <Button
                  label={isSubmitting ? 'Checking…' : 'Get decision support'}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                  loading={isSubmitting}
                />
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

/**
 * Two segments, four points tall.
 *
 * A wizard has to say where you are, and this says it without spending a line
 * of copy on "Step 1 of 2" above a screen that is already short of room. The
 * words go to the screen reader instead, where they cost nothing.
 */
function StepProgress({ current }: { current: 1 | 2 }) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${current} of 2`}
      style={{ flexDirection: 'row', gap: theme.spacing.xs }}
    >
      {[1, 2].map((index) => (
        <View
          key={index}
          style={{
            flex: 1,
            height: 4,
            borderRadius: 2,
            backgroundColor: index <= current ? theme.colors.accent : theme.colors.border,
          }}
        />
      ))}
    </View>
  );
}

/**
 * The photo, small, on the details step.
 *
 * Present so the farmer can see what they are describing, and tappable so a
 * blurry shot can be retaken without hunting for the back control. Small
 * because on this step it is context, not the subject.
 */
function PhotoThumbnail({ imageUri, onPress }: { imageUri: string | undefined; onPress: () => void }) {
  const theme = useTheme();

  if (!imageUri) return null;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Change the crop photo">
      {({ pressed }) => (
        // Chrome on the nested View: Android drops a Pressable's own.
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, opacity: pressed ? 0.7 : 1 }}>
          <Image
            source={{ uri: imageUri }}
            style={{ width: 56, height: 56, borderRadius: theme.radii.sm }}
            accessibilityLabel="Selected crop photo"
          />
          <Text variant="caption" color={theme.colors.accent} style={{ flex: 1 }}>
            Change photo
          </Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.muted} />
        </View>
      )}
    </Pressable>
  );
}

/**
 * What is still waiting to send, in one line.
 *
 * Two cards for two counts spent about 150pt saying something that is true on
 * a minority of visits and actionable on fewer. It is a caption now, and
 * pressable, because past diagnoses is where a queued submission's answer
 * actually turns up.
 */
function OfflineQueueNotice({ queuedCount, abandonedCount }: { queuedCount: number; abandonedCount: number }) {
  const theme = useTheme();

  if (queuedCount === 0 && abandonedCount === 0) return null;

  const parts: string[] = [];
  if (queuedCount > 0) {
    parts.push(`${queuedCount} ${queuedCount === 1 ? 'submission is' : 'submissions are'} waiting to send`);
  }
  if (abandonedCount > 0) {
    parts.push(`${abandonedCount} could not be sent after several tries`);
  }

  // The abandoned count is the one that needs a decision from the farmer, so
  // it sets the colour whenever it is present.
  const isActionable = abandonedCount > 0;

  return (
    <Pressable
      onPress={() => router.push('/diagnosis-history')}
      accessibilityRole="button"
      accessibilityLabel={`${parts.join('. ')}. See past diagnoses`}
    >
      {({ pressed }) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, opacity: pressed ? 0.7 : 1 }}>
          <Ionicons
            name={isActionable ? 'alert-circle-outline' : 'cloud-offline-outline'}
            size={16}
            color={isActionable ? theme.colors.warning : theme.colors.muted}
          />
          <Text
            variant="caption"
            muted={!isActionable}
            color={isActionable ? theme.colors.warning : undefined}
            style={{ flex: 1 }}
          >
            {parts.join(', ')}.
          </Text>
        </View>
      )}
    </Pressable>
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
  unavailable,
  request,
  onStartOver,
}: {
  result: ReturnType<typeof useDiagnose>['result'];
  unavailable: ReturnType<typeof useDiagnose>['unavailable'];
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
      ) : unavailable ? (
        /* Not a diagnosis, and it must not be dressed as one. The provider
           says this when the score was too low to stand behind, when no key is
           configured, or when the photo is not a plant. Carrying its own words
           rather than a generic apology is what tells those apart. */
        <Card raised style={{ gap: theme.spacing.sm, borderLeftWidth: 4, borderLeftColor: theme.colors.warning }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Ionicons name="alert-circle-outline" size={20} color={theme.colors.warning} />
            <Text variant="h3">No confident answer</Text>
          </View>
          <Text variant="body" muted>
            {unavailable.reason}
          </Text>
          <Text variant="caption" muted>
            A clear, close photo of the affected leaf or stem in daylight gives the best chance of a match.
          </Text>
        </Card>
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
        label={unavailable ? 'Take another photo' : 'Diagnose another crop'}
        variant="outline"
        onPress={onStartOver}
        icon={<Ionicons name="refresh" size={16} color={theme.colors.accent} />}
      />
    </Screen>
  );
}

import React from 'react';
import { ActivityIndicator, Image, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { DiagnosisConfidenceBand, DiagnosisResult } from '../../../../shared/domain/diagnosis';
import { useTheme, type Theme } from '../../../../shared/theme/ThemeProvider';
import { Card } from '../../../../shared/ui/Card';
import { Text } from '../../../../shared/ui/Text';
import { formatConfidenceRange } from '../../../../shared/utils/formatConfidenceRange';
import { useReportAnswer } from '../../../ai-report/useReportAnswer';

type Props = {
  result: DiagnosisResult;
  /** The AI explanation for this result is still on its way. */
  isExplaining?: boolean;
};

/** Low confidence is a warning, not a neutral fact — it changes what to do next. */
function confidenceColor(band: DiagnosisConfidenceBand, theme: Theme): string {
  if (band === 'high') return theme.colors.accent;
  if (band === 'moderate') return theme.colors.teal;
  return theme.colors.warning;
}

/**
 * The answer.
 *
 * Never claims certainty: the confidence line is always a range (see
 * formatConfidenceRange) and the disclaimer renders unconditionally — there is
 * no prop to hide it.
 *
 * "Immediate actions" is given the visual weight, not the issue name. Knowing
 * it is probably armyworm changes nothing on its own; knowing what to do this
 * afternoon is the entire point, and it used to look identical to the
 * prevention advice below it.
 */
export function DiagnosisResultCard({ result, isExplaining = false }: Props) {
  const theme = useTheme();
  const tone = confidenceColor(result.confidenceBand, theme);
  const report = useReportAnswer('diagnosis');

  return (
    <View style={{ gap: theme.spacing.md }}>
      <Card raised style={{ gap: theme.spacing.md, borderLeftWidth: 4, borderLeftColor: tone }}>
        {/* The evidence the answer was drawn from. Without it the result reads
            as disconnected from the photo that produced it, and a farmer has no
            way to notice they photographed the wrong leaf. */}
        {result.imageUri ? (
          <Image
            source={{ uri: result.imageUri }}
            style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: theme.radii.md }}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
            accessible
            accessibilityLabel="The photo this diagnosis was made from"
          />
        ) : null}

        <View style={{ gap: theme.spacing.xs }}>
          <Text variant="caption" muted>
            Most likely
          </Text>
          <Text variant="h2">{result.likelyIssue}</Text>

          {/* The plant the provider decided it was looking at. A maize answer
              on a cassava photo is the clearest signal available that this
              result should be distrusted, and only this line reveals it. */}
          <Text variant="caption" muted>
            Identified as {result.plant}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
            <Ionicons name={result.confidenceBand === 'low' ? 'help-circle-outline' : 'analytics-outline'} size={15} color={tone} />
            <Text variant="caption" color={tone}>
              {formatConfidenceRange(result.confidenceBand, result.confidenceRangePct)}
            </Text>
          </View>
        </View>

        {/* Which engine answered.
            The offline model and the online provider produce the same shape and
            render through this same card, which is convenient for the code and
            misleading for the farmer: one covers two dozen crops with treatment
            advice from a maintained database, the other is five cassava classes
            running on the handset. Saying so is what stops the weaker answer
            from borrowing the stronger one's authority. */}
        {result.source === 'offline-model' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
            <Ionicons name="phone-portrait-outline" size={15} color={theme.colors.teal} />
            <Text variant="caption" color={theme.colors.teal}>
              Checked on your phone. Cassava diseases only.
            </Text>
          </View>
        ) : null}

        {/* Said out loud rather than left for the farmer to infer from a
            number — a weak match means "look again", not "act on this". */}
        {result.confidenceBand === 'low' ? (
          <Text variant="caption" muted>
            This is a weak match. Treat it as a starting point and check the crop again before acting.
          </Text>
        ) : null}
      </Card>

      {/* The AI's plain-words version of the phone's answer. Labelled,
          because it was written by a language model from the bundled advice,
          not by the classifier and not by a person, and the farmer should
          know which of those they are reading. */}
      {result.explanation ? (
        <Card raised style={{ gap: theme.spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={theme.colors.accent} />
            <Text variant="h3">What this means</Text>
          </View>
          <Text variant="body">{result.explanation}</Text>
          <Text variant="caption" muted>
            Explained by AI from the advice on your phone.
          </Text>
          {/* In the open rather than behind a hold, unlike the chat: this card
              is the only AI text on the screen, and Google Play asks that
              generated content can be flagged without leaving the app. A text
              link, so there is no chrome for Android to drop. */}
          <Pressable
            onPress={() => result.explanation && report.requestReport(result.explanation)}
            accessibilityRole="button"
            accessibilityLabel="Report this answer"
            hitSlop={12}
            style={{ alignSelf: 'flex-start' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
              <Ionicons name="flag-outline" size={14} color={theme.colors.muted} />
              <Text variant="caption" muted style={{ textDecorationLine: 'underline' }}>
                Report this answer
              </Text>
            </View>
          </Pressable>
          {report.sheet}
        </Card>
      ) : isExplaining ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }} accessibilityLiveRegion="polite">
          <ActivityIndicator size="small" color={theme.colors.muted} />
          <Text variant="caption" muted>
            Getting a simpler explanation…
          </Text>
        </View>
      ) : null}

      {result.immediateActions.length > 0 ? (
        <Card raised style={{ gap: theme.spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Ionicons name="flash-outline" size={18} color={theme.colors.accent} />
            <Text variant="h3">Do this now</Text>
          </View>
          {result.immediateActions.map((action, index) => (
            <NumberedStep key={action} index={index + 1} text={action} />
          ))}
        </Card>
      ) : null}

      {result.preventionGuidance.length > 0 ? (
        <Card style={{ gap: theme.spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Ionicons name="shield-checkmark-outline" size={18} color={theme.colors.muted} />
            <Text variant="h3">Next season</Text>
          </View>
          {result.preventionGuidance.map((item) => (
            <View key={item} style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <Text variant="body" muted>
                •
              </Text>
              <Text variant="body" muted style={{ flex: 1 }}>
                {item}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}

      {/* Providers sometimes return their advice as one block of prose rather
          than as separated parts. Showing it whole beats splitting it on full
          stops and pretending it was a list. */}
      {result.immediateActions.length === 0 && result.preventionGuidance.length === 0 && result.remedy ? (
        <Card raised style={{ gap: theme.spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Ionicons name="leaf-outline" size={18} color={theme.colors.accent} />
            <Text variant="h3">What to do</Text>
          </View>
          <Text variant="body">{result.remedy}</Text>
        </Card>
      ) : null}

      {result.symptoms ? (
        <Card style={{ gap: theme.spacing.xs }}>
          <Text variant="caption" muted>
            Your note
          </Text>
          <Text variant="body" muted>
            {result.symptoms}
          </Text>
          {/* Stated plainly: the provider reads the photo. Leaving this out
              would let the farmer believe their description was analysed. */}
          <Text variant="caption" muted>
            Saved with this record. The check itself is made from the photo.
          </Text>
        </Card>
      ) : null}

      <Text variant="caption" muted>
        {result.disclaimer}
      </Text>
    </View>
  );
}

/**
 * Numbered rather than bulleted.
 *
 * These are steps to work through in order, and a farmer part-way down the
 * list needs to find their place again. A bullet cannot be referred back to.
 */
function NumberedStep({ index, text }: { index: number; text: string }) {
  const theme = useTheme();

  return (
    <View style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-start' }}>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.accent + '1a',
        }}
      >
        <Text variant="caption" color={theme.colors.accent}>
          {index}
        </Text>
      </View>
      <Text variant="body" style={{ flex: 1 }}>
        {text}
      </Text>
    </View>
  );
}

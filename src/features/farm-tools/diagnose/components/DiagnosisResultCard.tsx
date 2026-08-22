import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { DiagnosisConfidenceBand, DiagnosisResult } from '../../../../shared/domain/diagnosis';
import { useTheme, type Theme } from '../../../../shared/theme/ThemeProvider';
import { Card } from '../../../../shared/ui/Card';
import { Text } from '../../../../shared/ui/Text';
import { formatConfidenceRange } from '../../../../shared/utils/formatConfidenceRange';

type Props = { result: DiagnosisResult };

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
export function DiagnosisResultCard({ result }: Props) {
  const theme = useTheme();
  const tone = confidenceColor(result.confidenceBand, theme);

  return (
    <View style={{ gap: theme.spacing.md }}>
      <Card raised style={{ gap: theme.spacing.md, borderLeftWidth: 4, borderLeftColor: tone }}>
        <View style={{ gap: theme.spacing.xs }}>
          <Text variant="caption" muted>
            Most likely
          </Text>
          <Text variant="h2">{result.likelyIssue}</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
            <Ionicons
              name={result.confidenceBand === 'low' ? 'help-circle-outline' : 'analytics-outline'}
              size={15}
              color={tone}
            />
            <Text variant="caption" color={tone}>
              {formatConfidenceRange(result.confidenceBand, result.confidenceRangePct)}
            </Text>
          </View>
        </View>

        {/* Said out loud rather than left for the farmer to infer from a
            number — a weak match means "look again", not "act on this". */}
        {result.confidenceBand === 'low' ? (
          <Text variant="caption" muted>
            This is a weak match. Treat it as a starting point and check the crop again before acting.
          </Text>
        ) : null}
      </Card>

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

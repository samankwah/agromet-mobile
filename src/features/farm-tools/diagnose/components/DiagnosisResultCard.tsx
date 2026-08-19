import React from 'react';
import { View } from 'react-native';

import type { DiagnosisResult } from '../../../../shared/domain/diagnosis';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Card } from '../../../../shared/ui/Card';
import { Text } from '../../../../shared/ui/Text';
import { formatConfidenceRange } from '../../../../shared/utils/formatConfidenceRange';

type Props = { result: DiagnosisResult };

/**
 * Never claims certainty: the confidence line is always a range (see
 * formatConfidenceRange), and the disclaimer is rendered unconditionally —
 * there's no prop to hide it.
 */
export function DiagnosisResultCard({ result }: Props) {
  const theme = useTheme();

  return (
    <Card raised style={{ gap: theme.spacing.md }}>
      <View style={{ gap: theme.spacing.xs }}>
        <Text variant="caption" muted>
          Likely issue
        </Text>
        <Text variant="h2">{result.likelyIssue}</Text>
        <Text variant="bodyStrong" color={theme.colors.teal}>
          {formatConfidenceRange(result.confidenceBand, result.confidenceRangePct)}
        </Text>
      </View>

      <Section title="Immediate actions" items={result.immediateActions} />
      <Section title="Prevention" items={result.preventionGuidance} />

      <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: theme.spacing.sm }}>
        <Text variant="caption" muted>
          {result.disclaimer}
        </Text>
      </View>
    </Card>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  const theme = useTheme();
  if (items.length === 0) return null;

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Text variant="bodyStrong">{title}</Text>
      {items.map((item, index) => (
        <View key={index} style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <Text variant="body" muted>
            •
          </Text>
          <Text variant="body" style={{ flex: 1 }}>
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

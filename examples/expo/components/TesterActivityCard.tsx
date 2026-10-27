import { StyleSheet, Text, View } from 'react-native';
import { Card, usePageColors } from '@/components/TesterOnboarding';
import { ACTIVITY_STATUS_LABELS, type TesterActivity } from '@/utils/testerActivity';

export function TesterActivityCard({ entry, expanded = false }: { entry: TesterActivity; expanded?: boolean }) {
  const colors = usePageColors();
  const statusColor = entry.status === 'error' ? colors.error : entry.status === 'running' ? colors.warning : colors.accent;
  return <Card>
    <View style={styles.row}>
      <Text style={[styles.status, { color: statusColor }]}>{ACTIVITY_STATUS_LABELS[entry.status]}</Text>
      <Text style={[styles.meta, { color: colors.muted }]}>{new Date(entry.timestamp).toLocaleTimeString()}</Text>
    </View>
    <Text selectable style={[styles.name, { color: colors.text }]}>{entry.name}</Text>
    <Text style={[styles.meta, { color: colors.muted }]}>{entry.method ? `${entry.method}()` : 'SDK lifecycle'} · {entry.environment.toUpperCase()}{entry.source ? ` · ${entry.source === 'Exact' || entry.source === 'Any' ? 'Inline ' : ''}${entry.source}` : ''}</Text>
    <Text accessibilityLiveRegion="polite" style={[styles.detail, { color: colors.muted }]}>{entry.detail}</Text>
    {expanded && <>
      <Text selectable style={[styles.meta, { color: colors.muted }]}>Session: {entry.session}</Text>
      {entry.durationMs !== undefined && <Text style={[styles.meta, { color: colors.muted }]}>Call duration: {entry.durationMs} ms</Text>}
      {!!entry.reset && <Text style={[styles.meta, { color: colors.muted }]}>Response reset: {entry.reset}</Text>}
      {!!entry.formId && <Text selectable style={[styles.meta, { color: colors.muted }]}>Form ID: {entry.formId}</Text>}
    </>}
  </Card>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  status: { fontSize: 13, fontWeight: '700' },
  meta: { fontSize: 12, lineHeight: 19 },
  name: { fontSize: 17, fontWeight: '700', flexShrink: 1 },
  detail: { fontSize: 14, lineHeight: 21 },
});

import { useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePageColors } from '@/components/TesterOnboarding';
import { useTesterActivity } from '@/contexts/TesterActivityContext';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

export default function ActivityScreen() {
  const colors = usePageColors();
  const { padding } = useResponsiveLayout();
  const { sdkEntries, clearSdk } = useTesterActivity();
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'request' | 'response'>('request');
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return sdkEntries.filter((entry) => !search || `${entry.name} ${entry.target || ''} ${entry.formId || ''} ${entry.httpStatus || ''} ${entry.requestUrl || ''} ${entry.requestPayload || ''} ${entry.responsePayload || ''} ${entry.payload || ''}`.toLowerCase().includes(search));
  }, [sdkEntries, query]);
  return <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
    <View style={[styles.toolbar, { paddingHorizontal: padding, backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.count, { color: colors.muted }]}>{filtered.length} SDK requests</Text>
      <Pressable accessibilityRole="button" disabled={!sdkEntries.length} onPress={() => { clearSdk(); setExpandedId(null); }} style={styles.clear}><Text style={{ color: colors.accent, fontWeight: '600', opacity: sdkEntries.length ? 1 : 0.4 }}>Clear logs</Text></Pressable>
    </View>
    <View style={{ paddingHorizontal: padding, paddingVertical: 10 }}>
      <TextInput accessibilityLabel="Filter SDK logs" placeholder="Filter SDK logs" placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} autoCapitalize="none" autoCorrect={false} autoComplete="off" importantForAutofill="no" clearButtonMode="while-editing" style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} />
    </View>
    <FlatList data={filtered} keyExtractor={(entry) => entry.id} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingBottom: 24 }}
      ListEmptyComponent={<Text style={[styles.empty, { color: colors.muted }]}>{sdkEntries.length ? 'No matching requests' : 'No SDK requests yet'}</Text>}
      renderItem={({ item }) => {
        const expanded = expandedId === item.id;
        return <View style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border }}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Inspect ${item.name}`} accessibilityState={{ expanded }} onPress={() => { setExpandedId(expanded ? null : item.id); setDetailTab('request'); }} style={({ pressed }) => [styles.logRow, { paddingHorizontal: padding, backgroundColor: expanded ? colors.selected : pressed ? colors.surface : colors.background }]}>
            <Text style={[styles.time, { color: colors.muted }]}>{new Date(item.timestamp).toLocaleTimeString()}</Text>
            <View style={styles.flex}>
              <Text style={[styles.event, { color: item.status === 'error' ? colors.error : colors.text }]}>{item.name}</Text>
              <Text style={[styles.formId, { color: colors.muted }]}>{item.requestMethod} · {item.status === 'running' ? 'Pending' : item.httpStatus || item.detail || 'Failed'}{item.durationMs !== undefined ? ` · ${item.durationMs} ms` : ''}</Text>
              {!!(item.target || item.formId) && <Text numberOfLines={1} style={[styles.formId, { color: colors.muted }]}>{item.target || item.formId}</Text>}
            </View>
            <Text style={{ color: colors.muted }}>{expanded ? '−' : '+'}</Text>
          </Pressable>
          {expanded && <View style={{ backgroundColor: colors.surface }}>
            <View accessibilityRole="tablist" style={[styles.detailTabs, { borderColor: colors.border, paddingHorizontal: padding }]}>
              {(['request', 'response'] as const).map((tab) => <Pressable key={tab} accessibilityRole="tab" accessibilityState={{ selected: detailTab === tab }} accessibilityLabel={`${tab === 'request' ? 'Request' : 'Response'} details for ${item.name}`} onPress={() => setDetailTab(tab)} style={[styles.detailTab, { borderBottomColor: detailTab === tab ? colors.accent : 'transparent' }]}><Text style={{ color: detailTab === tab ? colors.accent : colors.muted, fontWeight: '600' }}>{tab === 'request' ? 'Request' : 'Response'}</Text></Pressable>)}
            </View>
            <View style={{ paddingHorizontal: padding, paddingTop: 12, gap: 6 }}>
              {detailTab === 'request' ? <Text selectable style={[styles.json, { color: colors.muted }]}>{item.requestMethod} {item.requestUrl}</Text> : <Text style={[styles.json, { color: item.status === 'error' ? colors.error : colors.muted }]}>{item.status === 'running' ? 'Pending' : item.httpStatus ? `Status: ${item.httpStatus}` : 'Network error'}{item.durationMs !== undefined ? ` · ${item.durationMs} ms` : ''}</Text>}
              <Text style={[styles.bodyLabel, { color: colors.muted }]}>{detailTab === 'request' ? 'Request body' : 'Response body'}</Text>
            </View>
            <ScrollView style={styles.bodyViewport} nestedScrollEnabled>
              <ScrollView horizontal nestedScrollEnabled contentContainerStyle={{ padding, minWidth: '100%' }}>
                <Text selectable style={[styles.json, { color: colors.text }]}>{detailTab === 'request' ? item.requestPayload || '{}' : item.responsePayload ?? (item.status === 'running' ? 'Waiting for response…' : 'Loading response body…')}</Text>
              </ScrollView>
            </ScrollView>
          </View>}
        </View>;
      }} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  count: { fontSize: 12, flexShrink: 1 },
  clear: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 },
  search: { minHeight: 46, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderRadius: 8, fontSize: 14 },
  logRow: { minHeight: 64, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, paddingVertical: 12 },
  time: { fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  event: { fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: '600' },
  formId: { fontSize: 11, marginTop: 5, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  detailTabs: { flexDirection: 'row', gap: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  detailTab: { minHeight: 48, minWidth: 90, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, paddingHorizontal: 8 },
  bodyLabel: { fontSize: 11, fontWeight: '600', marginTop: 6 },
  bodyViewport: { maxHeight: 340 },
  json: { fontSize: 12, lineHeight: 20, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  empty: { fontSize: 13, textAlign: 'center', padding: 32 },
});

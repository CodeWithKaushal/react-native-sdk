/**
 * ScrollView shell for inline EncatchInlineForm demo tabs.
 *
 * Pair with EncatchInlineForm (fixed WebView height; host owns keyboard scroll).
 * Do not wrap in KeyboardAvoidingView — use automaticallyAdjustKeyboardInsets only.
 */
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import {
  Keyboard,
  Platform,
  TextInput,
  ScrollView,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type InlineFormScrollScreenProps = {
  backgroundColor: string;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Y offset of the inline form within scroll content — wrap form in onLayout to set this. */
  getFormScrollY?: () => number;
  /** Receives scrollToForm — pass to EncatchInlineForm onOverlayOpenChange. */
  onScrollToFormReady?: (scrollToForm: () => void) => void;
  children: ReactNode;
};

export function InlineFormScrollScreen({
  backgroundColor,
  contentContainerStyle,
  getFormScrollY,
  onScrollToFormReady,
  children,
}: InlineFormScrollScreenProps) {
  const scrollRef = useRef<ScrollView>(null);
  const { padding } = useResponsiveLayout();
  const getFormScrollYRef = useRef(getFormScrollY);
  getFormScrollYRef.current = getFormScrollY;

  const scrollFormIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      const y = getFormScrollYRef.current?.() ?? 0;
      scrollRef.current?.scrollTo({
        y: Math.max(0, y - 24),
        animated: true,
      });
    });
  }, []);

  useEffect(() => {
    onScrollToFormReady?.(scrollFormIntoView);
  }, [onScrollToFormReady, scrollFormIntoView]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      if (TextInput.State.currentlyFocusedInput()) return;
      timer = setTimeout(scrollFormIntoView, 100);
    });
    return () => { showSub.remove(); if (timer) clearTimeout(timer); };
  }, [scrollFormIntoView]);

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.flex, { backgroundColor }]}>
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={[contentContainerStyle, { paddingHorizontal: padding, width: '100%', maxWidth: 800, alignSelf: 'center', paddingBottom: 32 }]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});

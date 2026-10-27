import { Redirect, Tabs } from 'expo-router';
import { useEncatch } from '@encatch/react-native-sdk';
import { useTesterSession } from '@/contexts/TesterSessionContext';
import { TesterHeaderActions } from '@/components/TesterHeaderActions';
import { TesterTabBar } from '@/components/TesterTabBar';
import { usePageColors } from '@/components/TesterOnboarding';
import { TESTER_TABS } from '@/constants/navigation';

function TabsWithEncatch() {
  const { isInitialized, isIdentified } = useEncatch();
  const { isAnonymous } = useTesterSession();
  const colors = usePageColors();
  if (!isInitialized) return null;
  if (!isIdentified && !isAnonymous) return <Redirect href="/(auth)/test-user" />;
  return (
    <Tabs tabBar={(props) => <TesterTabBar {...props} />} screenOptions={{
      headerShown: true,
      headerTitleAlign: 'left',
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.text,
      headerTitleStyle: { fontSize: 18, fontWeight: '700' },
      headerShadowVisible: false,
      headerRight: () => <TesterHeaderActions />,
      sceneStyle: { backgroundColor: colors.background },
    }}>
      {TESTER_TABS.map((tab) => <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title }} />)}
    </Tabs>
  );
}

export default function TabLayout() {
  const { isSdkReady } = useTesterSession();
  return isSdkReady ? <TabsWithEncatch /> : <Redirect href="/(auth)/login" />;
}

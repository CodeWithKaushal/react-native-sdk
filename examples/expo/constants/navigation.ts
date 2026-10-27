export const TESTER_TABS = [
  { name: 'index', label: 'Home', title: 'Home', accessibilityLabel: 'Home', icon: { ios: 'house', android: 'home', web: 'home' } },
  { name: 'activity', label: 'Latest action', title: 'Latest action', accessibilityLabel: 'Latest action and activity history', icon: { ios: 'clock.arrow.circlepath', android: 'history', web: 'history' } },
  { name: 'events', label: 'Events', title: 'Events', accessibilityLabel: 'Events and screen tracking', icon: { ios: 'hand.tap', android: 'touch_app', web: 'touch_app' } },
  { name: 'inline-exact', label: 'Exact', title: 'Inline exact', accessibilityLabel: 'Inline form, exact match', icon: { ios: 'rectangle.badge.checkmark', android: 'fact_check', web: 'fact_check' } },
  { name: 'inline-wildcard', label: 'Any', title: 'Inline any', accessibilityLabel: 'Inline form, any match', icon: { ios: 'rectangle.inset.filled', android: 'web_asset', web: 'web_asset' } },
  { name: 'settings', label: 'Settings', title: 'Settings', accessibilityLabel: 'Settings', icon: { ios: 'gearshape', android: 'settings', web: 'settings' } },
] as const;

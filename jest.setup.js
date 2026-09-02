/* eslint-env jest */
/**
 * Shared Jest setup.
 *
 * Only stateless, universally-needed native shims live here. Anything with
 * per-test state (feeds, storage, notifications) is mocked inside the test
 * file that cares about it, so each suite stays readable on its own.
 */

jest.mock('react-native-gesture-handler', () => {
  const RN = require('react-native');
  return {
    GestureHandlerRootView: RN.View,
    PinchGestureHandler: RN.View,
    ScrollView: RN.ScrollView,
    State: {},
  };
});

/**
 * The real provider only renders its children once the native view reports a
 * frame, which never happens under Jest — the whole app tree would come back
 * empty. Fixed zero insets keep layout deterministic.
 */
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const RN = require('react-native');
  const insets = {top: 0, right: 0, bottom: 0, left: 0};
  const frame = {x: 0, y: 0, width: 390, height: 844};
  return {
    SafeAreaProvider: ({children}) => React.createElement(RN.View, null, children),
    SafeAreaView: RN.View,
    SafeAreaInsetsContext: React.createContext(insets),
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
    initialWindowMetrics: {insets, frame},
  };
});

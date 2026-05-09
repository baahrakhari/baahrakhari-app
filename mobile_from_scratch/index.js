/**
 * @format
 */

import React from 'react';
import { AppRegistry } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import App from './App';
import { name as appName } from './app.json';

function Root() {
  return React.createElement(
    GestureHandlerRootView,
    {style: {flex: 1}},
    React.createElement(App),
  );
}

AppRegistry.registerComponent(appName, () => Root);

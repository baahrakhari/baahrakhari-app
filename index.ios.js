/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  AppRegistry
} from 'react-native';
import BaahrakhariApp from './src/index';

class baahrakhari extends Component {
  render() {
    return (
      <BaahrakhariApp />
    );
  }
}

AppRegistry.registerComponent('baahrakhari', () => baahrakhari);

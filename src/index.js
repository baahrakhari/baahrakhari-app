/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  TouchableOpacity,
  View,
  WebView
} from 'react-native';

var HEADER = '#3b5998';
var BGWASH = 'rgba(255,255,255,0.8)';

var WEBVIEW_REF = 'webview';
var DEFAULT_URL = 'http://baahrakhari.com';

class BaahrakhariApp extends Component {

  state = {
    url: DEFAULT_URL,
    status: 'No Page Loaded',
    backButtonEnabled: true,
    forwardButtonEnabled: false,
    loading: true,
    scalesPageToFit: true,
  };

  render() {
    return (
      <View style={[styles.container]}>
      <View style={[styles.addressBarRow]}>
        <TouchableOpacity
          onPress={this.goBack}
          style={styles.navButton}>
          <Text>
             {'<'}
          </Text>
        </TouchableOpacity>
      </View>
      <WebView
        ref={WEBVIEW_REF}
        automaticallyAdjustContentInsets={false}
        style={styles.webView}
        source={{uri: this.state.url}}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        decelerationRate="normal"
        onNavigationStateChange={this.onNavigationStateChange}
        onShouldStartLoadWithRequest={this.onShouldStartLoadWithRequest}
        startInLoadingState={true}
        scalesPageToFit={this.state.scalesPageToFit}
      />
      <View style={styles.statusBar}>
        <Text style={styles.statusBarText}>{this.state.status}</Text>
      </View>
    </View>
    );

  goBack = () => {
      this.refs[WEBVIEW_REF].goBack();
    };

  goForward = () => {
    this.refs[WEBVIEW_REF].goForward();
  };

  reload = () => {
    this.refs[WEBVIEW_REF].reload();
  };

  onNavigationStateChange = (navState) => {
    this.setState({
      backButtonEnabled: navState.canGoBack,
      forwardButtonEnabled: navState.canGoForward,
      url: navState.url,
      status: navState.title,
      loading: navState.loading,
      scalesPageToFit: true
    });
  };
};

} //end Class


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  addressBarRow: {
      flexDirection: 'row',
      padding: 8,
    },
    webView: {
      backgroundColor: BGWASH,
      height: 350,
    },
    navButton: {
      width: 20,
      padding: 3,
      marginRight: 3,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: BGWASH,
      borderColor: 'transparent',
      borderRadius: 3,
    },
    goButton: {
      height: 24,
      padding: 3,
      marginLeft: 8,
      alignItems: 'center',
      backgroundColor: BGWASH,
      borderColor: 'transparent',
      borderRadius: 3,
      alignSelf: 'stretch',
    },
    statusBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 5,
      height: 22,
    },
    statusBarText: {
      color: 'white',
      fontSize: 13,
    },
    spinner: {
      width: 20,
      marginRight: 6,
    },
    buttons: {
      flexDirection: 'row',
      height: 30,
      backgroundColor: 'black',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    button: {
      flex: 0.5,
      width: 0,
      margin: 5,
      borderColor: 'gray',
      borderWidth: 1,
      backgroundColor: 'gray',
    },
});

export default BaahrakhariApp;

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import crashlytics from '@react-native-firebase/crashlytics';

export default class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    try {
      crashlytics().recordError(error);
      if (info?.componentStack) crashlytics().log(info.componentStack);
    } catch {}
  }

  handleReintentar = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={s.root}>
          <Image source={require('../../assets/logo.png')} style={s.logo} resizeMode="contain" />
          <Text style={s.title}>Algo salió mal</Text>
          <Text style={s.sub}>Tuvimos un problema inesperado. Intenta de nuevo.</Text>
          <TouchableOpacity style={s.btn} onPress={this.handleReintentar} activeOpacity={0.85}>
            <Text style={s.btnTxt}>REINTENTAR</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const s = StyleSheet.create({
  root: {
    flex:              1,
    backgroundColor:   '#FFFFFF',
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: 32,
  },
  logo:  { width: 100, height: 60, marginBottom: 32 },
  title: { fontSize: 22, fontWeight: '800', color: '#111111', marginBottom: 8, textAlign: 'center' },
  sub:   { fontSize: 14, color: '#888888', textAlign: 'center', marginBottom: 28 },
  btn:   {
    backgroundColor:   '#F4C400',
    borderRadius:      14,
    paddingVertical:   16,
    paddingHorizontal: 40,
  },
  btnTxt: { color: '#111111', fontSize: 15, fontWeight: '700', letterSpacing: 1 },
});

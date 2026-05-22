import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Image, StatusBar, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import auth from '@react-native-firebase/auth';

export default function LoginScreen({ navigate }) {
  const [numero, setNumero] = useState('');
  const [loading, setLoading] = useState(false);

  const continuar = async () => {
    const clean = numero.trim().replace(/\D/g, '');
    if (clean.length < 10) {
      Alert.alert('Número inválido', 'Ingresa un número colombiano de 10 dígitos.');
      return;
    }
    setLoading(true);
    try {
      const confirmation = await auth().signInWithPhoneNumber('+57' + clean);
      navigate('OTP', { confirmation, telefono: clean });
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo enviar el código. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <Image
        source={require('../../assets/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.titulo}>Bienvenido a DEONE</Text>
      <Text style={styles.subtitulo}>Ingresa tu número para continuar</Text>

      <View style={styles.inputRow}>
        <View style={styles.prefijo}>
          <Text style={styles.prefijoText}>+57</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="300 000 0000"
          placeholderTextColor="#CCCCCC"
          keyboardType="phone-pad"
          value={numero}
          onChangeText={setNumero}
          maxLength={10}
        />
      </View>

      <TouchableOpacity
        style={loading ? styles.btnDisabled : styles.btn}
        onPress={continuar}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading
          ? <ActivityIndicator color="#111111" />
          : <Text style={styles.btnText}>CONTINUAR</Text>
        }
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
    justifyContent: 'center',
  },
  logo: {
    width: 110,
    height: 64,
    alignSelf: 'center',
    marginBottom: 52,
  },
  titulo: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111111',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitulo: {
    fontSize: 15,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 36,
  },
  inputRow: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: '#EEEEEE',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#F8F8F8',
  },
  prefijo: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRightWidth: 1.5,
    borderRightColor: '#EEEEEE',
    backgroundColor: '#FFFFFF',
  },
  prefijoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
  },
  input: {
    flex: 1,
    height: 54,
    paddingHorizontal: 16,
    fontSize: 17,
    color: '#111111',
  },
  btn: {
    backgroundColor: '#F4C400',
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    backgroundColor: '#F4C400',
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
    letterSpacing: 1.2,
  },
});

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, StatusBar, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { authApi } from '../api/client';
import { storeBackendToken, storeUserUuid } from '../utils/tokenStorage';

export default function RegistroScreen({ params, navigate }) {
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);

  const crear = async () => {
    if (!nombre.trim()) {
      Alert.alert('Falta el nombre', 'Ingresa tu nombre completo.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await authApi.registrar(params.telefono, 'cliente', nombre.trim(), params.idToken);
      await storeBackendToken(data.token);
      await storeUserUuid(data.usuario.id);
      navigate('Home');
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message || 'No se pudo crear la cuenta.';
      Alert.alert('Error', msg);
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

      <Text style={styles.titulo}>Completa tu perfil</Text>
      <Text style={styles.subtitulo}>Solo un paso más para empezar</Text>

      <TextInput
        style={styles.input}
        placeholder="Nombre completo"
        placeholderTextColor="#CCCCCC"
        value={nombre}
        onChangeText={setNombre}
        autoCapitalize="words"
        returnKeyType="done"
      />

      <TouchableOpacity
        style={loading ? styles.btnDisabled : styles.btn}
        onPress={crear}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading
          ? <ActivityIndicator color="#111111" />
          : <Text style={styles.btnText}>CREAR CUENTA</Text>
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
  input: {
    height: 54,
    borderWidth: 1.5,
    borderColor: '#EEEEEE',
    borderRadius: 14,
    paddingHorizontal: 18,
    fontSize: 16,
    color: '#111111',
    backgroundColor: '#F8F8F8',
    marginBottom: 28,
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

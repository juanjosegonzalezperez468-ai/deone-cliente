import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, StatusBar, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { authApi } from '../api/client';

export default function RegistroScreen({ params, navigate }) {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('cliente');
  const [loading, setLoading] = useState(false);

  const crear = async () => {
    if (!nombre.trim()) {
      Alert.alert('Falta el nombre', 'Ingresa tu nombre completo.');
      return;
    }
    setLoading(true);
    try {
      await authApi.registrar(params.telefono, tipo, nombre.trim());
      navigate('Home');
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo crear la cuenta. Intenta de nuevo.');
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

      <Text style={styles.label}>¿Cómo usarás DEONE?</Text>
      <View style={styles.tipoRow}>
        <TouchableOpacity
          style={tipo === 'cliente' ? styles.tipoBtnActive : styles.tipoBtnInactive}
          onPress={() => setTipo('cliente')}
          activeOpacity={0.85}
        >
          <Text style={tipo === 'cliente' ? styles.tipoTextActive : styles.tipoTextInactive}>
            Soy cliente
          </Text>
        </TouchableOpacity>

        <View style={styles.tipoSpacer} />

        <TouchableOpacity
          style={tipo === 'conductor' ? styles.tipoBtnActive : styles.tipoBtnInactive}
          onPress={() => setTipo('conductor')}
          activeOpacity={0.85}
        >
          <Text style={tipo === 'conductor' ? styles.tipoTextActive : styles.tipoTextInactive}>
            Soy conductor
          </Text>
        </TouchableOpacity>
      </View>

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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 12,
  },
  tipoRow: {
    flexDirection: 'row',
    marginBottom: 28,
  },
  tipoSpacer: {
    width: 12,
  },
  tipoBtnInactive: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#EEEEEE',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F8F8',
  },
  tipoBtnActive: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#F4C400',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFBE6',
  },
  tipoTextInactive: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888888',
  },
  tipoTextActive: {
    fontSize: 14,
    fontWeight: '700',
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

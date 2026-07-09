import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, StatusBar, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { authApi } from '../api/client';
import { storeBackendToken, storeUserUuid } from '../utils/tokenStorage';
import { registrarNotificacionesPush } from '../utils/notifications';

export default function RegistroScreen({ params, navigate }) {
  const [nombre,        setNombre]        = useState('');
  const [fotoUri,       setFotoUri]       = useState(null);
  const [aceptoTerminos, setAceptoTerminos] = useState(false);
  const [loading,       setLoading]       = useState(false);

  const puedeCrear = nombre.trim().length > 0 && fotoUri && aceptoTerminos && !loading;

  const elegirFoto = () => {
    Alert.alert('Foto de perfil', 'Tu foto la verá el conductor que acepte tu viaje.', [
      {
        text: 'Tomar foto',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permiso denegado', 'Necesitamos acceso a tu cámara para tomar la foto.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
            allowsEditing: true,
            aspect: [1, 1],
          });
          if (!result.canceled) setFotoUri(result.assets[0].uri);
        },
      },
      {
        text: 'Elegir de galería',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería para seleccionar la foto.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
            allowsEditing: true,
            aspect: [1, 1],
          });
          if (!result.canceled) setFotoUri(result.assets[0].uri);
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const subirFoto = async (usuarioId) => {
    const formData = new FormData();
    formData.append('archivo', {
      uri:  fotoUri,
      name: 'foto_perfil.jpg',
      type: 'image/jpeg',
    });
    await authApi.subirFotoPerfil(usuarioId, formData);
  };

  const crear = async () => {
    if (!puedeCrear) return;
    setLoading(true);
    try {
      const { data } = await authApi.registrar(params.telefono, 'cliente', nombre.trim(), params.idToken);
      await storeBackendToken(data.token);
      await storeUserUuid(data.usuario.id);
      // La foto es obligatoria: si falla la subida no se avanza (la cuenta ya
      // existe, así que volver a presionar el botón reintenta solo la foto).
      try {
        await subirFoto(data.usuario.id);
      } catch {
        Alert.alert('No se pudo subir tu foto', 'Revisa tu conexión e intenta de nuevo tocando CREAR CUENTA.');
        return;
      }
      registrarNotificacionesPush(data.usuario.id);
      // Registrar aceptación de términos en el backend (no bloquea si falla)
      try { await authApi.aceptarTerminos(data.usuario.id); } catch {}
      navigate('Home');
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message || 'No se pudo crear la cuenta.';
      Alert.alert('Error', typeof msg === 'string' ? msg : 'No se pudo crear la cuenta.');
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

      <TouchableOpacity style={styles.fotoWrap} onPress={elegirFoto} activeOpacity={0.8}>
        {fotoUri ? (
          <Image source={{ uri: fotoUri }} style={styles.fotoImg} />
        ) : (
          <View style={styles.fotoPlaceholder}>
            <Text style={styles.fotoIcon}>📷</Text>
            <Text style={styles.fotoTxt}>Agregar foto</Text>
          </View>
        )}
        <View style={styles.fotoBadge}>
          <Text style={styles.fotoBadgeTxt}>{fotoUri ? '✎' : '+'}</Text>
        </View>
      </TouchableOpacity>
      <Text style={styles.fotoNota}>
        La foto de perfil es obligatoria: el conductor la verá antes de aceptar tu viaje.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Nombre completo"
        placeholderTextColor="#CCCCCC"
        value={nombre}
        onChangeText={setNombre}
        autoCapitalize="words"
        returnKeyType="done"
      />

      {/* Checkbox de términos */}
      <TouchableOpacity
        style={styles.checkRow}
        onPress={() => setAceptoTerminos(v => !v)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, aceptoTerminos && styles.checkboxOn]}>
          {aceptoTerminos && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.checkTxt}>
          Acepto los{' '}
          <Text style={styles.checkLink} onPress={() => navigate('Terminos')}>
            Términos y Política de Privacidad
          </Text>
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={puedeCrear ? styles.btn : styles.btnDisabled}
        onPress={crear}
        disabled={!puedeCrear}
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
  fotoWrap: {
    alignSelf: 'center',
    marginBottom: 12,
  },
  fotoImg: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: '#F8F8F8',
  },
  fotoPlaceholder: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 1.5,
    borderColor: '#EEEEEE',
    backgroundColor: '#F8F8F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fotoIcon: { fontSize: 26, marginBottom: 2 },
  fotoTxt:  { fontSize: 12, color: '#888888', fontWeight: '600' },
  fotoBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F4C400',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  fotoBadgeTxt: { fontSize: 16, fontWeight: '800', color: '#111111' },
  fotoNota: {
    fontSize: 12,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 17,
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
    marginBottom: 20,
  },
  checkRow: {
    flexDirection:  'row',
    alignItems:     'center',
    marginBottom:   24,
  },
  checkbox: {
    width:        22,
    height:       22,
    borderRadius: 6,
    borderWidth:  1.5,
    borderColor:  '#CCCCCC',
    marginRight:  10,
    alignItems:   'center',
    justifyContent: 'center',
    backgroundColor: '#F8F8F8',
    flexShrink:   0,
  },
  checkboxOn: {
    backgroundColor: '#F4C400',
    borderColor:     '#F4C400',
  },
  checkmark: { color: '#111111', fontSize: 13, fontWeight: '800' },
  checkTxt:  { flex: 1, fontSize: 13, color: '#555555', lineHeight: 18 },
  checkLink: { color: '#111111', fontWeight: '700', textDecorationLine: 'underline' },
  btn: {
    backgroundColor: '#F4C400',
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    backgroundColor: '#EEEEEE',
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
    letterSpacing: 1.2,
  },
});

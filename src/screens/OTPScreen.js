import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, StatusBar, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { authApi } from '../api/client';
import { storeBackendToken, storePhone, storeUserUuid } from '../utils/tokenStorage';
import { registrarNotificacionesPush } from '../utils/notifications';

function mensajeErrorOtp(e) {
  switch (e?.code) {
    case 'auth/invalid-verification-code':
      return ['Código incorrecto', 'El código no coincide. Revisa los 6 dígitos e intenta de nuevo.'];
    case 'auth/code-expired':
    case 'auth/session-expired':
      return ['Código vencido', 'Este código ya expiró. Toca "Reenviar código" para recibir uno nuevo.'];
    case 'auth/too-many-requests':
      return ['Demasiados intentos', 'Espera unos minutos antes de volver a intentar.'];
    case 'auth/network-request-failed':
      return ['Sin conexión', 'Revisa tu conexión a internet e intenta de nuevo.'];
    default:
      return ['Código inválido', 'El código ingresado no es correcto. Intenta de nuevo.'];
  }
}

export default function OTPScreen({ params, navigate }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState(params.confirmation);
  const sesionProcesada = useRef(false);

  const aMs = (v) => {
    if (typeof v === 'number') return v;
    const t = Date.parse(v || '');
    return Number.isNaN(t) ? null : t;
  };

  // Sin metadata confiable se asume nuevo: un usuario existente que pase por
  // Registro es inofensivo (el backend solo completa el nombre si estaba
  // vacío o era un placeholder), lo contrario no.
  const esUsuarioNuevo = (user) => {
    const creado = aMs(user.metadata?.creationTime);
    const ultimo = aMs(user.metadata?.lastSignInTime);
    if (creado == null || ultimo == null) return true;
    return ultimo - creado < 2 * 60 * 1000;
  };

  const continuarSesion = async (user, esNuevo) => {
    if (sesionProcesada.current) return;
    sesionProcesada.current = true;
    setLoading(true);
    let idToken;
    try {
      idToken = await user.getIdToken();
      await storePhone(params.telefono);
    } catch {
      // Falla de red: liberar el guard para que pueda reintentar
      sesionProcesada.current = false;
      setLoading(false);
      Alert.alert('Sin conexión', 'No se pudo completar el inicio de sesión. Revisa tu internet e intenta de nuevo.');
      return;
    }
    try {
      if (esNuevo ?? esUsuarioNuevo(user)) {
        navigate('Registro', { telefono: params.telefono, idToken });
        return;
      }
      try {
        const { data } = await authApi.registrar(params.telefono, 'cliente', null, idToken);
        // El backend creó el perfil recién (sin nombre): mandar al registro
        // para capturar el nombre real antes de continuar.
        if (data.es_nuevo) {
          navigate('Registro', { telefono: params.telefono, idToken });
          return;
        }
        await storeBackendToken(data.token);
        await storeUserUuid(data.usuario.id);
        registrarNotificacionesPush(data.usuario.id);
        if (!data.usuario.terminos_aceptados) {
          navigate('Terminos');
        } else {
          navigate('Home');
        }
      } catch {
        navigate('Registro', { telefono: params.telefono, idToken });
      }
    } finally {
      setLoading(false);
    }
  };

  // En Android, Google Play Services puede leer el SMS y Firebase inicia
  // sesión solo (verificación automática), consumiendo la sesión: el código
  // tecleado a mano siempre fallaría. Al detectar la sesión se continúa
  // el flujo sin exigir el código.
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      if (user && user.phoneNumber === '+57' + params.telefono) {
        continuarSesion(user);
      }
    });
    return unsubscribe;
  }, []);

  const ref0 = useRef();
  const ref1 = useRef();
  const ref2 = useRef();
  const ref3 = useRef();
  const ref4 = useRef();
  const ref5 = useRef();
  const refs = [ref0, ref1, ref2, ref3, ref4, ref5];

  const handleDigit = (text, index) => {
    const clean = text.replace(/\D/g, '');

    if (clean.length > 1) {
      const pasted = clean.slice(0, 6 - index);
      const next = [...digits];
      for (let i = 0; i < pasted.length; i++) {
        next[index + i] = pasted[i];
      }
      setDigits(next);
      const focusIdx = Math.min(index + pasted.length, 5);
      refs[focusIdx]?.current?.focus();
      return;
    }

    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    if (clean && index < 5) {
      refs[index + 1]?.current?.focus();
    }
  };

  const handleKeyPress = ({ nativeEvent }, index) => {
    if (nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      refs[index - 1]?.current?.focus();
    }
  };

  const verificar = async () => {
    const code = digits.join('');
    if (code.length < 6) {
      Alert.alert('Código incompleto', 'Ingresa los 6 dígitos del código.');
      return;
    }
    setLoading(true);
    try {
      const result = await confirmation.confirm(code);
      await continuarSesion(result.user, !!result.additionalUserInfo?.isNewUser);
    } catch (e) {
      // Si la verificación automática ya inició sesión, confirm() falla
      // aunque el código sea correcto: la sesión ya se consumió. Se
      // continúa con el usuario autenticado en vez de mostrar error.
      const user = auth().currentUser;
      if (user && user.phoneNumber === '+57' + params.telefono) {
        await continuarSesion(user);
        return;
      }
      Alert.alert(...mensajeErrorOtp(e));
    } finally {
      setLoading(false);
    }
  };

  const reenviar = async () => {
    try {
      const nueva = await auth().signInWithPhoneNumber('+57' + params.telefono);
      setConfirmation(nueva);
      setDigits(['', '', '', '', '', '']);
      Alert.alert('Código enviado', 'Te enviamos un nuevo código al mismo número.');
    } catch {
      Alert.alert('Error', 'No se pudo reenviar el código. Intenta más tarde.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <Text style={styles.titulo}>Verifica tu número</Text>
      <Text style={styles.subtitulo}>
        Enviamos un código a +57 {params.telefono}
      </Text>

      <View style={styles.otpRow}>
        {digits.map((d, i) => (
          <TextInput
            key={i}
            ref={refs[i]}
            style={styles.otpInput}
            value={d}
            onChangeText={(t) => handleDigit(t, i)}
            onKeyPress={(e) => handleKeyPress(e, i)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            textAlign="center"
          />
        ))}
      </View>

      <TouchableOpacity
        style={loading ? styles.btnDisabled : styles.btn}
        onPress={verificar}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading
          ? <ActivityIndicator color="#111111" />
          : <Text style={styles.btnText}>VERIFICAR</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity style={styles.reenviarRow} onPress={reenviar} activeOpacity={0.7}>
        <Text style={styles.reenviarText}>Reenviar código</Text>
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
    marginBottom: 10,
  },
  subtitulo: {
    fontSize: 15,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 40,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  otpInput: {
    width: 46,
    height: 56,
    borderWidth: 1.5,
    borderColor: '#EEEEEE',
    borderRadius: 14,
    fontSize: 22,
    fontWeight: '700',
    color: '#111111',
    backgroundColor: '#F8F8F8',
    textAlign: 'center',
  },
  btn: {
    backgroundColor: '#F4C400',
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  btnDisabled: {
    backgroundColor: '#F4C400',
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    opacity: 0.7,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
    letterSpacing: 1.2,
  },
  reenviarRow: {
    alignItems: 'center',
  },
  reenviarText: {
    fontSize: 14,
    color: '#888888',
    textDecorationLine: 'underline',
  },
});

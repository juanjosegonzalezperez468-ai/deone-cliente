import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Animated, Image, Alert, BackHandler,
} from 'react-native';
import { rutasApi, cercanosApi } from '../api/client';

const C = {
  white:      '#FFFFFF',
  black:      '#111111',
  yellow:     '#F4C400',
  grayLight:  '#888888',
  grayBorder: '#EEEEEE',
  grayBg:     '#F5F5F5',
};

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
};

// El conteo de "conductores cerca" usa el tipo de servicio equivalente
const TIPO_SERVICIO_EQUIV = {
  moto:      'moto_pasajero',
  carro:     'carro_pasajero',
  motocarro: 'acarreo',
  camioneta: 'acarreo',
};

const ESTADOS_ASIGNADA = ['aceptada', 'en_recogida', 'en_reparto'];

export default function BuscandoRutaScreen({ params, navigate, goBack }) {
  const { rutaId, numeroParadas, precio, tipoVehiculo, programada, recogidaLat, recogidaLng } = params;
  const [cancelando, setCancelando]   = useState(false);
  const [cerca, setCerca]             = useState(null);

  const ringScale   = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(ringScale,   { toValue: 1.7, duration: 1100, useNativeDriver: true }),
          Animated.timing(ringScale,   { toValue: 1,   duration: 1100, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(ringOpacity, { toValue: 0,   duration: 1100, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0.4, duration: 1100, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  // Conductores cerca (informativo; si falla no se muestra)
  useEffect(() => {
    if (!recogidaLat || !recogidaLng) return;
    cercanosApi
      .conductores(recogidaLat, recogidaLng, TIPO_SERVICIO_EQUIV[tipoVehiculo] || 'moto_pasajero')
      .then(({ data }) => setCerca(data?.total ?? null))
      .catch(() => {});
  }, []);

  // Polling: detectar cuando un conductor acepta (o la ruta expira)
  useEffect(() => {
    if (!rutaId) return;
    let navigated = false;
    const interval = setInterval(async () => {
      if (navigated) return;
      try {
        const { data } = await rutasApi.obtener(rutaId);
        if (ESTADOS_ASIGNADA.includes(data?.estado)) {
          navigated = true;
          clearInterval(interval);
          navigate('RutaEnCurso', { rutaId });
          return;
        }
        if (data?.estado === 'expirada') {
          navigated = true;
          clearInterval(interval);
          Alert.alert(
            'Ruta sin conductor',
            'Ningún conductor tomó tu ruta a tiempo. Puedes publicarla de nuevo.',
            [{ text: 'Aceptar', onPress: goBack }],
          );
          return;
        }
        if (data?.estado === 'cancelada_cliente') {
          navigated = true;
          clearInterval(interval);
          goBack();
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [rutaId]);

  const handleCancelar = () => {
    if (cancelando) return;
    Alert.alert(
      'Cancelar ruta',
      'La ruta aún no tiene conductor: cancelar es gratis.',
      [
        { text: 'No, seguir buscando', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            setCancelando(true);
            try {
              await rutasApi.cancelar(rutaId);
              goBack();
            } catch (e) {
              setCancelando(false);
              Alert.alert('No se pudo cancelar', e?.friendlyMessage || 'Intenta de nuevo en unos segundos.');
            }
          },
        },
      ],
    );
  };

  const handleVolver = () => {
    Alert.alert(
      'Volver al inicio',
      'Tu ruta sigue publicada. Te avisaremos con una notificación cuando un conductor la acepte; puedes verla en "Mis rutas".',
      [
        { text: 'Quedarme', style: 'cancel' },
        { text: 'Volver al inicio', onPress: goBack },
      ],
    );
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleVolver();
      return true;
    });
    return () => sub.remove();
  }, []);

  return (
    <View style={s.root}>
      <StatusBar backgroundColor={C.white} barStyle="dark-content" />

      <View style={s.header}>
        <Image source={require('../../assets/logo.png')} style={s.logo} resizeMode="contain" />
      </View>

      <View style={s.centerArea}>
        <View style={s.animWrapper}>
          <Animated.View style={[s.ring, { transform: [{ scale: ringScale }], opacity: ringOpacity }]} />
          <View style={s.circle}>
            <Text style={s.serviceIcon}>📦</Text>
          </View>
        </View>

        <Text style={s.title}>Buscando conductor...</Text>
        <Text style={s.sub}>
          {numeroParadas} entrega{numeroParadas !== 1 ? 's' : ''}
          {precio ? `  ·  $${Number(precio).toLocaleString('es-CO')} COP` : ''}
        </Text>
        {programada ? (
          <Text style={s.hint}>
            Ruta programada: te avisaremos cuando un conductor la acepte.
            Si falta 1 hora y nadie la ha tomado, te lo notificaremos.
          </Text>
        ) : (
          <Text style={s.hint}>
            {cerca !== null && cerca > 0
              ? `${cerca} conductor${cerca !== 1 ? 'es' : ''} cerca del punto de recogida`
              : 'Conectando con conductores en tu zona'}
          </Text>
        )}
      </View>

      <View style={s.infoCard}>
        <Text style={s.infoLabel}>Estado</Text>
        <Text style={s.infoValue}>
          {programada ? 'Publicada — esperando conductor' : 'Buscando conductor disponible'}
        </Text>
      </View>

      <TouchableOpacity style={s.volverBtn} onPress={handleVolver} activeOpacity={0.8}>
        <Text style={s.volverTxt}>VOLVER AL INICIO</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.cancelBtn} onPress={handleCancelar} activeOpacity={0.8} disabled={cancelando}>
        <Text style={s.cancelTxt}>{cancelando ? 'CANCELANDO...' : 'CANCELAR RUTA'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.white },
  header: { alignItems: 'center', paddingTop: 52, paddingBottom: 8 },
  logo:   { height: 32, width: 120 },

  centerArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },

  animWrapper: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center', marginBottom: 36 },
  ring: {
    position: 'absolute',
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: C.yellow,
  },
  circle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: C.yellow,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.yellow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  serviceIcon: { fontSize: 44 },

  title: { color: C.black, fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 8, letterSpacing: -0.3 },
  sub:   { color: C.grayLight, fontSize: 14, textAlign: 'center', marginBottom: 6 },
  hint:  { color: C.grayLight, fontSize: 12, textAlign: 'center', marginBottom: 24, lineHeight: 18 },

  infoCard: {
    marginHorizontal: 24,
    backgroundColor:  C.white,
    borderRadius:     20,
    padding:          18,
    borderWidth:      1,
    borderColor:      C.grayBorder,
    marginBottom:     10,
    ...SHADOW,
  },
  infoLabel: { color: C.grayLight, fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 4 },
  infoValue: { color: C.black, fontSize: 15, fontWeight: '600' },

  volverBtn: {
    marginHorizontal: 24,
    backgroundColor:  C.black,
    borderRadius:     18,
    paddingVertical:  16,
    alignItems:       'center',
    marginBottom:     6,
  },
  volverTxt: { color: C.yellow, fontSize: 14, fontWeight: '800', letterSpacing: 1 },

  cancelBtn: { marginHorizontal: 24, marginBottom: 40, paddingVertical: 14, alignItems: 'center' },
  cancelTxt: { color: C.yellow, fontSize: 14, fontWeight: '700', letterSpacing: 2 },
});

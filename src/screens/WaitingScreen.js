import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Animated, Image,
} from 'react-native';
import { SERVICES } from '../constants/services';
import { offersApi } from '../api/client';

const C = {
  white: '#FFFFFF',
  black: '#111111',
  yellow: '#F4C400',
  grayLight: '#888888',
  grayBorder: '#EEEEEE',
  grayBg: '#F5F5F5',
};

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
};

export default function WaitingScreen({ params, navigate, goBack }) {
  const { serviceId, serviceDbId, precioPropuesto } = params;
  const service = SERVICES.find((srv) => srv.id === serviceId);

  const ringScale   = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.4)).current;

  // Animación pulsante
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

  // Polling cada 5s para detectar ofertas de conductores
  useEffect(() => {
    if (!serviceDbId) return;
    const interval = setInterval(async () => {
      try {
        const { data } = await offersApi.porSolicitud(serviceDbId);
        if (Array.isArray(data.ofertas) && data.ofertas.length > 0) {
          clearInterval(interval);
          navigate('Ofertas', { ...params, ofertas: data.ofertas });
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [serviceDbId]);

  return (
    <View style={s.root}>
      <StatusBar backgroundColor={C.white} barStyle="dark-content" />

      {/* Header */}
      <View style={s.header}>
        <Image
          source={require('../../assets/logo.png')}
          style={s.logo}
          resizeMode="contain"
        />
      </View>

      {/* Área central con animación */}
      <View style={s.centerArea}>
        <View style={s.animWrapper}>
          <Animated.View
            style={[s.ring, { transform: [{ scale: ringScale }], opacity: ringOpacity }]}
          />
          <View style={s.circle}>
            <Text style={s.serviceIcon}>{service ? service.icon : '🚗'}</Text>
          </View>
        </View>

        <Text style={s.title}>Buscando conductor...</Text>
        <Text style={s.sub}>
          {service ? service.label : 'Servicio'}
          {precioPropuesto ? `  ·  $${precioPropuesto.toLocaleString('es-CO')} COP` : ''}
        </Text>
        <Text style={s.hint}>Conectando con conductores cercanos en tu zona</Text>

        <DotsLoader />
      </View>

      {/* Info card */}
      <View style={[s.infoCard, SHADOW]}>
        <Text style={s.infoLabel}>Estado</Text>
        <Text style={s.infoValue}>Esperando oferta de conductor</Text>
      </View>

      {/* Cancelar */}
      <TouchableOpacity style={s.cancelBtn} onPress={goBack} activeOpacity={0.8}>
        <Text style={s.cancelTxt}>CANCELAR</Text>
      </TouchableOpacity>
    </View>
  );
}

function DotsLoader() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = (dot, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1,   duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      );
    Animated.parallel([anim(dot1, 0), anim(dot2, 200), anim(dot3, 400)]).start();
  }, []);

  return (
    <View style={s.dotsRow}>
      <Animated.View style={[s.dot, { opacity: dot1 }]} />
      <Animated.View style={[s.dot, { opacity: dot2 }]} />
      <Animated.View style={[s.dot, { opacity: dot3 }]} />
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

  dotsRow: { flexDirection: 'row', gap: 8 },
  dot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: C.yellow },

  infoCard: {
    marginHorizontal: 24,
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: C.grayBorder,
    marginBottom: 16,
  },
  infoLabel: { color: C.grayLight, fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 4 },
  infoValue: { color: C.black, fontSize: 15, fontWeight: '600' },

  cancelBtn: { marginHorizontal: 24, marginBottom: 48, paddingVertical: 18, alignItems: 'center' },
  cancelTxt: { color: C.yellow, fontSize: 15, fontWeight: '700', letterSpacing: 2 },
});

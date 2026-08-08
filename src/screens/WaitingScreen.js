import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Animated, Image, Alert, BackHandler,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SERVICES } from '../constants/services';
import { offersApi, servicesApi, cercanosApi } from '../api/client';

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

// Las posiciones se muestran desplazadas unos cientos de metros. Dos razones:
// la exacta permitiría deducir dónde vive o para un conductor, y una moto
// pintada en una esquina concreta promete algo que no podemos garantizar
// —ese conductor puede estar ocupado o no querer el viaje—. Lo honesto es
// mostrar que hay movimiento en la zona, no señalar personas.
const DESVIO_GRADOS = 0.0035;   // ~350 m

// Determinista a partir del id: el mismo conductor no salta de sitio entre
// refrescos, que se vería como si se estuviera moviendo sin hacerlo.
const difuminar = (lat, lng, semilla) => {
  let h = 0;
  for (let i = 0; i < semilla.length; i++) h = (h * 31 + semilla.charCodeAt(i)) | 0;
  const a = (h % 360) * (Math.PI / 180);
  const r = ((Math.abs(h >> 9) % 100) / 100) * DESVIO_GRADOS;
  return { latitude: lat + Math.sin(a) * r, longitude: lng + Math.cos(a) * r };
};

export default function WaitingScreen({ params, navigate, goBack }) {
  const { serviceId, serviceDbId, precioPropuesto, origenLat, origenLng } = params;
  const service = SERVICES.find((srv) => srv.id === serviceId);
  const [cancelando, setCancelando] = useState(false);
  const [cerca, setCerca] = useState(null);   // null = aún no se sabe

  // Conductores conectados en la zona. El endpoint ya descarta a quien lleve
  // más de 10 min sin enviar ubicación, así que el dato es honesto.
  useEffect(() => {
    if (!origenLat || !origenLng) return;
    let vivo = true;
    const consultar = () => {
      cercanosApi.conductores(origenLat, origenLng, serviceId, 5)
        .then(({ data }) => { if (vivo) setCerca(data?.conductores || []); })
        .catch(() => { if (vivo) setCerca([]); });
    };
    consultar();
    const iv = setInterval(consultar, 20000);
    return () => { vivo = false; clearInterval(iv); };
  }, [origenLat, origenLng, serviceId]);

  const handleCancelar = async () => {
    if (cancelando) return;
    if (!serviceDbId) {
      goBack();
      return;
    }
    setCancelando(true);
    try {
      await servicesApi.cancelar(serviceDbId);
      goBack();
    } catch (e) {
      setCancelando(false);
      Alert.alert(
        'No se pudo cancelar',
        e?.friendlyMessage || 'Intenta de nuevo en unos segundos.',
      );
    }
  };

  // Botón físico/gesto "atrás" de Android: mismo efecto que el botón CANCELAR
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleCancelar();
      return true;
    });
    return () => sub.remove();
  }, [serviceDbId, cancelando]);

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

  // Polling cada 5s para detectar ofertas (contraoferta) o aceptación directa del conductor
  useEffect(() => {
    if (!serviceDbId) return;
    let navigated = false;

    const interval = setInterval(async () => {
      if (navigated) return;
      try {
        // Flujo contraoferta: el conductor propone precio, el cliente elige
        const { data: ofertasData } = await offersApi.porSolicitud(serviceDbId);
        if (Array.isArray(ofertasData.ofertas) && ofertasData.ofertas.length > 0) {
          navigated = true;
          clearInterval(interval);
          navigate('Ofertas', { ...params, ofertas: ofertasData.ofertas });
          return;
        }

        // Flujo aceptación directa: el conductor aceptó al precio del cliente
        const { data: serviceData } = await servicesApi.obtener(serviceDbId);

        if (serviceData?.estado === 'cancelado') {
          navigated = true;
          clearInterval(interval);
          Alert.alert(
            'Solicitud cancelada',
            'El conductor canceló la solicitud.',
            [{ text: 'Aceptar', onPress: goBack }]
          );
          return;
        }

        if (serviceData?.estado === 'expirado') {
          navigated = true;
          clearInterval(interval);
          Alert.alert(
            'Solicitud expirada',
            'No se encontró conductor a tiempo. Intenta de nuevo.',
            [{ text: 'Aceptar', onPress: goBack }]
          );
          return;
        }

        const ASIGNADO = ['confirmado', 'en_camino', 'en_servicio', 'aceptado'];
        if (ASIGNADO.includes(serviceData?.estado) && serviceData?.conductor_id) {
          navigated = true;
          clearInterval(interval);
          navigate('ConductorEnCamino', {
            serviceDbId,
            precioPropuesto:   params.precioPropuesto,
            origenDir:         params.origenDir,
            destDir:           params.destDir,
            origenLat:         params.origenLat,
            origenLng:         params.origenLng,
            destLat:           params.destLat,
            destLng:           params.destLng,
            conductorId:       serviceData.conductor_id,
            conductorNombre:   serviceData.conductor?.nombre                    || 'Conductor',
            conductorRating:   serviceData.conductor?.rating                    || 4.8,
            conductorVehiculo: serviceData.conductor?.vehiculo?.tipo_servicio   || 'Moto',
            conductorPlaca:    serviceData.conductor?.vehiculo?.placa           || '—',
            precioAceptado:    serviceData.precio_final || params.precioPropuesto,
          });
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

      {/* Mapa de la zona. Solo si tenemos origen: sin coordenadas no hay nada
          honesto que pintar. */}
      {origenLat && origenLng && (
        <View style={[s.mapaCard, SHADOW]}>
          <MapView
            style={s.mapa}
            initialRegion={{
              latitude: origenLat, longitude: origenLng,
              latitudeDelta: 0.02, longitudeDelta: 0.02,
            }}
            pointerEvents="none"
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            toolbarEnabled={false}
          >
            <Marker coordinate={{ latitude: origenLat, longitude: origenLng }} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={s.puntoYo}><View style={s.puntoYoDentro} /></View>
            </Marker>

            {(cerca || []).map((c) => (
              <Marker
                key={c.conductor_id}
                coordinate={difuminar(Number(c.lat), Number(c.lng), String(c.conductor_id))}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={false}
              >
                <Text style={s.marcadorConductor}>{service ? service.icon : '🚗'}</Text>
              </Marker>
            ))}
          </MapView>

          <View style={s.mapaPie}>
            <Text style={s.mapaTxt}>
              {cerca === null ? 'Mirando tu zona…'
                : cerca.length === 0
                  ? 'Por ahora no hay conductores conectados cerca'
                  : cerca.length === 1
                    ? 'Hay 1 conductor conectado en tu zona'
                    : `Hay ${cerca.length} conductores conectados en tu zona`}
            </Text>
            {!!(cerca || []).length && (
              <Text style={s.mapaNota}>Ubicaciones aproximadas</Text>
            )}
          </View>
        </View>
      )}

      {/* Info card */}
      <View style={[s.infoCard, SHADOW]}>
        <Text style={s.infoLabel}>Estado</Text>
        <Text style={s.infoValue}>Esperando oferta de conductor</Text>
      </View>

      {/* Cancelar */}
      <TouchableOpacity
        style={s.cancelBtn}
        onPress={handleCancelar}
        activeOpacity={0.8}
        disabled={cancelando}
      >
        <Text style={s.cancelTxt}>{cancelando ? 'CANCELANDO...' : 'CANCELAR'}</Text>
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

  /* Mapa de la zona */
  mapaCard: {
    marginHorizontal: 20, marginBottom: 14,
    borderRadius: 18, overflow: 'hidden', backgroundColor: C.white,
  },
  mapa:    { height: 150, width: '100%' },
  mapaPie: { paddingHorizontal: 14, paddingVertical: 11 },
  mapaTxt: { fontSize: 13, fontWeight: '600', color: C.black },
  mapaNota:{ fontSize: 10, color: C.grayLight, marginTop: 3 },
  puntoYo: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(244,196,0,0.30)',
    alignItems: 'center', justifyContent: 'center',
  },
  puntoYoDentro: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: C.yellow, borderWidth: 2, borderColor: C.white,
  },
  marcadorConductor: { fontSize: 20 },

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

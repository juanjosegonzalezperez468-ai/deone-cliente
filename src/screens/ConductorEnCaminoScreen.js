import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Linking, Alert, Image, Modal, BackHandler,
} from 'react-native';
import ChatScreen from './ChatScreen';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { servicesApi, locationsApi } from '../api/client';
import { isNocturno } from '../utils/fare';
import { connectTripSocket } from '../utils/socket';

const C = {
  bg:          '#F8F8F8',
  white:       '#FFFFFF',
  black:       '#111111',
  yellow:      '#FFC400',
  gray:        '#757575',
  border:      '#EEEEEE',
  green:       '#22C55E',
  greenBg:     '#F0FDF4',
  greenBorder: '#BBF7D0',
  red:         '#FF3B30',
  night:       '#1E3A5F',
  nightBg:     '#EFF6FF',
};

const SHADOW = {
  shadowColor:   '#000',
  shadowOffset:  { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius:  8,
  elevation:     4,
};

const ESTADOS_VIAJE = ['en_servicio', 'completado'];

export default function ConductorEnCaminoScreen({ params, navigate, goBack }) {
  const {
    conductorNombre   = 'Conductor',
    conductorFoto     = null,
    conductorRating   = 4.8,
    conductorVehiculo = 'Moto',
    conductorPlaca    = '—',
    precioAceptado    = 0,
    origenDir         = 'Tu ubicación',
    destDir           = 'Destino',
    serviceDbId       = '',
    conductorId       = '',
    origenLat         = 4.6097,
    origenLng         = -74.0817,
  } = params;

  const [eta, setEta]               = useState(null);
  const [conductorPos, setConductorPos] = useState(null);
  const [conductorTelefono, setConductorTelefono] = useState('');
  const [chatVisible, setChatVisible]   = useState(false);
  const [cancelando, setCancelando]     = useState(false);
  const mapRef                      = useRef(null);
  const nocturno                    = isNocturno();
  const inicial                     = conductorNombre.charAt(0).toUpperCase();

  // Poll trip state every 10s (y una vez de inmediato al entrar)
  useEffect(() => {
    if (!serviceDbId) return;
    let cancelled = false;

    const fetchTripState = async () => {
      try {
        const { data } = await servicesApi.obtener(serviceDbId);
        if (cancelled) return;
        if (data?.eta_minutos) setEta(data.eta_minutos);
        if (data?.conductor?.telefono) setConductorTelefono(data.conductor.telefono);
        if (data?.estado === 'cancelado') {
          cancelled = true;
          Alert.alert(
            'Viaje cancelado',
            'El conductor canceló el viaje.',
            [{ text: 'Aceptar', onPress: goBack }]
          );
          return;
        }
        if (data?.estado === 'expirado') {
          cancelled = true;
          Alert.alert(
            'Servicio expirado',
            'Este servicio ya no está disponible.',
            [{ text: 'Aceptar', onPress: goBack }]
          );
          return;
        }
        if (ESTADOS_VIAJE.includes(data?.estado)) {
          cancelled = true;
          navigate('ViajeEnCurso', params);
        }
      } catch {}
    };

    fetchTripState();
    const interval = setInterval(() => {
      if (!cancelled) fetchTripState();
    }, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [serviceDbId]);

  // Ubicación del conductor: un fetch inicial por REST (para no esperar el
  // primer movimiento) y luego tiempo real por socket en vez de polling.
  useEffect(() => {
    if (!conductorId || !serviceDbId) return;
    let socket;
    let cancelled = false;

    const aplicarPos = (lat, lng) => {
      const pos = { latitude: lat, longitude: lng };
      setConductorPos(pos);
      mapRef.current?.animateToRegion(
        { ...pos, latitudeDelta: 0.04, longitudeDelta: 0.04 },
        500,
      );
    };

    locationsApi.obtenerConductor(conductorId)
      .then(({ data }) => {
        if (!cancelled && data?.lat && data?.lng) aplicarPos(data.lat, data.lng);
      })
      .catch(() => {});

    connectTripSocket(serviceDbId, (data) => {
      if (!cancelled) aplicarPos(data.lat, data.lng);
    }).then((s) => {
      if (cancelled) { s?.disconnect(); return; }
      socket = s;
    });

    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [conductorId, serviceDbId]);

  const handleLlamar = () => {
    if (!conductorTelefono) {
      Alert.alert(
        'Número no disponible',
        'Aún no tenemos el número del conductor. Intenta de nuevo en unos segundos o usa el chat.',
      );
      return;
    }
    const digits = conductorTelefono.replace(/\D/g, '');
    const numero = digits.startsWith('57') ? `+${digits}` : `+57${digits}`;
    Linking.openURL(`tel:${numero}`).catch(() => {});
  };

  const handleVerEnMapa = () => {
    if (!conductorPos) return;
    const { latitude: lat, longitude: lng } = conductorPos;
    const googleUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    const geoUrl    = `geo:${lat},${lng}`;
    Linking.canOpenURL(googleUrl)
      .then((supported) => Linking.openURL(supported ? googleUrl : geoUrl))
      .catch(() => Linking.openURL(geoUrl).catch(() => {}));
  };

  const handleCancelar = () => {
    if (cancelando) return;
    Alert.alert(
      'Cancelar viaje',
      'El conductor ya fue asignado. ¿Seguro que quieres cancelar el viaje?',
      [
        { text: 'No, continuar', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
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
          },
        },
      ],
    );
  };

  const handleVolverInicio = () => {
    Alert.alert(
      'Volver al inicio',
      'El viaje seguirá activo. Podrás continuar viéndolo desde "Mis viajes".',
      [
        { text: 'Quedarme', style: 'cancel' },
        { text: 'Volver al inicio', onPress: goBack },
      ],
    );
  };

  // Botón físico/gesto "atrás" de Android: mismo comportamiento que la flecha del header
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleVolverInicio();
      return true;
    });
    return () => sub.remove();
  }, []);

  const handleSOS = () => {
    Alert.alert(
      '¿Necesitas ayuda?',
      '',
      [
        { text: 'Llamar 123', onPress: () => Linking.openURL('tel:123').catch(() => {}) },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={s.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* Header flotante */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={handleVolverInicio} activeOpacity={0.8}>
          <Text style={s.backArrowTxt}>←</Text>
        </TouchableOpacity>
        <Image source={require('../../assets/logo.png')} style={s.logo} resizeMode="contain" />
        <TouchableOpacity style={s.sosBtn} onPress={handleSOS} activeOpacity={0.8}>
          <Text style={s.sosTxt}>SOS</Text>
        </TouchableOpacity>
      </View>

      {/* Mapa real */}
      <View style={s.mapArea}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude:      origenLat,
            longitude:     origenLng,
            latitudeDelta: 0.04,
            longitudeDelta: 0.04,
          }}
        >
          {conductorPos && (
            <Marker coordinate={conductorPos} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={s.conductorMarker}>
                <Text style={s.markerEmoji}>🏍️</Text>
              </View>
            </Marker>
          )}
          {!!origenLat && !!origenLng && (
            <Marker
              coordinate={{ latitude: origenLat, longitude: origenLng }}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View style={s.pickupMarker}>
                <Text style={s.markerEmoji}>📍</Text>
              </View>
            </Marker>
          )}
        </MapView>

        <View style={s.mapOriginBadge}>
          <Text style={s.mapOriginTxt} numberOfLines={1}>{origenDir}</Text>
        </View>

        <View style={s.etaBadge}>
          <Text style={s.etaTxt}>⏱  {eta ? `${eta} min` : 'En camino'}</Text>
        </View>
      </View>

      {/* Bottom sheet */}
      <View style={s.sheet}>

        {/* Card conductor */}
        <View style={s.driverCard}>
          {conductorFoto ? (
            <Image source={{ uri: conductorFoto }} style={s.avatarFoto} />
          ) : (
            <View style={s.avatar}>
              <Text style={s.avatarTxt}>{inicial}</Text>
            </View>
          )}
          <View style={s.driverInfo}>
            <Text style={s.driverName}>{conductorNombre}</Text>
            <View style={s.ratingRow}>
              <Text style={s.star}>★</Text>
              <Text style={s.ratingTxt}>{Number(conductorRating).toFixed(1)}</Text>
            </View>
            <Text style={s.vehiculoTxt}>{conductorVehiculo}</Text>
          </View>
          <View style={s.driverRight}>
            <View style={s.plateBadge}>
              <Text style={s.plateTxt}>{conductorPlaca}</Text>
            </View>
            <Text style={s.llegadaTxt}>{eta ? `${eta} min` : 'En camino'}</Text>
          </View>
        </View>

        {/* Precio confirmado */}
        <View style={s.precioRow}>
          <View style={s.precioLeft}>
            <Text style={s.precioLbl}>Precio acordado</Text>
            <Text style={s.precioVal}>
              ${Number(precioAceptado).toLocaleString('es-CO')} COP
            </Text>
            {nocturno && (
              <View style={s.nocturnoBadge}>
                <Text style={s.nocturnoBadgeTxt}>TARIFA NOCTURNA 🌙</Text>
              </View>
            )}
          </View>
          <View style={s.confirmBadge}>
            <Text style={s.confirmTxt}>✓ CONFIRMADO</Text>
          </View>
        </View>

        {/* Botón llamar */}
        <TouchableOpacity style={s.btnLlamar} onPress={handleLlamar} activeOpacity={0.85}>
          <Text style={s.btnLlamarTxt}>📞  LLAMAR AL CONDUCTOR</Text>
        </TouchableOpacity>

        {/* Botón ver en mapa */}
        <TouchableOpacity style={s.btnMapa} onPress={handleVerEnMapa} activeOpacity={0.85}>
          <Text style={s.btnMapaTxt}>🗺️  VER EN MAPA</Text>
        </TouchableOpacity>

        {/* Botón chat */}
        <TouchableOpacity style={s.btnChat} onPress={() => setChatVisible(true)} activeOpacity={0.85}>
          <Text style={s.btnChatTxt}>💬  CHAT</Text>
        </TouchableOpacity>

        {/* Cancelar viaje */}
        <TouchableOpacity
          style={s.btnSalir}
          onPress={handleCancelar}
          activeOpacity={0.7}
          disabled={cancelando}
        >
          <Text style={s.btnSalirTxt}>
            {cancelando ? 'CANCELANDO...' : 'CANCELAR VIAJE'}
          </Text>
        </TouchableOpacity>

      </View>

      {/* Modal chat */}
      <Modal
        visible={chatVisible}
        animationType="slide"
        onRequestClose={() => setChatVisible(false)}
      >
        <ChatScreen
          params={{ serviceDbId }}
          onClose={() => setChatVisible(false)}
        />
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  /* Header */
  header: {
    position:          'absolute',
    top:               0,
    left:              0,
    right:             0,
    zIndex:            10,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: 16,
    paddingTop:        52,
    paddingBottom:     12,
  },
  logo:   { height: 28, width: 90 },
  backBtn: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems:      'center',
    justifyContent:  'center',
    ...SHADOW,
  },
  backArrowTxt: { color: C.black, fontSize: 20, fontWeight: '700' },
  sosBtn: {
    backgroundColor:   C.red,
    borderRadius:      20,
    paddingHorizontal: 14,
    paddingVertical:   8,
  },
  sosTxt: { color: C.white, fontSize: 12, fontWeight: '800', letterSpacing: 1 },

  /* Mapa */
  mapArea: {
    flex:     1,
    overflow: 'hidden',
  },

  conductorMarker: {
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: C.yellow,
    alignItems:      'center',
    justifyContent:  'center',
    shadowColor:     C.yellow,
    shadowOffset:    { width: 0, height: 3 },
    shadowOpacity:   0.5,
    shadowRadius:    6,
    elevation:       5,
  },
  pickupMarker: {
    width:           38,
    height:          38,
    borderRadius:    19,
    backgroundColor: C.green,
    alignItems:      'center',
    justifyContent:  'center',
    elevation:       4,
  },
  markerEmoji: { fontSize: 20 },

  mapOriginBadge: {
    position:          'absolute',
    bottom:            12,
    left:              12,
    right:             12,
    backgroundColor:   'rgba(255,255,255,0.92)',
    borderRadius:      12,
    paddingHorizontal: 12,
    paddingVertical:   6,
  },
  mapOriginTxt: { color: C.black, fontSize: 12, fontWeight: '500', textAlign: 'center' },

  etaBadge: {
    position:          'absolute',
    top:               100,
    right:             16,
    backgroundColor:   C.white,
    borderRadius:      12,
    paddingHorizontal: 12,
    paddingVertical:   6,
    ...SHADOW,
  },
  etaTxt: { color: C.black, fontSize: 13, fontWeight: '700' },

  /* Bottom sheet */
  sheet: {
    backgroundColor:      C.bg,
    borderTopLeftRadius:  28,
    borderTopRightRadius: 28,
    paddingHorizontal:    16,
    paddingTop:           16,
    paddingBottom:        36,
  },

  driverCard: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: C.white,
    borderRadius:    20,
    padding:         14,
    marginBottom:    12,
    ...SHADOW,
  },
  avatar: {
    width:           52,
    height:          52,
    borderRadius:    26,
    backgroundColor: C.yellow,
    alignItems:      'center',
    justifyContent:  'center',
    marginRight:     12,
  },
  avatarTxt:   { color: C.black, fontSize: 22, fontWeight: '800' },
  avatarFoto: {
    width:           52,
    height:          52,
    borderRadius:    26,
    marginRight:     12,
    backgroundColor: '#EEEEEE',
  },
  driverInfo:  { flex: 1 },
  driverName:  { color: C.black, fontSize: 16, fontWeight: '700', marginBottom: 3 },
  ratingRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  star:        { color: C.yellow, fontSize: 13, marginRight: 3 },
  ratingTxt:   { color: C.black, fontSize: 13, fontWeight: '600' },
  vehiculoTxt: { color: C.gray, fontSize: 12 },
  driverRight: { alignItems: 'flex-end', gap: 6 },
  plateBadge:  {
    backgroundColor:   C.bg,
    borderRadius:      8,
    paddingHorizontal: 8,
    paddingVertical:   4,
  },
  plateTxt:   { color: C.black, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  llegadaTxt: { color: C.green, fontSize: 12, fontWeight: '700' },

  precioRow: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    backgroundColor: C.greenBg,
    borderRadius:    16,
    padding:         14,
    marginBottom:    12,
    borderWidth:     1,
    borderColor:     C.greenBorder,
  },
  precioLeft:    { flex: 1 },
  precioLbl:     { color: C.gray, fontSize: 11, marginBottom: 3 },
  precioVal:     { color: C.black, fontSize: 20, fontWeight: '800', marginBottom: 4 },
  confirmBadge:  {
    backgroundColor:   C.green,
    borderRadius:      10,
    paddingHorizontal: 10,
    paddingVertical:   5,
  },
  confirmTxt: { color: C.white, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  nocturnoBadge: {
    backgroundColor:   C.nightBg,
    borderRadius:      8,
    paddingHorizontal: 8,
    paddingVertical:   3,
    alignSelf:         'flex-start',
  },
  nocturnoBadgeTxt: { color: C.night, fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },

  btnLlamar: {
    borderRadius:    18,
    paddingVertical: 16,
    alignItems:      'center',
    borderWidth:     1.5,
    borderColor:     C.black,
    marginBottom:    10,
  },
  btnLlamarTxt: { color: C.black, fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },

  btnMapa: {
    borderRadius:    18,
    paddingVertical: 16,
    alignItems:      'center',
    borderWidth:     1.5,
    borderColor:     C.yellow,
    marginBottom:    10,
  },
  btnMapaTxt: { color: C.yellow, fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },

  btnChat: {
    borderRadius:    18,
    paddingVertical: 16,
    alignItems:      'center',
    borderWidth:     1.5,
    borderColor:     C.yellow,
  },
  btnChatTxt: { color: C.yellow, fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },

  btnSalir:    { paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnSalirTxt: { color: C.red, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
});

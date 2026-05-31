import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Linking, Alert, Image,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { servicesApi, locationsApi } from '../api/client';
import { isNocturno } from '../utils/fare';

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

const ESTADOS_VIAJE = ['en_viaje', 'iniciado', 'viaje_iniciado', 'on_trip'];

export default function ConductorEnCaminoScreen({ params, navigate }) {
  const {
    conductorNombre   = 'Conductor',
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

  const [eta, setEta]               = useState(3);
  const [conductorPos, setConductorPos] = useState(null);
  const mapRef                      = useRef(null);
  const nocturno                    = isNocturno();
  const inicial                     = conductorNombre.charAt(0).toUpperCase();

  // Poll trip state every 10s
  useEffect(() => {
    if (!serviceDbId) return;
    const interval = setInterval(async () => {
      try {
        const { data } = await servicesApi.obtener(serviceDbId);
        if (data?.eta_minutos) setEta(data.eta_minutos);
        if (ESTADOS_VIAJE.includes(data?.estado)) {
          clearInterval(interval);
          navigate('ViajeEnCurso', params);
        }
      } catch {}
    }, 10000);
    return () => clearInterval(interval);
  }, [serviceDbId]);

  // Poll conductor location every 10s
  useEffect(() => {
    if (!conductorId) return;

    const fetchPos = async () => {
      try {
        const { data } = await locationsApi.obtenerConductor(conductorId);
        if (data?.lat && data?.lng) {
          const pos = { latitude: data.lat, longitude: data.lng };
          setConductorPos(pos);
          mapRef.current?.animateToRegion(
            { ...pos, latitudeDelta: 0.04, longitudeDelta: 0.04 },
            500,
          );
        }
      } catch {}
    };

    fetchPos();
    const interval = setInterval(fetchPos, 10000);
    return () => clearInterval(interval);
  }, [conductorId]);

  const handleLlamar = () => {
    Linking.openURL('tel:+573009000000').catch(() => {});
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
          <Text style={s.etaTxt}>⏱  {eta} min</Text>
        </View>
      </View>

      {/* Bottom sheet */}
      <View style={s.sheet}>

        {/* Card conductor */}
        <View style={s.driverCard}>
          <View style={s.avatar}>
            <Text style={s.avatarTxt}>{inicial}</Text>
          </View>
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
            <Text style={s.llegadaTxt}>{eta} min</Text>
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

      </View>
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
  },
  btnMapaTxt: { color: C.yellow, fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
});

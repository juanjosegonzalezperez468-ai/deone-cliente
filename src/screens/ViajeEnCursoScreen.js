import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Share, Alert, Linking, Image, Modal,
} from 'react-native';
import ChatScreen from './ChatScreen';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { servicesApi } from '../api/client';

const C = {
  bg:     '#F8F8F8',
  white:  '#FFFFFF',
  black:  '#111111',
  yellow: '#FFC400',
  gray:   '#757575',
  border: '#EEEEEE',
  red:    '#FF3B30',
};

const SHADOW = {
  shadowColor:   '#000',
  shadowOffset:  { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius:  8,
  elevation:     4,
};

const ESTADOS_FINALIZADO = ['finalizado', 'completado', 'terminado', 'finished'];

export default function ViajeEnCursoScreen({ params, navigate }) {
  const {
    conductorNombre   = 'Conductor',
    conductorVehiculo = 'Moto',
    precioAceptado    = params.precioPropuesto || 0,
    destDir           = 'Destino',
    serviceDbId       = '',
    conductorId       = '',
    destLat           = 0,
    destLng           = 0,
  } = params;

  const [clientPos, setClientPos]   = useState(null);
  const [chatVisible, setChatVisible] = useState(false);
  const mapRef                      = useRef(null);
  const inicial                   = conductorNombre.charAt(0).toUpperCase();

  // Obtain GPS position once
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const pos = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setClientPos(pos);

      if (destLat && destLng) {
        mapRef.current?.fitToCoordinates(
          [pos, { latitude: destLat, longitude: destLng }],
          { edgePadding: { top: 120, right: 60, bottom: 280, left: 60 }, animated: true },
        );
      } else {
        mapRef.current?.animateToRegion(
          { ...pos, latitudeDelta: 0.05, longitudeDelta: 0.05 },
          500,
        );
      }
    })();
  }, []);

  // Poll trip state every 10s
  useEffect(() => {
    if (!serviceDbId) return;
    const interval = setInterval(async () => {
      try {
        const { data } = await servicesApi.obtener(serviceDbId);
        if (ESTADOS_FINALIZADO.includes(data?.estado)) {
          clearInterval(interval);
          navigate('ServicioFinalizado', {
            serviceDbId,
            conductorId,
            precioFinal:    precioAceptado,
            conductorNombre,
          });
        }
      } catch {}
    }, 10000);
    return () => clearInterval(interval);
  }, [serviceDbId]);

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

  const handleCompartir = async () => {
    const msg = `Estoy viajando con DEONE 🛵\nConductor: ${conductorNombre} · ${conductorVehiculo}\nDestino: ${destDir}`;
    const url = `whatsapp://send?text=${encodeURIComponent(msg)}`;
    const canOpen = await Linking.canOpenURL(url).catch(() => false);
    if (canOpen) {
      Linking.openURL(url).catch(() => {});
    } else {
      Share.share({ message: msg }).catch(() => {});
    }
  };

  const hasDestination = !!destLat && !!destLng;

  return (
    <View style={s.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* Mapa pantalla completa */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude:       destLat || 4.6097,
          longitude:      destLng || -74.0817,
          latitudeDelta:  0.06,
          longitudeDelta: 0.06,
        }}
      >
        {clientPos && (
          <Marker coordinate={clientPos} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={s.clientMarker}>
              <Text style={s.markerEmoji}>📍</Text>
            </View>
          </Marker>
        )}

        {hasDestination && (
          <Marker
            coordinate={{ latitude: destLat, longitude: destLng }}
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={s.destMarker}>
              <Text style={s.markerEmoji}>🏁</Text>
            </View>
          </Marker>
        )}

        {clientPos && hasDestination && (
          <Polyline
            coordinates={[
              clientPos,
              { latitude: destLat, longitude: destLng },
            ]}
            strokeColor={C.yellow}
            strokeWidth={4}
          />
        )}
      </MapView>

      {/* Badge EN VIAJE flotante */}
      <View style={s.statusBadge}>
        <View style={s.statusDot} />
        <Text style={s.statusTxt}>EN VIAJE</Text>
      </View>

      {/* Botón SOS flotante */}
      <TouchableOpacity style={s.sosBtn} onPress={handleSOS} activeOpacity={0.8}>
        <Text style={s.sosTxt}>SOS</Text>
      </TouchableOpacity>

      {/* Card flotante abajo */}
      <View style={s.bottomSheet}>

        <View style={s.infoCard}>
          <View style={s.conductorRow}>
            <View style={s.avatar}>
              <Text style={s.avatarTxt}>{inicial}</Text>
            </View>
            <View style={s.conductorInfo}>
              <Text style={s.conductorNombre}>{conductorNombre}</Text>
              <Text style={s.conductorVehiculo}>{conductorVehiculo}</Text>
            </View>
            <View style={s.infoRight}>
              <Text style={s.precioVal}>
                ${Number(precioAceptado).toLocaleString('es-CO')}
              </Text>
              <Text style={s.precioLbl}>Total</Text>
            </View>
          </View>

          <View style={s.destRow}>
            <View style={s.destDot} />
            <Text style={s.destTxt} numberOfLines={2}>{destDir}</Text>
          </View>
        </View>

        <TouchableOpacity style={s.btnCompartir} onPress={handleCompartir} activeOpacity={0.85}>
          <Text style={s.btnCompartirTxt}>COMPARTIR VIAJE</Text>
        </TouchableOpacity>

        {/* Botón chat */}
        <TouchableOpacity style={s.btnChat} onPress={() => setChatVisible(true)} activeOpacity={0.85}>
          <Text style={s.btnChatTxt}>💬  CHAT</Text>
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

  /* Markers */
  clientMarker: {
    width:           38,
    height:          38,
    borderRadius:    19,
    backgroundColor: '#FFFFFF',
    alignItems:      'center',
    justifyContent:  'center',
    elevation:       4,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.2,
    shadowRadius:    4,
  },
  destMarker: {
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: '#111111',
    alignItems:      'center',
    justifyContent:  'center',
    elevation:       5,
  },
  markerEmoji: { fontSize: 20 },

  /* Status badge */
  statusBadge: {
    position:          'absolute',
    top:               56,
    left:              16,
    zIndex:            10,
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   C.white,
    borderRadius:      14,
    paddingHorizontal: 12,
    paddingVertical:   7,
    ...SHADOW,
  },
  statusDot: {
    width:           8,
    height:          8,
    borderRadius:    4,
    backgroundColor: '#22C55E',
    marginRight:     7,
  },
  statusTxt: { color: C.black, fontSize: 12, fontWeight: '700', letterSpacing: 1 },

  /* SOS button */
  sosBtn: {
    position:          'absolute',
    top:               56,
    right:             16,
    zIndex:            10,
    backgroundColor:   C.red,
    borderRadius:      14,
    paddingHorizontal: 12,
    paddingVertical:   7,
    ...SHADOW,
  },
  sosTxt: { color: C.white, fontSize: 12, fontWeight: '800', letterSpacing: 1 },

  /* Bottom sheet */
  bottomSheet: {
    position:             'absolute',
    bottom:               0,
    left:                 0,
    right:                0,
    backgroundColor:      C.bg,
    borderTopLeftRadius:  28,
    borderTopRightRadius: 28,
    paddingHorizontal:    16,
    paddingTop:           16,
    paddingBottom:        36,
  },
  infoCard: {
    backgroundColor: C.white,
    borderRadius:    20,
    padding:         14,
    marginBottom:    12,
    ...SHADOW,
  },
  conductorRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: {
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: C.yellow,
    alignItems:      'center',
    justifyContent:  'center',
    marginRight:     10,
  },
  avatarTxt:         { color: C.black, fontSize: 18, fontWeight: '800' },
  conductorInfo:     { flex: 1 },
  conductorNombre:   { color: C.black, fontSize: 15, fontWeight: '700', marginBottom: 2 },
  conductorVehiculo: { color: C.gray, fontSize: 12 },
  infoRight:         { alignItems: 'flex-end' },
  precioVal:         { color: C.black, fontSize: 18, fontWeight: '800' },
  precioLbl:         { color: C.gray, fontSize: 10 },
  destRow: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingTop:     10,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  destDot: {
    width:           8,
    height:          8,
    borderRadius:    4,
    backgroundColor: C.black,
    marginRight:     10,
  },
  destTxt: { flex: 1, color: C.black, fontSize: 13, fontWeight: '500' },

  btnCompartir: {
    backgroundColor: C.yellow,
    borderRadius:    18,
    paddingVertical: 16,
    alignItems:      'center',
    marginBottom:    10,
  },
  btnCompartirTxt: { color: C.black, fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },

  btnChat: {
    borderRadius:    18,
    paddingVertical: 16,
    alignItems:      'center',
    borderWidth:     1.5,
    borderColor:     C.yellow,
  },
  btnChatTxt: { color: C.yellow, fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
});

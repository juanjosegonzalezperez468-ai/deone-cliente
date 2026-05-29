import React, { useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Share, Alert, Linking, Image,
} from 'react-native';
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
  } = params;

  const inicial = conductorNombre.charAt(0).toUpperCase();

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

  return (
    <View style={s.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* Badge EN VIAJE flotante */}
      <View style={s.statusBadge}>
        <View style={s.statusDot} />
        <Text style={s.statusTxt}>EN VIAJE</Text>
      </View>

      {/* Botón SOS flotante */}
      <TouchableOpacity style={s.sosBtn} onPress={handleSOS} activeOpacity={0.8}>
        <Text style={s.sosTxt}>SOS</Text>
      </TouchableOpacity>

      {/* Mapa */}
      <View style={s.mapArea}>
        <View style={s.mH1} /><View style={s.mH2} />
        <View style={s.mV1} /><View style={s.mV2} />
        <View style={s.street1} /><View style={s.street2} />

        <View style={s.routeLineDone} />
        <View style={s.routeLineAhead} />

        <View style={s.carPin}>
          <View style={s.carCircle}>
            <Text style={s.carEmoji}>🏍️</Text>
          </View>
        </View>

        <View style={s.destPin}>
          <View style={s.destCircle}>
            <Text style={s.destEmoji}>📍</Text>
          </View>
        </View>

        <View style={s.destBadge}>
          <Text style={s.destBadgeTxt} numberOfLines={1}>{destDir}</Text>
        </View>
      </View>

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

      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

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

  /* Mapa */
  mapArea: {
    flex:            1,
    backgroundColor: '#E4EDE4',
    position:        'relative',
    alignItems:      'center',
    justifyContent:  'center',
  },
  mH1:     { position: 'absolute', left: 0, right: 0, top: '33%', height: 1, backgroundColor: '#D2DDD2' },
  mH2:     { position: 'absolute', left: 0, right: 0, top: '66%', height: 1, backgroundColor: '#D2DDD2' },
  mV1:     { position: 'absolute', top: 0, bottom: 0, left: '33%', width: 1, backgroundColor: '#D2DDD2' },
  mV2:     { position: 'absolute', top: 0, bottom: 0, left: '66%', width: 1, backgroundColor: '#D2DDD2' },
  street1: { position: 'absolute', top: '45%', left: 0, right: 0, height: 8, backgroundColor: '#C8D5C8', opacity: 0.7 },
  street2: { position: 'absolute', top: 0, bottom: 0, left: '42%', width: 8, backgroundColor: '#C8D5C8', opacity: 0.7 },

  routeLineDone: {
    position:        'absolute',
    width:           3,
    height:          60,
    backgroundColor: '#22C55E',
    top:             '30%',
    left:            '43%',
    borderRadius:    2,
  },
  routeLineAhead: {
    position:        'absolute',
    width:           3,
    height:          80,
    backgroundColor: C.yellow,
    top:             '48%',
    left:            '43%',
    borderRadius:    2,
    opacity:         0.7,
  },
  carPin: { position: 'absolute', top: '26%', left: '40%' },
  carCircle: {
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
  carEmoji:   { fontSize: 22 },
  destPin:    { position: 'absolute', top: '64%', left: '40%' },
  destCircle: {
    width:           38,
    height:          38,
    borderRadius:    19,
    backgroundColor: C.black,
    alignItems:      'center',
    justifyContent:  'center',
  },
  destEmoji: { fontSize: 18 },
  destBadge: {
    position:          'absolute',
    bottom:            12,
    left:              12,
    right:             12,
    backgroundColor:   'rgba(255,255,255,0.9)',
    borderRadius:      12,
    paddingHorizontal: 12,
    paddingVertical:   6,
  },
  destBadgeTxt: { color: C.black, fontSize: 12, fontWeight: '500', textAlign: 'center' },

  /* Bottom sheet */
  bottomSheet: {
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
  },
  btnCompartirTxt: { color: C.black, fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
});

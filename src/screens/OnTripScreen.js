import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, Image,
} from 'react-native';

const C = {
  white: '#FFFFFF',
  black: '#111111',
  yellow: '#F4C400',
  grayLight: '#888888',
  grayBorder: '#EEEEEE',
  grayBg: '#F5F5F5',
  red: '#FF3B30',
};

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
};

export default function OnTripScreen({ params, navigate, goBack }) {
  const { offer = {} } = params;
  const {
    conductorNombre   = 'Carlos Pérez',
    conductorVehiculo = 'Honda CB 125',
    precioAceptado    = params.precioPropuesto || 8000,
    llegadaMinutos    = 12,
    distanciaKm       = 3.4,
  } = offer;

  const inicial = conductorNombre.charAt(0).toUpperCase();

  return (
    <View style={s.root}>
      <StatusBar backgroundColor={C.white} barStyle="dark-content" />

      {/* Header */}
      <View style={s.header}>
        <Image source={require('../../assets/logo.png')} style={s.logo} resizeMode="contain" />
        <View style={s.statusBadge}>
          <Text style={s.statusBadgeTxt}>EN VIAJE</Text>
        </View>
      </View>

      {/* Mapa con ruta */}
      <View style={s.mapArea}>
        <View style={s.routeVisual}>
          <View style={s.mapDotYellow} />
          <View style={s.mapBlackLine} />
          <View style={s.mapDotBlack} />
        </View>
        <Text style={s.mapLabel}>Ruta activa</Text>
      </View>

      {/* Card conductor compacta */}
      <View style={[s.driverCompact, SHADOW]}>
        <View style={s.avatarSmall}>
          <Text style={s.avatarText}>{inicial}</Text>
        </View>
        <View style={s.driverInfo}>
          <Text style={s.driverName}>{conductorNombre}</Text>
          <Text style={s.driverVehicle}>{conductorVehiculo}</Text>
        </View>
        <TouchableOpacity style={s.actionBtn} activeOpacity={0.7}>
          <Text style={s.actionIcon}>📞</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.actionBtn, s.actionBtnGap]} activeOpacity={0.7}>
          <Text style={s.actionIcon}>💬</Text>
        </TouchableOpacity>
      </View>

      {/* Info del viaje */}
      <View style={[s.infoCard, SHADOW]}>
        <View style={s.infoItem}>
          <Text style={s.infoValue}>{llegadaMinutos} min</Text>
          <Text style={s.infoLabel}>Llegada estimada</Text>
        </View>
        <View style={s.infoSep} />
        <View style={s.infoItem}>
          <Text style={s.infoValue}>{distanciaKm} km</Text>
          <Text style={s.infoLabel}>Distancia restante</Text>
        </View>
        <View style={s.infoSep} />
        <View style={s.infoItem}>
          <Text style={s.infoValue}>${(precioAceptado / 1000).toFixed(1)}K</Text>
          <Text style={s.infoLabel}>Costo</Text>
        </View>
      </View>

      {/* Botones */}
      <View style={s.bottomActions}>
        <TouchableOpacity
          style={s.shareBtn}
          onPress={() => navigate('Finished', params)}
          activeOpacity={0.85}
        >
          <Text style={s.shareBtnTxt}>COMPARTIR VIAJE</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.cancelBtn} onPress={goBack} activeOpacity={0.85}>
          <Text style={s.cancelBtnTxt}>CANCELAR SERVICIO</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.white },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 12,
  },
  logo: { height: 32, width: 120 },
  statusBadge:    { backgroundColor: C.black, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 },
  statusBadgeTxt: { color: C.white, fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  mapArea: { flex: 1, backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center' },
  routeVisual:  { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  mapDotYellow: { width: 14, height: 14, borderRadius: 7, backgroundColor: C.yellow },
  mapBlackLine: { width: 80, height: 4, backgroundColor: C.black, marginHorizontal: 8, borderRadius: 2 },
  mapDotBlack:  { width: 14, height: 14, borderRadius: 7, backgroundColor: C.black },
  mapLabel:     { color: C.grayLight, fontSize: 13 },

  driverCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: C.grayBorder,
    marginVertical: 14,
  },
  avatarSmall:  { width: 40, height: 40, borderRadius: 20, backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText:   { color: C.black, fontSize: 18, fontWeight: '800' },
  driverInfo:   { flex: 1 },
  driverName:   { color: C.black, fontSize: 15, fontWeight: '700' },
  driverVehicle:{ color: C.grayLight, fontSize: 12 },
  actionBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: C.grayBg, alignItems: 'center', justifyContent: 'center' },
  actionBtnGap:  { marginLeft: 8 },
  actionIcon:    { fontSize: 18 },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: C.grayBorder,
    marginBottom: 16,
  },
  infoItem:  { flex: 1, alignItems: 'center' },
  infoValue: { color: C.black, fontSize: 18, fontWeight: '700', marginBottom: 2 },
  infoLabel: { color: C.grayLight, fontSize: 11 },
  infoSep:   { width: 1, height: 40, backgroundColor: C.grayBorder },

  bottomActions: { paddingHorizontal: 20, paddingBottom: 36 },
  shareBtn:      { backgroundColor: C.yellow, borderRadius: 18, paddingVertical: 18, alignItems: 'center', marginBottom: 12 },
  shareBtnTxt:   { color: C.black, fontSize: 17, fontWeight: '700', letterSpacing: 1 },
  cancelBtn:     { borderRadius: 18, paddingVertical: 18, alignItems: 'center', borderWidth: 1.5, borderColor: C.red },
  cancelBtnTxt:  { color: C.red, fontSize: 17, fontWeight: '600', letterSpacing: 1 },
});

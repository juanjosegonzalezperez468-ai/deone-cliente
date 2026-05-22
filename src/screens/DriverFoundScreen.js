import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, ScrollView, Image,
} from 'react-native';

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

export default function DriverFoundScreen({ params, navigate, goBack }) {
  const { offer = {} } = params;
  const {
    conductorNombre  = 'Carlos Pérez',
    conductorVehiculo = 'Honda CB 125',
    conductorPlaca   = 'ABC-123',
    conductorRating  = 4.8,
    llegadaMinutos   = 3,
    distanciaKm      = 1.2,
    precioAceptado   = params.precioPropuesto || 8000,
  } = offer;

  const inicial = conductorNombre.charAt(0).toUpperCase();

  return (
    <View style={s.root}>
      <StatusBar backgroundColor={C.white} barStyle="dark-content" />

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerSpacer} />
        <Image source={require('../../assets/logo.png')} style={s.logo} resizeMode="contain" />
        <View style={s.headerSpacer} />
      </View>

      {/* Mapa placeholder con ruta */}
      <View style={s.mapArea}>
        <View style={s.routeVisual}>
          <View style={s.mapDotYellow} />
          <View style={s.mapDashedLine} />
          <View style={s.mapDotBlack} />
        </View>
        <Text style={s.mapLabel}>Conductor en camino</Text>
      </View>

      {/* Bottom sheet */}
      <ScrollView
        style={s.sheet}
        contentContainerStyle={s.sheetContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Card conductor */}
        <View style={[s.driverCard, SHADOW]}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{inicial}</Text>
          </View>
          <View style={s.driverInfo}>
            <Text style={s.driverName}>{conductorNombre}</Text>
            <Text style={s.driverVehicle}>{conductorVehiculo}</Text>
            <View style={s.ratingRow}>
              <Text style={s.star}>★</Text>
              <Text style={s.ratingTxt}>{conductorRating}</Text>
            </View>
          </View>
          <View style={s.plateBadge}>
            <Text style={s.plateText}>{conductorPlaca}</Text>
          </View>
        </View>

        {/* Pills de info */}
        <View style={s.pillsRow}>
          <View style={[s.pill, SHADOW]}>
            <Text style={s.pillValue}>{llegadaMinutos} min</Text>
            <Text style={s.pillLabel}>Llegada</Text>
          </View>
          <View style={[s.pill, SHADOW]}>
            <Text style={s.pillValue}>{distanciaKm} km</Text>
            <Text style={s.pillLabel}>Distancia</Text>
          </View>
          <View style={[s.pill, SHADOW]}>
            <Text style={s.pillValue}>{conductorPlaca}</Text>
            <Text style={s.pillLabel}>Placa</Text>
          </View>
        </View>

        {/* Precio aceptado */}
        <View style={[s.priceCard, SHADOW]}>
          <View>
            <Text style={s.priceLabel}>Total del viaje</Text>
            <Text style={s.priceValue}>${Number(precioAceptado).toLocaleString('es-CO')} COP</Text>
          </View>
          <View style={s.priceBadge}>
            <Text style={s.priceBadgeTxt}>ACEPTADA</Text>
          </View>
        </View>

        {/* Botones */}
        <TouchableOpacity
          style={s.btnPrimary}
          onPress={() => navigate('OnTrip', { ...params, offer: { ...offer, conductorNombre, conductorVehiculo, conductorPlaca, conductorRating, precioAceptado } })}
          activeOpacity={0.85}
        >
          <Text style={s.btnPrimaryTxt}>EN CAMINO</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.btnOutline} onPress={goBack} activeOpacity={0.85}>
          <Text style={s.btnOutlineTxt}>CANCELAR SERVICIO</Text>
        </TouchableOpacity>
      </ScrollView>
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
  headerSpacer: { width: 40 },
  logo: { height: 32, width: 120 },

  mapArea: {
    height: 190,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeVisual:   { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  mapDotYellow:  { width: 14, height: 14, borderRadius: 7, backgroundColor: C.yellow },
  mapDashedLine: { width: 80, height: 3, backgroundColor: C.yellow, marginHorizontal: 8, opacity: 0.6, borderRadius: 2 },
  mapDotBlack:   { width: 14, height: 14, borderRadius: 7, backgroundColor: C.black },
  mapLabel:      { color: C.grayLight, fontSize: 13 },

  sheet:        { flex: 1 },
  sheetContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },

  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.grayBorder,
  },
  avatar:      { width: 52, height: 52, borderRadius: 26, backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarText:  { color: C.black, fontSize: 22, fontWeight: '800' },
  driverInfo:  { flex: 1 },
  driverName:  { color: C.black, fontSize: 17, fontWeight: '700', marginBottom: 2 },
  driverVehicle: { color: C.grayLight, fontSize: 13, marginBottom: 4 },
  ratingRow:   { flexDirection: 'row', alignItems: 'center' },
  star:        { color: C.yellow, fontSize: 14, marginRight: 3 },
  ratingTxt:   { color: C.black, fontSize: 14, fontWeight: '600' },
  plateBadge:  { backgroundColor: C.grayBg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  plateText:   { color: C.black, fontSize: 13, fontWeight: '700', letterSpacing: 1 },

  pillsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  pill: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: C.grayBorder,
  },
  pillValue: { color: C.black, fontSize: 16, fontWeight: '700', marginBottom: 2 },
  pillLabel: { color: C.grayLight, fontSize: 11 },

  priceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.grayBorder,
  },
  priceLabel:    { color: C.grayLight, fontSize: 12, marginBottom: 4 },
  priceValue:    { color: C.black, fontSize: 24, fontWeight: '800' },
  priceBadge:    { backgroundColor: C.yellow, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  priceBadgeTxt: { color: C.black, fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  btnPrimary:    { backgroundColor: C.yellow, borderRadius: 18, paddingVertical: 18, alignItems: 'center', marginBottom: 12 },
  btnPrimaryTxt: { color: C.black, fontSize: 17, fontWeight: '700', letterSpacing: 1 },
  btnOutline:    { borderRadius: 18, paddingVertical: 18, alignItems: 'center', borderWidth: 1.5, borderColor: C.grayBorder },
  btnOutlineTxt: { color: C.grayLight, fontSize: 17, fontWeight: '600', letterSpacing: 1 },
});

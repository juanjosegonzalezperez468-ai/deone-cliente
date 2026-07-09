import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, TextInput, Alert, ActivityIndicator, Image, BackHandler,
} from 'react-native';
import { SERVICES } from '../constants/services';
import { servicesApi } from '../api/client';
import { getUserUuid } from '../utils/tokenStorage';

const C = {
  white: '#FFFFFF',
  black: '#111111',
  yellow: '#F4C400',
  yellowLight: '#FFF8DC',
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

const fmtCOP = (n) =>
  Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export default function RequestScreen({ params, navigate, goBack }) {
  const { serviceId, origin, dest, fareInfo } = params;
  const service    = SERVICES.find((srv) => srv.id === serviceId);
  const negotiable = fareInfo === null;

  const [price, setPrice]     = useState('');
  const [loading, setLoading] = useState(false);

  const ready = negotiable
    ? price.length > 0 && parseInt(price, 10) > 0
    : true;

  // Botón físico/gesto "atrás" de Android: mismo efecto que la flecha del header
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });
    return () => sub.remove();
  }, []);

  if (!origin || !dest) return null;

  const handleBuscar = async () => {
    if (!ready || loading) return;
    setLoading(true);
    try {
      const precioPropuesto = negotiable ? parseInt(price, 10) : fareInfo.adjusted;
      const clienteId = await getUserUuid();
      if (!clienteId) {
        Alert.alert('Error', 'Debes iniciar sesión para solicitar un servicio.');
        setLoading(false);
        return;
      }
      const body = {
        cliente_id:        clienteId,
        tipo_servicio:     serviceId,
        precio_propuesto:  precioPropuesto,
        origen_lat:        origin.lat,
        origen_lng:        origin.lng,
        origen_direccion:  origin.text,
        destino_lat:       dest.lat,
        destino_lng:       dest.lng,
        destino_direccion: dest.text,
      };

      const { data } = await servicesApi.crear(body);
      navigate('Waiting', {
        serviceId,
        serviceDbId:    data.solicitud.id,
        precioPropuesto,
        origenDir:      origin.text,
        destDir:        dest.text,
        origenLat:      origin.lat,
        origenLng:      origin.lng,
        destLat:        dest.lat,
        destLng:        dest.lng,
      });
    } catch (err) {
      console.error('[RequestScreen] crear error:', JSON.stringify({
        status: err.response?.status,
        data:   err.response?.data,
        code:   err.code,
        msg:    err.message,
        url:    err.config?.url,
      }));
      let msg;
      let titulo = 'Error de red';
      if (err.code === 'ECONNABORTED') {
        msg = 'El servidor tardó demasiado en responder. Intenta de nuevo.';
      } else if (!err.response) {
        msg = `No se pudo conectar al servidor (${err.message}). Verifica tu conexión o intenta más tarde.`;
      } else {
        if (err.response.status === 403) titulo = 'Servicio no habilitado';
        msg = err.response?.data?.detail
          || err.response?.data?.message
          || `Error ${err.response.status}: ${err.message}`;
      }
      Alert.alert(titulo, typeof msg === 'string' ? msg : 'No se pudo crear la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <StatusBar backgroundColor={C.white} barStyle="dark-content" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={goBack} style={s.backBtn} activeOpacity={0.7}>
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <Image source={require('../../assets/logo.png')} style={s.logo} resizeMode="contain" />
        <View style={s.backBtn} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Card servicio activo */}
        <View style={[s.serviceCard, SHADOW]}>
          <View style={s.serviceIconWrap}>
            <Text style={s.serviceIcon}>{service ? service.icon : '🚗'}</Text>
          </View>
          <View style={s.serviceInfo}>
            <Text style={s.serviceLabel}>{service ? service.label : serviceId}</Text>
            <Text style={s.serviceDesc}>{service ? service.description : ''}</Text>
          </View>
          <View style={s.activeBadge}>
            <Text style={s.activeBadgeTxt}>ACTIVO</Text>
          </View>
        </View>

        {/* Ruta */}
        <Text style={s.section}>TU RUTA</Text>
        <View style={[s.routeCard, SHADOW]}>
          <View style={s.routeRow}>
            <View style={s.dotYellow} />
            <View style={s.routeTexts}>
              <Text style={s.routeLabel}>Origen</Text>
              <Text style={s.routeValue} numberOfLines={2}>{origin.text}</Text>
            </View>
          </View>
          <View style={s.routeDivider} />
          <View style={s.routeRow}>
            <View style={s.dotBlack} />
            <View style={s.routeTexts}>
              <Text style={s.routeLabel}>Destino</Text>
              <Text style={s.routeValue} numberOfLines={2}>{dest.text}</Text>
            </View>
          </View>
        </View>

        {/* Precio — tarifa estimada para servicios con tarifa */}
        {negotiable ? (
          <>
            <Text style={s.section}>PROPÓN TU PRECIO</Text>
            <View style={[s.priceCard, SHADOW]}>
              <Text style={s.currency}>$</Text>
              <TextInput
                style={s.priceInput}
                placeholder="0"
                placeholderTextColor={C.grayBorder}
                value={price}
                onChangeText={(v) => setPrice(v.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                maxLength={7}
              />
              <Text style={s.cop}>COP</Text>
            </View>
            <Text style={s.priceHint}>
              El conductor puede aceptar, rechazar o contraofertar tu precio.
            </Text>
          </>
        ) : (
          <>
            <Text style={s.section}>TARIFA ESTIMADA</Text>
            <View style={[s.priceCard, SHADOW]}>
              <Text style={s.currency}>$</Text>
              <Text style={s.priceStatic}>{fmtCOP(fareInfo.adjusted)}</Text>
              <Text style={s.cop}>COP</Text>
            </View>
            <View style={s.breakdownRow}>
              <View style={s.breakdownChip}>
                <Text style={s.breakdownTxt}>{fareInfo.km.toFixed(1)} km</Text>
              </View>
              <View style={s.breakdownDot} />
              <View style={s.breakdownChip}>
                <Text style={s.breakdownTxt}>{fareInfo.minutes} min</Text>
              </View>
              <View style={s.breakdownDot} />
              <View style={s.breakdownChip}>
                <Text style={s.breakdownTxt}>base ${fmtCOP(fareInfo.base)}</Text>
              </View>
            </View>
            <Text style={s.priceHint}>
              El conductor puede aceptar, rechazar o contraofertar esta tarifa.
            </Text>
          </>
        )}

        {/* Botón */}
        <TouchableOpacity
          style={loading || !ready ? s.btnOff : s.btnOn}
          onPress={handleBuscar}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color={C.black} size="small" />
            : <Text style={loading || !ready ? s.btnTxtOff : s.btnTxtOn}>BUSCAR CONDUCTOR</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.white },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 48, paddingTop: 16 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
    backgroundColor: C.white,
  },
  backBtn:   { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { color: C.black, fontSize: 24, fontWeight: '700' },
  logo:      { height: 32, width: 120 },

  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 28,
    borderWidth: 1.5,
    borderColor: C.yellow,
  },
  serviceIconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  serviceIcon:  { fontSize: 26 },
  serviceInfo:  { flex: 1 },
  serviceLabel: { color: C.black, fontSize: 18, fontWeight: '700' },
  serviceDesc:  { color: C.grayLight, fontSize: 12, marginTop: 2 },
  activeBadge:    { backgroundColor: C.yellow, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  activeBadgeTxt: { color: C.black, fontSize: 10, fontWeight: '700', letterSpacing: 1 },

  section: { color: C.grayLight, fontSize: 12, fontWeight: '700', letterSpacing: 2, marginBottom: 12 },

  routeCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: C.grayBorder,
  },
  routeRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  dotYellow:    { width: 10, height: 10, borderRadius: 5, backgroundColor: C.yellow, marginRight: 14 },
  dotBlack:     { width: 10, height: 10, borderRadius: 5, backgroundColor: C.black, marginRight: 14 },
  routeTexts:   { flex: 1 },
  routeLabel:   { color: C.grayLight, fontSize: 11, marginBottom: 2 },
  routeValue:   { color: C.black, fontSize: 15, fontWeight: '500' },
  routeDivider: { height: 1, backgroundColor: C.grayBorder, marginLeft: 24 },

  priceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: C.grayBorder,
  },
  currency:    { color: C.yellow, fontSize: 28, fontWeight: '700', marginRight: 8 },
  priceInput:  { flex: 1, color: C.black, fontSize: 36, fontWeight: '700' },
  priceStatic: { flex: 1, color: C.black, fontSize: 36, fontWeight: '700' },
  cop:         { color: C.grayLight, fontSize: 14, fontWeight: '600', alignSelf: 'flex-end', marginBottom: 4 },
  priceHint:   { color: C.grayLight, fontSize: 12, marginBottom: 28, lineHeight: 18 },

  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 6,
  },
  breakdownChip: {
    backgroundColor: C.yellowLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  breakdownTxt: { color: C.black, fontSize: 12, fontWeight: '600' },
  breakdownDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.grayBorder },

  btnOn:     { backgroundColor: C.yellow, borderRadius: 18, paddingVertical: 18, alignItems: 'center' },
  btnOff:    { backgroundColor: C.grayBg, borderRadius: 18, paddingVertical: 18, alignItems: 'center' },
  btnTxtOn:  { color: C.black,     fontSize: 17, fontWeight: '700', letterSpacing: 1 },
  btnTxtOff: { color: C.grayLight, fontSize: 17, fontWeight: '700', letterSpacing: 1 },
});

import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, ActivityIndicator, Image, Alert, BackHandler,
} from 'react-native';
import { offersApi, servicesApi } from '../api/client';

const C = {
  bg:     '#F8F8F8',
  white:  '#FFFFFF',
  black:  '#111111',
  yellow: '#FFC400',
  gray:   '#757575',
  border: '#EEEEEE',
  green:  '#22C55E',
  greenBg:'#F0FDF4',
  red:    '#FF3B30',
};

const SHADOW = {
  shadowColor:   '#000',
  shadowOffset:  { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius:  8,
  elevation:     4,
};

export default function OfertasScreen({ params, navigate, goBack }) {
  const {
    ofertas         = [],
    precioPropuesto = 0,
    serviceDbId     = '',
    serviceId       = '',
    origenDir       = '',
    destDir         = '',
    origenLat       = 0,
    origenLng       = 0,
    destLat         = 0,
    destLng         = 0,
  } = params;

  const [ofertasList, setOfertasList] = useState(ofertas);
  const [loadingId, setLoadingId] = useState(null);
  const [rechazandoId, setRechazandoId] = useState(null);
  const [cancelando, setCancelando] = useState(false);

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

  // Botón físico/gesto "atrás" de Android: mismo efecto que la flecha del header (no cancela)
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!serviceDbId) return;
    let terminado = false;
    const interval = setInterval(async () => {
      if (terminado) return;
      try {
        // Sin filtrar por length: las ofertas expiran a los 2 min en el
        // backend y la lista debe vaciarse cuando ya no queda ninguna.
        const { data } = await offersApi.porSolicitud(serviceDbId);
        if (Array.isArray(data.ofertas)) setOfertasList(data.ofertas);
      } catch {}
      try {
        const { data: servicio } = await servicesApi.obtener(serviceDbId);
        if (servicio?.estado === 'cancelado') {
          terminado = true;
          clearInterval(interval);
          Alert.alert(
            'Solicitud cancelada',
            'El conductor canceló la solicitud.',
            [{ text: 'Aceptar', onPress: goBack }]
          );
          return;
        }
        if (servicio?.estado === 'expirado') {
          terminado = true;
          clearInterval(interval);
          Alert.alert(
            'Solicitud expirada',
            'No se encontró conductor a tiempo. Intenta de nuevo.',
            [{ text: 'Aceptar', onPress: goBack }]
          );
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [serviceDbId]);

  const handleAceptar = async (oferta) => {
    if (loadingId) return;
    setLoadingId(oferta.id);
    try {
      await offersApi.responder(oferta.id, 'aceptar');
      navigate('ConductorEnCamino', {
        serviceDbId,
        precioPropuesto,
        origenDir,
        destDir,
        origenLat,
        origenLng,
        destLat,
        destLng,
        ofertaId:          oferta.id,
        conductorId:       oferta.conductor_id                  || '',
        conductorNombre:   oferta.users?.nombre                 || 'Conductor',
        conductorRating:   oferta.users?.rating                 || 4.8,
        conductorVehiculo: oferta.vehiculo?.tipo_servicio        || 'Moto',
        conductorPlaca:    oferta.vehiculo?.placa                || '—',
        precioAceptado:    oferta.precio_ofrecido                || precioPropuesto,
      });
    } catch (e) {
      setLoadingId(null);
      const detail = e?.response?.data?.detail;
      Alert.alert(
        'No se pudo aceptar',
        e?.friendlyMessage
          || (typeof detail === 'string' ? detail : 'La oferta ya no está disponible. Intenta con otra.'),
      );
      // Refrescar la lista de inmediato para retirar la oferta vencida
      try {
        const { data } = await offersApi.porSolicitud(serviceDbId);
        if (Array.isArray(data.ofertas)) setOfertasList(data.ofertas);
      } catch {}
    }
  };

  const handleRechazar = async (oferta) => {
    if (loadingId || rechazandoId) return;
    setRechazandoId(oferta.id);
    try {
      await offersApi.responder(oferta.id, 'rechazar');
      setOfertasList((prev) => prev.filter((o) => o.id !== oferta.id));
    } catch (e) {
      Alert.alert(
        'No se pudo rechazar',
        e?.friendlyMessage || 'Intenta de nuevo en unos segundos.',
      );
    } finally {
      setRechazandoId(null);
    }
  };

  return (
    <View style={s.root}>
      <StatusBar backgroundColor={C.bg} barStyle="dark-content" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={goBack} activeOpacity={0.7}>
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <Image source={require('../../assets/logo.png')} style={s.logo} resizeMode="contain" />
        <View style={s.backBtn} />
      </View>

      {/* Títulos */}
      <View style={s.titlesWrap}>
        <Text style={s.title}>Conductores disponibles</Text>
        <Text style={s.subtitle}>
          {ofertasList.length} conductor{ofertasList.length !== 1 ? 'es' : ''} respondieron
        </Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {ofertasList.map((oferta) => {
          const nombre    = oferta.users?.nombre                || 'Conductor';
          const rating    = oferta.users?.rating                || 4.8;
          const vehiculo  = oferta.vehiculo?.tipo_servicio      || 'Moto';
          const precio    = oferta.precio_ofrecido              || precioPropuesto;
          const esExacto  = precio <= precioPropuesto;
          const inicial   = nombre.charAt(0).toUpperCase();
          const isLoading = loadingId === oferta.id;

          return (
            <View key={oferta.id} style={s.card}>
              {/* Info conductor */}
              <View style={s.cardTop}>
                <View style={s.avatar}>
                  <Text style={s.avatarTxt}>{inicial}</Text>
                </View>
                <View style={s.conductorInfo}>
                  <Text style={s.nombre}>{nombre}</Text>
                  <View style={s.ratingRow}>
                    <Text style={s.star}>★</Text>
                    <Text style={s.ratingTxt}>{Number(rating).toFixed(1)}</Text>
                    <Text style={s.sep}> · </Text>
                    <Text style={s.vehiculoTxt}>{vehiculo}</Text>
                  </View>
                </View>
                <View style={s.precioWrap}>
                  <Text style={s.precioVal}>
                    ${Number(precio).toLocaleString('es-CO')}
                  </Text>
                  <View style={esExacto ? s.badgeExacto : s.badgeContra}>
                    <Text style={esExacto ? s.badgeExactoTxt : s.badgeContraTxt}>
                      {esExacto ? 'PRECIO EXACTO' : 'CONTRAOFERTA'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Botones aceptar / rechazar */}
              <View style={s.cardActions}>
                <TouchableOpacity
                  style={[isLoading ? s.btnAceptarDis : s.btnAceptar, s.btnAceptarFlex]}
                  onPress={() => handleAceptar(oferta)}
                  activeOpacity={0.85}
                  disabled={!!loadingId || rechazandoId === oferta.id}
                >
                  {isLoading
                    ? <ActivityIndicator color={C.black} size="small" />
                    : <Text style={s.btnAceptarTxt}>ACEPTAR</Text>
                  }
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.btnRechazar}
                  onPress={() => handleRechazar(oferta)}
                  activeOpacity={0.7}
                  disabled={!!loadingId || rechazandoId === oferta.id}
                >
                  {rechazandoId === oferta.id
                    ? <ActivityIndicator color={C.red} size="small" />
                    : <Text style={s.btnRechazarTxt}>✕</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {ofertasList.length === 0 && (
          <View style={s.emptyWrap}>
            <Text style={s.emptyIcon}>🏍️</Text>
            <Text style={s.emptyTxt}>Sin ofertas por ahora</Text>
          </View>
        )}

      </ScrollView>

      {/* Cancelar solicitud */}
      <TouchableOpacity
        style={s.cancelWrap}
        onPress={handleCancelar}
        activeOpacity={0.8}
        disabled={cancelando}
      >
        <Text style={s.cancelTxt}>{cancelando ? 'CANCELANDO...' : 'CANCELAR SOLICITUD'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 16 },

  /* Header */
  header: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingHorizontal: 20,
    paddingTop:      52,
    paddingBottom:   12,
    backgroundColor: C.bg,
  },
  backBtn:   { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { color: C.black, fontSize: 24, fontWeight: '700' },
  logo:      { height: 30, width: 100 },

  titlesWrap: { paddingHorizontal: 20, paddingBottom: 14 },
  title:    { color: C.black, fontSize: 24, fontWeight: '800', letterSpacing: -0.3, marginBottom: 2 },
  subtitle: { color: C.gray,  fontSize: 14 },

  /* Offer card */
  card: {
    backgroundColor: C.white,
    borderRadius:    24,
    padding:         16,
    marginBottom:    12,
    ...SHADOW,
  },
  cardTop: {
    flexDirection:  'row',
    alignItems:     'center',
    marginBottom:   14,
  },
  avatar: {
    width:           52,
    height:          52,
    borderRadius:    26,
    backgroundColor: C.yellow,
    alignItems:      'center',
    justifyContent:  'center',
    marginRight:     12,
    flexShrink:      0,
  },
  avatarTxt:     { color: C.black, fontSize: 22, fontWeight: '800' },
  conductorInfo: { flex: 1 },
  nombre:        { color: C.black, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  ratingRow:     { flexDirection: 'row', alignItems: 'center' },
  star:          { color: C.yellow, fontSize: 13, marginRight: 2 },
  ratingTxt:     { color: C.black, fontSize: 13, fontWeight: '600' },
  sep:           { color: C.gray,  fontSize: 13 },
  vehiculoTxt:   { color: C.gray,  fontSize: 12 },

  precioWrap: { alignItems: 'flex-end', flexShrink: 0 },
  precioVal:  { color: C.black, fontSize: 22, fontWeight: '800', marginBottom: 4 },

  badgeExacto: {
    backgroundColor: '#DCFCE7',
    borderRadius:    8,
    paddingHorizontal: 8,
    paddingVertical:  3,
  },
  badgeExactoTxt: { color: '#15803D', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },

  badgeContra: {
    backgroundColor: '#FFF8DC',
    borderRadius:    8,
    paddingHorizontal: 8,
    paddingVertical:  3,
    borderWidth:     1,
    borderColor:     C.yellow,
  },
  badgeContraTxt: { color: C.black, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },

  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  btnAceptar: {
    backgroundColor: C.yellow,
    borderRadius:    16,
    paddingVertical: 14,
    alignItems:      'center',
  },
  btnAceptarDis: {
    backgroundColor: C.border,
    borderRadius:    16,
    paddingVertical: 14,
    alignItems:      'center',
  },
  btnAceptarFlex: { flex: 1 },
  btnAceptarTxt:  { color: C.black, fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },

  btnRechazar: {
    width:           48,
    height:          48,
    borderRadius:    16,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1.5,
    borderColor:     C.red,
  },
  btnRechazarTxt: { color: C.red, fontSize: 16, fontWeight: '800' },

  emptyWrap: { paddingVertical: 48, alignItems: 'center' },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyTxt:  { color: C.gray, fontSize: 14 },

  /* Cancelar */
  cancelWrap: {
    paddingVertical:   18,
    paddingHorizontal: 24,
    marginBottom:      32,
    alignItems:        'center',
  },
  cancelTxt: { color: C.gray, fontSize: 14, fontWeight: '600', letterSpacing: 1 },
});

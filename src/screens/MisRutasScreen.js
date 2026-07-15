import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { rutasApi } from '../api/client';

const C = {
  white:      '#FFFFFF',
  black:      '#111111',
  yellow:     '#F4C400',
  grayLight:  '#888888',
  grayBorder: '#EEEEEE',
  grayBg:     '#F5F5F5',
};

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
};

const ESTADOS = {
  publicada:           { label: 'Buscando conductor', color: '#888888', icon: '🔍' },
  aceptada:            { label: 'Conductor asignado', color: '#3B82F6', icon: '🚚' },
  en_recogida:         { label: 'En recogida',        color: '#3B82F6', icon: '🚚' },
  en_reparto:          { label: 'En curso',           color: '#3B82F6', icon: '📦' },
  finalizada:          { label: 'Entregada ✔',        color: '#22C55E', icon: '🏁' },
  cancelada_cliente:   { label: 'Cancelada',          color: '#FF3B30', icon: '✕' },
  cancelada_conductor: { label: 'Cancelada por conductor', color: '#FF3B30', icon: '✕' },
  expirada:            { label: 'Sin conductor',      color: '#888888', icon: '⏰' },
};

const ACTIVAS = ['aceptada', 'en_recogida', 'en_reparto'];

const fmtFecha = (iso, programada) => {
  if (!iso) return '';
  const d = new Date(programada || iso);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export default function MisRutasScreen({ navigate, goBack }) {
  const [rutas, setRutas]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cargar = useCallback(async (esRefresh = false) => {
    if (esRefresh) setRefreshing(true); else setLoading(true);
    try {
      const { data } = await rutasApi.misRutas('cliente');
      setRutas(data.rutas || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const abrir = (r) => {
    if (r.estado === 'publicada') {
      navigate('BuscandoRuta', {
        rutaId:        r.id,
        numeroParadas: r.numero_paradas,
        precio:        r.precio_total,
        tipoVehiculo:  r.tipo_vehiculo,
        programada:    !!r.programada_para,
        recogidaLat:   r.punto_recogida_lat,
        recogidaLng:   r.punto_recogida_lng,
      });
    } else if (ACTIVAS.includes(r.estado)) {
      navigate('RutaEnCurso', { rutaId: r.id });
    } else if (r.estado === 'finalizada') {
      navigate('RutaFinalizada', { rutaId: r.id });
    }
  };

  return (
    <View style={s.root}>
      <StatusBar backgroundColor={C.white} barStyle="dark-content" />

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={goBack} activeOpacity={0.7}>
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Mis rutas</Text>
        <View style={s.headerSpacer} />
      </View>

      {loading ? (
        <View style={s.centerWrap}>
          <ActivityIndicator size="large" color={C.yellow} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => cargar(true)} colors={[C.yellow]} />
          }
        >
          {rutas.length === 0 && (
            <View style={s.emptyWrap}>
              <Text style={s.emptyIcon}>📦</Text>
              <Text style={s.emptyTitle}>Aún no tienes rutas</Text>
              <Text style={s.emptySub}>
                Agrupa varias entregas en un solo recorrido con un conductor por horas.
              </Text>
              <TouchableOpacity style={s.crearBtn} onPress={() => navigate('CrearRuta')} activeOpacity={0.85}>
                <Text style={s.crearBtnTxt}>CREAR MI PRIMERA RUTA</Text>
              </TouchableOpacity>
            </View>
          )}

          {rutas.map((r) => {
            const est = ESTADOS[r.estado] || { label: r.estado, color: '#888888', icon: '📦' };
            const esProgramadaFutura = r.estado === 'publicada' && r.programada_para;
            return (
              <TouchableOpacity key={r.id} style={s.card} onPress={() => abrir(r)} activeOpacity={0.8}>
                <View style={s.cardIconWrap}>
                  <Text style={s.cardIcon}>{est.icon}</Text>
                </View>
                <View style={s.cardInfo}>
                  <Text style={s.cardTitle} numberOfLines={1}>
                    {r.numero_paradas} entrega{r.numero_paradas !== 1 ? 's' : ''} · {r.horas_cotizadas} h
                  </Text>
                  <Text style={s.cardSub} numberOfLines={1}>{r.punto_recogida_direccion}</Text>
                  <Text style={s.cardFecha}>
                    {esProgramadaFutura ? '⏳ Programada: ' : ''}
                    {fmtFecha(r.created_at, r.programada_para)}
                  </Text>
                </View>
                <View style={s.cardRight}>
                  <Text style={s.cardPrecio}>${Number(r.valor_final || r.precio_total).toLocaleString('es-CO')}</Text>
                  <View style={[s.badge, { backgroundColor: est.color + '22' }]}>
                    <Text style={[s.badgeTxt, { color: est.color }]}>{est.label}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {rutas.length > 0 && (
        <TouchableOpacity style={s.fab} onPress={() => navigate('CrearRuta')} activeOpacity={0.85}>
          <Text style={s.fabTxt}>+  NUEVA RUTA</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.white },

  header: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingTop:        52,
    paddingBottom:     12,
    paddingHorizontal: 16,
  },
  backBtn:      { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow:    { color: C.black, fontSize: 24, fontWeight: '700' },
  headerTitle:  { flex: 1, color: C.black, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  headerSpacer: { width: 40 },

  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:    { paddingHorizontal: 20, paddingBottom: 110 },

  emptyWrap:  { alignItems: 'center', paddingTop: 80, paddingHorizontal: 24 },
  emptyIcon:  { fontSize: 52, marginBottom: 16 },
  emptyTitle: { color: C.black, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySub:   { color: C.grayLight, fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  crearBtn: {
    backgroundColor:   C.yellow,
    borderRadius:      16,
    paddingHorizontal: 24,
    paddingVertical:   15,
  },
  crearBtnTxt: { color: C.black, fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },

  card: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: C.white,
    borderRadius:    18,
    borderWidth:     1,
    borderColor:     C.grayBorder,
    padding:         12,
    marginBottom:    10,
    ...SHADOW,
  },
  cardIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FFF8DC',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  cardIcon:  { fontSize: 20 },
  cardInfo:  { flex: 1, marginRight: 8 },
  cardTitle: { color: C.black, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  cardSub:   { color: C.grayLight, fontSize: 12, marginBottom: 2 },
  cardFecha: { color: C.grayLight, fontSize: 11 },
  cardRight: { alignItems: 'flex-end' },
  cardPrecio:{ color: C.black, fontSize: 14, fontWeight: '800', marginBottom: 5 },
  badge:     { borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4 },
  badgeTxt:  { fontSize: 10, fontWeight: '700' },

  fab: {
    position:        'absolute',
    bottom:          32,
    alignSelf:       'center',
    backgroundColor: C.black,
    borderRadius:    22,
    paddingHorizontal: 24,
    paddingVertical: 15,
    ...SHADOW,
  },
  fabTxt: { color: C.yellow, fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
});

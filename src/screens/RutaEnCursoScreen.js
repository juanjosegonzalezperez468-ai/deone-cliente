import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Alert, Linking, Image, Modal, BackHandler,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import ChatScreen from './ChatScreen';
import { rutasApi } from '../api/client';
import { connectTripSocket } from '../utils/socket';

const C = {
  bg:     '#F8F8F8',
  white:  '#FFFFFF',
  black:  '#111111',
  yellow: '#F4C400',
  gray:   '#888888',
  border: '#EEEEEE',
  red:    '#FF3B30',
  green:  '#22C55E',
};

const SHADOW = {
  shadowColor:   '#000',
  shadowOffset:  { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius:  8,
  elevation:     4,
};

const ESTADO_LABEL = {
  aceptada:    'CONDUCTOR ASIGNADO',
  en_recogida: 'RECOGIENDO PEDIDOS',
  en_reparto:  'EN REPARTO',
};

const PARADA_BADGE = {
  pendiente: { txt: 'Pendiente', color: '#888888', bg: '#F5F5F5' },
  entregada: { txt: 'Entregada ✓', color: '#15803D', bg: '#F0FDF4' },
  fallida:   { txt: 'Fallida', color: '#B91C1C', bg: '#FEF2F2' },
  devuelta:  { txt: 'Devuelta', color: '#B45309', bg: '#FFF9E6' },
};

export default function RutaEnCursoScreen({ params, navigate, goBack }) {
  const { rutaId } = params;
  const [ruta, setRuta]               = useState(null);
  const [conductorPos, setConductorPos] = useState(null);
  const [chatVisible, setChatVisible] = useState(false);
  const [cancelando, setCancelando]   = useState(false);
  const mapRef    = useRef(null);
  const socketRef = useRef(null);
  const encuadrado = useRef(false);

  const cargar = async () => {
    try {
      const { data } = await rutasApi.obtener(rutaId);
      setRuta(data);
      if (data?.estado === 'finalizada') {
        navigate('RutaFinalizada', { rutaId });
        return;
      }
      if (data?.estado === 'cancelada_conductor') {
        Alert.alert(
          'Ruta cancelada',
          'El conductor canceló la ruta. Puedes publicarla de nuevo sin costo.',
          [{ text: 'Aceptar', onPress: goBack }],
        );
        return;
      }
      // Encuadrar el mapa a recogida + paradas la primera vez
      if (!encuadrado.current && data?.paradas?.length && mapRef.current) {
        encuadrado.current = true;
        const coords = [
          { latitude: Number(data.punto_recogida_lat), longitude: Number(data.punto_recogida_lng) },
          ...data.paradas.map((p) => ({ latitude: Number(p.lat), longitude: Number(p.lng) })),
        ];
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 120, right: 60, bottom: 340, left: 60 },
          animated: true,
        });
      }
    } catch {}
  };

  // Carga inicial + polling cada 8 s (estado de paradas en vivo)
  useEffect(() => {
    cargar();
    const iv = setInterval(cargar, 8000);
    return () => clearInterval(iv);
  }, [rutaId]);

  // Ubicación del conductor en tiempo real (socket existente)
  useEffect(() => {
    let activo = true;
    connectTripSocket(rutaId, (data) => {
      if (activo) setConductorPos({ latitude: data.lat, longitude: data.lng });
    }).then((sock) => { socketRef.current = sock; });
    return () => {
      activo = false;
      socketRef.current?.disconnect?.();
    };
  }, [rutaId]);

  const handleSOS = () => {
    Alert.alert('¿Necesitas ayuda?', '', [
      { text: 'Llamar 123', onPress: () => Linking.openURL('tel:123').catch(() => {}) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const handleVolver = () => {
    Alert.alert(
      'Volver al inicio',
      'La ruta sigue activa. Puedes verla desde "Mis rutas".',
      [
        { text: 'Quedarme', style: 'cancel' },
        { text: 'Volver al inicio', onPress: goBack },
      ],
    );
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleVolver();
      return true;
    });
    return () => sub.remove();
  }, []);

  const handleCancelar = () => {
    if (cancelando || !ruta) return;
    const pct = ruta.estado === 'aceptada' ? '10%' : '20%';
    Alert.alert(
      'Cancelar ruta',
      `Cancelar ahora tiene un costo del ${pct} del valor de la ruta ` +
      `($${Math.round(ruta.precio_total * (ruta.estado === 'aceptada' ? 0.10 : 0.20)).toLocaleString('es-CO')}), ` +
      'que se descuenta de tu saldo. ¿Seguro?',
      [
        { text: 'No, continuar', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            setCancelando(true);
            try {
              await rutasApi.cancelar(rutaId);
              goBack();
            } catch (e) {
              setCancelando(false);
              Alert.alert('No se pudo cancelar', e?.friendlyMessage || 'Intenta de nuevo en unos segundos.');
            }
          },
        },
      ],
    );
  };

  const verFoto = (p) => {
    if (p.foto_url) Linking.openURL(p.foto_url).catch(() => {});
  };

  const paradas    = ruta?.paradas || [];
  const entregadas = paradas.filter((p) => p.estado === 'entregada').length;
  const cerradas   = paradas.filter((p) => p.estado !== 'pendiente').length;
  const conductor  = ruta?.conductor_info || {};
  const inicial    = (conductor.nombre || 'C').charAt(0).toUpperCase();

  return (
    <View style={s.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude:       ruta ? Number(ruta.punto_recogida_lat) : 5.0703,
          longitude:      ruta ? Number(ruta.punto_recogida_lng) : -75.5138,
          latitudeDelta:  0.05,
          longitudeDelta: 0.05,
        }}
      >
        {ruta && (
          <Marker
            coordinate={{
              latitude:  Number(ruta.punto_recogida_lat),
              longitude: Number(ruta.punto_recogida_lng),
            }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={s.recogidaMarker}>
              <Text style={s.markerEmoji}>🏪</Text>
            </View>
          </Marker>
        )}

        {paradas.map((p) => {
          const cerrada = p.estado !== 'pendiente';
          return (
            <Marker
              key={`${p.id}-${p.estado}`}
              coordinate={{ latitude: Number(p.lat), longitude: Number(p.lng) }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              <View style={cerrada ? s.paradaMarkerDone : s.paradaMarker}>
                <Text style={cerrada ? s.paradaMarkerDoneTxt : s.paradaMarkerTxt}>
                  {p.estado === 'entregada' ? '✓' : p.orden}
                </Text>
              </View>
            </Marker>
          );
        })}

        {conductorPos && (
          <Marker coordinate={conductorPos} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={s.conductorMarker}>
              <Text style={s.markerEmoji}>🚚</Text>
            </View>
          </Marker>
        )}
      </MapView>

      {/* Header flotante */}
      <View style={s.topRow}>
        <TouchableOpacity style={s.backBtn} onPress={handleVolver} activeOpacity={0.8}>
          <Text style={s.backArrowTxt}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.sosBtn} onPress={handleSOS} activeOpacity={0.8}>
          <Text style={s.sosTxt}>SOS</Text>
        </TouchableOpacity>
      </View>

      <View style={s.statusBadge}>
        <View style={s.statusDot} />
        <Text style={s.statusTxt}>{ESTADO_LABEL[ruta?.estado] || 'RUTA ACTIVA'}</Text>
      </View>

      {/* Bottom sheet */}
      <View style={s.bottomSheet}>
        <View style={s.infoCard}>
          <View style={s.conductorRow}>
            {conductor.foto_url ? (
              <Image source={{ uri: conductor.foto_url }} style={s.avatarFoto} />
            ) : (
              <View style={s.avatar}>
                <Text style={s.avatarTxt}>{inicial}</Text>
              </View>
            )}
            <View style={s.conductorInfo}>
              <Text style={s.conductorNombre}>{conductor.nombre || 'Conductor'}</Text>
              <Text style={s.conductorSub}>
                ★ {conductor.rating ? Number(conductor.rating).toFixed(1) : '—'}
                {ruta?.tipo_vehiculo ? `  ·  ${ruta.tipo_vehiculo}` : ''}
              </Text>
            </View>
            <View style={s.infoRight}>
              <Text style={s.precioVal}>
                ${Number(ruta?.precio_total || 0).toLocaleString('es-CO')}
              </Text>
              <Text style={s.precioLbl}>Efectivo al finalizar</Text>
            </View>
          </View>

          <View style={s.progresoRow}>
            <Text style={s.progresoTxt}>
              {entregadas}/{paradas.length} entregadas
              {cerradas - entregadas > 0 ? `  ·  ${cerradas - entregadas} fallida${cerradas - entregadas !== 1 ? 's' : ''}` : ''}
            </Text>
          </View>
        </View>

        {/* Lista de paradas en vivo */}
        <ScrollView style={s.paradasList} showsVerticalScrollIndicator={false} nestedScrollEnabled>
          {paradas.map((p) => {
            const badge = PARADA_BADGE[p.estado] || PARADA_BADGE.pendiente;
            return (
              <View key={p.id} style={s.paradaRow}>
                <View style={s.paradaOrden}>
                  <Text style={s.paradaOrdenTxt}>{p.orden}</Text>
                </View>
                <View style={s.paradaTexts}>
                  <Text style={s.paradaDir} numberOfLines={1}>{p.direccion}</Text>
                  {p.nombre_destinatario ? (
                    <Text style={s.paradaDest} numberOfLines={1}>{p.nombre_destinatario}</Text>
                  ) : null}
                  {p.motivo_fallo ? (
                    <Text style={s.paradaFallo} numberOfLines={1}>Motivo: {p.motivo_fallo}</Text>
                  ) : null}
                </View>
                {p.foto_url ? (
                  <TouchableOpacity onPress={() => verFoto(p)} activeOpacity={0.8} style={s.fotoBtn}>
                    <Text style={s.fotoBtnTxt}>📷</Text>
                  </TouchableOpacity>
                ) : null}
                <View style={[s.paradaBadge, { backgroundColor: badge.bg }]}>
                  <Text style={[s.paradaBadgeTxt, { color: badge.color }]}>{badge.txt}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={s.btnRow}>
          <TouchableOpacity style={s.btnChat} onPress={() => setChatVisible(true)} activeOpacity={0.85}>
            <Text style={s.btnChatTxt}>💬  CHAT</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btnCancelar} onPress={handleCancelar} activeOpacity={0.7} disabled={cancelando}>
            <Text style={s.btnCancelarTxt}>{cancelando ? 'CANCELANDO…' : 'CANCELAR'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={chatVisible} animationType="slide" onRequestClose={() => setChatVisible(false)}>
        <ChatScreen params={{ serviceDbId: rutaId }} onClose={() => setChatVisible(false)} />
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  /* Markers */
  recogidaMarker: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: C.black,
    alignItems: 'center', justifyContent: 'center',
    elevation: 5,
  },
  conductorMarker: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: C.yellow,
    alignItems: 'center', justifyContent: 'center',
    elevation: 5,
  },
  paradaMarker: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: C.white,
    borderWidth: 2, borderColor: C.black,
    alignItems: 'center', justifyContent: 'center',
    elevation: 4,
  },
  paradaMarkerTxt: { color: C.black, fontSize: 13, fontWeight: '800' },
  paradaMarkerDone: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: C.green,
    alignItems: 'center', justifyContent: 'center',
    elevation: 4,
  },
  paradaMarkerDoneTxt: { color: C.white, fontSize: 14, fontWeight: '800' },
  markerEmoji: { fontSize: 20 },

  /* Header flotante */
  topRow: {
    position: 'absolute',
    top: 56, left: 16, right: 16,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.white,
    alignItems: 'center', justifyContent: 'center',
    ...SHADOW,
  },
  backArrowTxt: { color: C.black, fontSize: 20, fontWeight: '700' },
  sosBtn: {
    backgroundColor: C.red,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    ...SHADOW,
  },
  sosTxt: { color: C.white, fontSize: 12, fontWeight: '800', letterSpacing: 1 },

  statusBadge: {
    position: 'absolute',
    top: 104, left: 16,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    ...SHADOW,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.green, marginRight: 7 },
  statusTxt: { color: C.black, fontSize: 12, fontWeight: '700', letterSpacing: 1 },

  /* Bottom sheet */
  bottomSheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: C.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 30,
    maxHeight: 420,
  },
  infoCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    ...SHADOW,
  },
  conductorRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.yellow,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  avatarTxt:  { color: C.black, fontSize: 18, fontWeight: '800' },
  avatarFoto: { width: 44, height: 44, borderRadius: 22, marginRight: 10, backgroundColor: C.border },
  conductorInfo:   { flex: 1 },
  conductorNombre: { color: C.black, fontSize: 15, fontWeight: '700', marginBottom: 2 },
  conductorSub:    { color: C.gray, fontSize: 12 },
  infoRight:  { alignItems: 'flex-end' },
  precioVal:  { color: C.black, fontSize: 17, fontWeight: '800' },
  precioLbl:  { color: C.gray, fontSize: 9 },

  progresoRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  progresoTxt: { color: C.black, fontSize: 13, fontWeight: '700' },

  paradasList: { maxHeight: 170, marginBottom: 10 },
  paradaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 6,
    ...SHADOW,
  },
  paradaOrden: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 8,
  },
  paradaOrdenTxt: { color: C.black, fontSize: 11, fontWeight: '800' },
  paradaTexts: { flex: 1, marginRight: 6 },
  paradaDir:   { color: C.black, fontSize: 12, fontWeight: '600' },
  paradaDest:  { color: C.gray, fontSize: 11, marginTop: 1 },
  paradaFallo: { color: C.red, fontSize: 11, marginTop: 1 },
  fotoBtn:     { padding: 4, marginRight: 4 },
  fotoBtnTxt:  { fontSize: 16 },
  paradaBadge: {
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  paradaBadgeTxt: { fontSize: 10, fontWeight: '700' },

  btnRow: { flexDirection: 'row', gap: 10 },
  btnChat: {
    flex: 2,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.yellow,
    backgroundColor: C.white,
  },
  btnChatTxt: { color: C.black, fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
  btnCancelar: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
  },
  btnCancelarTxt: { color: C.red, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
});

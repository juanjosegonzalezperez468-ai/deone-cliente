import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { rutasApi, ratingsApi } from '../api/client';

const C = {
  white:      '#FFFFFF',
  black:      '#111111',
  yellow:     '#F4C400',
  grayLight:  '#888888',
  grayBorder: '#EEEEEE',
  grayBg:     '#F5F5F5',
  green:      '#22C55E',
  red:        '#FF3B30',
};

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
};

const fmtCOP = (n) => Number(n || 0).toLocaleString('es-CO');

function duracion(inicio, fin) {
  if (!inicio || !fin) return null;
  const min = Math.round((new Date(fin) - new Date(inicio)) / 60000);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}

export default function RutaFinalizadaScreen({ params, goBack }) {
  const { rutaId } = params;
  const [ruta, setRuta]             = useState(null);
  const [estrellas, setEstrellas]   = useState(0);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando]     = useState(false);
  const [calificada, setCalificada] = useState(false);

  useEffect(() => {
    rutasApi.obtener(rutaId)
      .then(({ data }) => setRuta(data))
      .catch(() => {});
  }, [rutaId]);

  const enviarCalificacion = async () => {
    if (!estrellas || enviando) return;
    setEnviando(true);
    try {
      await ratingsApi.enviar({
        ruta_id:      rutaId,
        calificacion: estrellas,
        comentario:   comentario.trim() || null,
      });
      setCalificada(true);
    } catch (e) {
      const detalle = e?.response?.data?.detail;
      if (typeof detalle === 'string' && detalle.includes('Ya calificaste')) {
        setCalificada(true);
      } else {
        Alert.alert('No se pudo calificar', e?.friendlyMessage || 'Intenta de nuevo.');
      }
    }
    setEnviando(false);
  };

  if (!ruta) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator size="large" color={C.yellow} />
      </View>
    );
  }

  const paradas    = ruta.paradas || [];
  const entregadas = paradas.filter((p) => p.estado === 'entregada').length;
  const devueltas  = paradas.filter((p) => p.estado === 'devuelta' || p.estado === 'fallida').length;
  const tiempoReal = duracion(ruta.hora_inicio_real, ruta.hora_fin_real);
  const conductor  = ruta.conductor_info || {};

  return (
    <View style={s.root}>
      <StatusBar backgroundColor={C.white} barStyle="dark-content" />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        <View style={s.checkCircle}>
          <Text style={s.checkIcon}>🏁</Text>
        </View>
        <Text style={s.title}>Ruta finalizada</Text>
        <Text style={s.sub}>
          {entregadas}/{paradas.length} entregas realizadas
          {devueltas > 0 ? ` · ${devueltas} devuelta${devueltas !== 1 ? 's' : ''} al punto de recogida` : ''}
        </Text>

        {/* Resumen */}
        <View style={s.card}>
          <Text style={s.cardTitle}>RESUMEN</Text>
          <View style={s.row}>
            <Text style={s.lbl}>Entregas exitosas</Text>
            <Text style={s.val}>{entregadas} de {paradas.length}</Text>
          </View>
          {tiempoReal && (
            <View style={s.row}>
              <Text style={s.lbl}>Tiempo total</Text>
              <Text style={s.val}>{tiempoReal}</Text>
            </View>
          )}
          <View style={s.row}>
            <Text style={s.lbl}>Horas cotizadas</Text>
            <Text style={s.val}>{ruta.horas_cotizadas} h</Text>
          </View>
          <View style={s.row}>
            <Text style={s.lbl}>Valor cotizado</Text>
            <Text style={s.val}>${fmtCOP(ruta.precio_total)}</Text>
          </View>
          {ruta.valor_excedente > 0 && (
            <View style={s.row}>
              <Text style={s.lbl}>
                Tiempo extra ({ruta.minutos_excedente_cliente} min
                {devueltas > 0 ? ' + devolución' : ''})
              </Text>
              <Text style={s.valExcedente}>+${fmtCOP(ruta.valor_excedente)}</Text>
            </View>
          )}
          <View style={s.totalRow}>
            <Text style={s.totalLbl}>Total a pagar (efectivo)</Text>
            <Text style={s.totalVal}>${fmtCOP(ruta.valor_final || ruta.precio_total)}</Text>
          </View>
        </View>

        {/* Paradas */}
        <View style={s.card}>
          <Text style={s.cardTitle}>ENTREGAS</Text>
          {paradas.map((p) => {
            const ok = p.estado === 'entregada';
            return (
              <View key={p.id} style={s.paradaRow}>
                <Text style={ok ? s.paradaIconOk : s.paradaIconFail}>{ok ? '✓' : '↩'}</Text>
                <Text style={s.paradaDir} numberOfLines={1}>{p.orden}. {p.direccion}</Text>
              </View>
            );
          })}
        </View>

        {/* Calificación */}
        <View style={s.card}>
          {calificada ? (
            <View style={s.gracias}>
              <Text style={s.graciasIcon}>⭐</Text>
              <Text style={s.graciasTxt}>¡Gracias por calificar a {conductor.nombre || 'tu conductor'}!</Text>
            </View>
          ) : (
            <>
              <Text style={s.cardTitle}>CALIFICA A {String(conductor.nombre || 'TU CONDUCTOR').toUpperCase()}</Text>
              <View style={s.starsRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <TouchableOpacity key={n} onPress={() => setEstrellas(n)} activeOpacity={0.7}>
                    <Text style={n <= estrellas ? s.starOn : s.starOff}>★</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={s.comentarioInput}
                placeholder="Comentario (opcional)"
                placeholderTextColor="#BBBBBB"
                value={comentario}
                onChangeText={setComentario}
                multiline
              />
              <TouchableOpacity
                style={estrellas && !enviando ? s.btnCalificar : s.btnCalificarDis}
                onPress={enviarCalificacion}
                disabled={!estrellas || enviando}
                activeOpacity={0.85}
              >
                {enviando
                  ? <ActivityIndicator color={C.black} size="small" />
                  : <Text style={s.btnCalificarTxt}>ENVIAR CALIFICACIÓN</Text>
                }
              </TouchableOpacity>
            </>
          )}
        </View>

        <TouchableOpacity style={s.btnVolver} onPress={goBack} activeOpacity={0.8}>
          <Text style={s.btnVolverTxt}>VOLVER AL INICIO</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: C.white },
  loadingWrap: { flex: 1, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  content:     { paddingHorizontal: 20, paddingTop: 70, paddingBottom: 48, alignItems: 'stretch' },

  checkCircle: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: C.yellow,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
    shadowColor: C.yellow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  checkIcon: { fontSize: 40 },
  title:     { color: C.black, fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  sub:       { color: C.grayLight, fontSize: 13, textAlign: 'center', marginBottom: 22 },

  card: {
    backgroundColor: C.white,
    borderRadius:    20,
    borderWidth:     1,
    borderColor:     C.grayBorder,
    padding:         16,
    marginBottom:    14,
    ...SHADOW,
  },
  cardTitle: { color: C.grayLight, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10 },
  row:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  lbl:       { color: C.grayLight, fontSize: 13, flex: 1, marginRight: 8 },
  val:       { color: C.black, fontSize: 13, fontWeight: '700' },
  valExcedente: { color: C.red, fontSize: 13, fontWeight: '700' },
  totalRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    borderTopWidth: 1,
    borderTopColor: C.grayBorder,
    marginTop:      8,
    paddingTop:     12,
  },
  totalLbl: { color: C.black, fontSize: 14, fontWeight: '700' },
  totalVal: { color: C.black, fontSize: 24, fontWeight: '800' },

  paradaRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  paradaIconOk:  { color: C.green, fontSize: 15, fontWeight: '800', width: 24 },
  paradaIconFail:{ color: C.red, fontSize: 15, fontWeight: '800', width: 24 },
  paradaDir:     { flex: 1, color: C.black, fontSize: 13 },

  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 14 },
  starOn:   { fontSize: 40, color: C.yellow },
  starOff:  { fontSize: 40, color: C.grayBorder },
  comentarioInput: {
    backgroundColor:   C.grayBg,
    borderRadius:      14,
    paddingHorizontal: 14,
    paddingVertical:   12,
    color:             C.black,
    fontSize:          14,
    minHeight:         70,
    textAlignVertical: 'top',
    marginBottom:      12,
  },
  btnCalificar: {
    backgroundColor: C.yellow,
    borderRadius:    16,
    paddingVertical: 15,
    alignItems:      'center',
  },
  btnCalificarDis: {
    backgroundColor: C.grayBorder,
    borderRadius:    16,
    paddingVertical: 15,
    alignItems:      'center',
  },
  btnCalificarTxt: { color: C.black, fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },

  gracias:     { alignItems: 'center', paddingVertical: 10 },
  graciasIcon: { fontSize: 34, marginBottom: 8 },
  graciasTxt:  { color: C.black, fontSize: 14, fontWeight: '600', textAlign: 'center' },

  btnVolver:    { paddingVertical: 16, alignItems: 'center' },
  btnVolverTxt: { color: C.yellow, fontSize: 14, fontWeight: '800', letterSpacing: 1.5 },
});

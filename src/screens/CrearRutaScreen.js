import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, StatusBar, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { GOOGLE_MAPS_KEY } from '../constants/config';
import { rutasApi } from '../api/client';
import { getUserUuid } from '../utils/tokenStorage';

const C = {
  white:      '#FFFFFF',
  black:      '#111111',
  yellow:     '#F4C400',
  yellowLight:'#FFF8DC',
  grayLight:  '#888888',
  grayBorder: '#EEEEEE',
  grayBg:     '#F5F5F5',
  red:        '#FF3B30',
  green:      '#22C55E',
};

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
};

const MAX_PARADAS = 20;

const VEHICULOS = [
  { id: 'moto',      label: 'Moto',      icon: '🏍️', tarifa: 40000, limite: 'Máx 20 kg' },
  { id: 'carro',     label: 'Carro',     icon: '🚗', tarifa: 50000, limite: 'Paquetes medianos' },
  { id: 'motocarro', label: 'Motocarro', icon: '🛺', tarifa: 60000, limite: 'Carga voluminosa' },
  { id: 'camioneta', label: 'Camioneta', icon: '🛻', tarifa: 70000, limite: 'Carga pesada' },
];

// Franjas de hora para rutas programadas (cada 30 min, 6:00 am a 9:30 pm)
const HORAS = [];
for (let h = 6; h <= 21; h++) {
  HORAS.push(`${String(h).padStart(2, '0')}:00`);
  HORAS.push(`${String(h).padStart(2, '0')}:30`);
}

const fmtCOP = (n) =>
  Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const placesQuery = {
  key:        GOOGLE_MAPS_KEY,
  language:   'es',
  components: 'country:co',
  // Sesgo a Manizales/Villamaría (cobertura de rutas), sin bloquear resultados
  location:   '5.06,-75.5',
  radius:     20000,
};

const placesStyles = {
  container:          { flex: 0 },
  textInputContainer: { backgroundColor: 'transparent' },
  textInput: {
    backgroundColor: 'transparent',
    color:     C.black,
    fontSize:  14,
    height:    40,
    marginLeft: 0, marginRight: 0, marginTop: 0, marginBottom: 0,
    paddingLeft: 0,
    borderWidth: 0,
  },
  listView: {
    backgroundColor: C.white,
    borderRadius:    14,
    marginTop:       4,
    borderWidth:     1,
    borderColor:     C.grayBorder,
    zIndex:          999,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
  },
  row:              { backgroundColor: C.white, paddingVertical: 12, paddingHorizontal: 16 },
  description:      { color: C.black, fontSize: 13 },
  separator:        { backgroundColor: C.grayBorder, height: 1 },
  poweredContainer: { backgroundColor: C.white },
  powered:          {},
};

let paradaKeyCounter = 0;
const nuevaParada = () => ({
  key: `parada_${++paradaKeyCounter}_${Date.now()}`,
  direccion: '',
  lat: null,
  lng: null,
  nombre: '',
  telefono: '',
});

// Próximos 7 días para el selector de rutas programadas
function proximosDias() {
  const dias = [];
  const hoy = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i);
    let label;
    if (i === 0) label = 'Hoy';
    else if (i === 1) label = 'Mañana';
    else label = d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
    dias.push({ date: d, label });
  }
  return dias;
}

export default function CrearRutaScreen({ navigate, goBack }) {
  const [recogida, setRecogida]     = useState({ direccion: '', lat: null, lng: null });
  const [paradas, setParadas]       = useState([nuevaParada()]);
  const [vehiculo, setVehiculo]     = useState('moto');
  const [peso, setPeso]             = useState('');
  const [ordenObligatorio, setOrdenObligatorio] = useState(false);
  const [modo, setModo]             = useState('inmediata'); // inmediata | programada
  const [diaIdx, setDiaIdx]         = useState(0);
  const [hora, setHora]             = useState('');
  const [cotizacion, setCotizacion] = useState(null);
  const [cotizando, setCotizando]   = useState(false);
  const [publicando, setPublicando] = useState(false);

  const dias = useMemo(proximosDias, []);

  // Cualquier cambio del formulario invalida la cotización mostrada
  const invalidar = () => { if (cotizacion) setCotizacion(null); };

  const setParadaCampo = (key, campo, valor) => {
    invalidar();
    setParadas((prev) => prev.map((p) => (p.key === key ? { ...p, [campo]: valor } : p)));
  };

  const agregarParada = () => {
    if (paradas.length >= MAX_PARADAS) {
      Alert.alert('Límite de paradas', `Una ruta admite máximo ${MAX_PARADAS} entregas.`);
      return;
    }
    invalidar();
    setParadas((prev) => [...prev, nuevaParada()]);
  };

  const eliminarParada = (key) => {
    if (paradas.length === 1) {
      Alert.alert('Mínimo una parada', 'La ruta necesita al menos una entrega.');
      return;
    }
    invalidar();
    setParadas((prev) => prev.filter((p) => p.key !== key));
  };

  const programadaISO = () => {
    if (modo !== 'programada') return null;
    if (!hora) return undefined; // sin hora elegida
    const [hh, mm] = hora.split(':').map(Number);
    const d = dias[diaIdx].date;
    const fecha = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm, 0, 0);
    return fecha.toISOString();
  };

  const validarFormulario = () => {
    if (!recogida.lat) {
      Alert.alert('Falta el punto de recogida', 'Selecciona la dirección donde el conductor recoge los pedidos.');
      return null;
    }
    const sinDireccion = paradas.filter((p) => !p.lat);
    if (sinDireccion.length > 0) {
      Alert.alert('Paradas incompletas', 'Selecciona la dirección de todas las entregas (elige una opción de la lista).');
      return null;
    }
    if (modo === 'programada' && !hora) {
      Alert.alert('Falta la hora', 'Elige la fecha y la hora de tu ruta programada.');
      return null;
    }
    const pesoNum = peso ? parseInt(peso, 10) : null;
    if (vehiculo === 'moto' && pesoNum && pesoNum > 20) {
      Alert.alert('Peso excedido', 'La moto lleva máximo 20 kg. Elige motocarro o camioneta.');
      return null;
    }
    return {
      punto_recogida: {
        direccion: recogida.direccion,
        lat:       recogida.lat,
        lng:       recogida.lng,
      },
      paradas: paradas.map((p) => ({
        direccion:             p.direccion,
        lat:                   p.lat,
        lng:                   p.lng,
        nombre_destinatario:   p.nombre.trim() || null,
        telefono_destinatario: p.telefono.trim() || null,
      })),
      tipo_vehiculo:     vehiculo,
      orden_obligatorio: ordenObligatorio,
      programada_para:   programadaISO(),
      peso_declarado_kg: pesoNum,
    };
  };

  const mensajeDeError = (e, fallback) => {
    const detalle = e?.response?.data?.detail;
    if (typeof detalle === 'string' && detalle) return detalle;
    return e?.friendlyMessage || fallback;
  };

  const handleCotizar = async () => {
    const payload = validarFormulario();
    if (!payload || cotizando) return;
    setCotizando(true);
    try {
      const { data } = await rutasApi.cotizar(payload);
      setCotizacion(data);
    } catch (e) {
      Alert.alert('No se pudo cotizar', mensajeDeError(e, 'Revisa las direcciones e intenta de nuevo.'));
    }
    setCotizando(false);
  };

  const handlePublicar = async () => {
    const payload = validarFormulario();
    if (!payload || publicando) return;
    setPublicando(true);
    try {
      const uuid = await getUserUuid();
      const { data } = await rutasApi.crear({ ...payload, cliente_id: uuid });
      navigate('BuscandoRuta', {
        rutaId:        data.ruta.id,
        numeroParadas: data.ruta.numero_paradas,
        precio:        data.ruta.precio_total,
        tipoVehiculo:  data.ruta.tipo_vehiculo,
        programada:    !!data.ruta.programada_para,
        recogidaLat:   data.ruta.punto_recogida_lat,
        recogidaLng:   data.ruta.punto_recogida_lng,
      });
    } catch (e) {
      const detalle = mensajeDeError(e, 'No se pudo publicar la ruta.');
      if (e?.response?.status === 403 && detalle.includes('saldo')) {
        Alert.alert('Saldo insuficiente', detalle, [
          { text: 'Ahora no', style: 'cancel' },
          { text: 'Recargar saldo', onPress: () => navigate('RecargaSaldo') },
        ]);
      } else {
        Alert.alert('No se pudo publicar', detalle);
      }
    }
    setPublicando(false);
  };

  const vehiculoSel = VEHICULOS.find((v) => v.id === vehiculo);

  return (
    <View style={s.root}>
      <StatusBar backgroundColor={C.white} barStyle="dark-content" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={goBack} activeOpacity={0.7}>
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Crear ruta de entregas</Text>
        <View style={s.headerSpacer} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {/* Punto de recogida */}
        <Text style={s.sectionLabel}>PUNTO DE RECOGIDA</Text>
        <View style={s.inputCard}>
          <View style={s.inputRow}>
            <View style={s.dotYellow} />
            <View style={s.autocompleteWrap}>
              <GooglePlacesAutocomplete
                placeholder="¿Dónde recogemos los pedidos?"
                fetchDetails
                debounce={250}
                onPress={(data, details) => {
                  invalidar();
                  const loc = details?.geometry?.location;
                  setRecogida({ direccion: data.description, lat: loc?.lat ?? null, lng: loc?.lng ?? null });
                }}
                query={placesQuery}
                styles={placesStyles}
                enablePoweredByContainer={false}
                textInputProps={{ placeholderTextColor: '#BBBBBB' }}
                keepResultsAfterBlur={false}
              />
            </View>
          </View>
        </View>

        {/* Paradas */}
        <Text style={s.sectionLabel}>ENTREGAS ({paradas.length}/{MAX_PARADAS})</Text>
        {paradas.map((p, i) => (
          <View key={p.key} style={s.paradaCard}>
            <View style={s.paradaHeader}>
              <View style={s.paradaNum}>
                <Text style={s.paradaNumTxt}>{i + 1}</Text>
              </View>
              <Text style={s.paradaTitle}>Entrega {i + 1}</Text>
              <TouchableOpacity onPress={() => eliminarParada(p.key)} style={s.paradaDel} activeOpacity={0.7}>
                <Text style={s.paradaDelTxt}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={s.inputRow}>
              <View style={s.dotBlack} />
              <View style={s.autocompleteWrap}>
                <GooglePlacesAutocomplete
                  placeholder="Dirección de entrega"
                  fetchDetails
                  debounce={250}
                  onPress={(data, details) => {
                    const loc = details?.geometry?.location;
                    invalidar();
                    setParadas((prev) => prev.map((x) => (
                      x.key === p.key
                        ? { ...x, direccion: data.description, lat: loc?.lat ?? null, lng: loc?.lng ?? null }
                        : x
                    )));
                  }}
                  query={placesQuery}
                  styles={placesStyles}
                  enablePoweredByContainer={false}
                  textInputProps={{ placeholderTextColor: '#BBBBBB' }}
                  keepResultsAfterBlur={false}
                />
              </View>
            </View>

            <View style={s.destinatarioRow}>
              <TextInput
                style={s.destinatarioInput}
                placeholder="Nombre (opcional)"
                placeholderTextColor="#BBBBBB"
                value={p.nombre}
                onChangeText={(v) => setParadaCampo(p.key, 'nombre', v)}
              />
              <TextInput
                style={s.destinatarioInput}
                placeholder="Teléfono (opcional)"
                placeholderTextColor="#BBBBBB"
                keyboardType="phone-pad"
                value={p.telefono}
                onChangeText={(v) => setParadaCampo(p.key, 'telefono', v.replace(/[^\d+]/g, ''))}
              />
            </View>
          </View>
        ))}

        <TouchableOpacity style={s.agregarBtn} onPress={agregarParada} activeOpacity={0.8}>
          <Text style={s.agregarBtnTxt}>+  Agregar otra entrega</Text>
        </TouchableOpacity>

        {/* Vehículo */}
        <Text style={s.sectionLabel}>VEHÍCULO</Text>
        <View style={s.vehiculosGrid}>
          {VEHICULOS.map((v) => (
            <TouchableOpacity
              key={v.id}
              style={vehiculo === v.id ? s.vehiculoCardSel : s.vehiculoCard}
              onPress={() => { invalidar(); setVehiculo(v.id); }}
              activeOpacity={0.8}
            >
              <Text style={s.vehiculoIcon}>{v.icon}</Text>
              <Text style={s.vehiculoLabel}>{v.label}</Text>
              <Text style={s.vehiculoTarifa}>${fmtCOP(v.tarifa)}/hora</Text>
              <Text style={s.vehiculoLimite}>{v.limite}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Peso */}
        <Text style={s.sectionLabel}>PESO TOTAL APROXIMADO</Text>
        <View style={s.pesoCard}>
          <TextInput
            style={s.pesoInput}
            placeholder="Ej: 15"
            placeholderTextColor="#BBBBBB"
            keyboardType="numeric"
            maxLength={4}
            value={peso}
            onChangeText={(v) => { invalidar(); setPeso(v.replace(/\D/g, '')); }}
          />
          <Text style={s.pesoKg}>kg</Text>
          {vehiculo === 'moto' && <Text style={s.pesoAviso}>Moto: máx 20 kg</Text>}
        </View>

        {/* Opciones */}
        <Text style={s.sectionLabel}>OPCIONES</Text>
        <View style={s.opcionesCard}>
          <View style={s.opcionRow}>
            <View style={s.opcionTexts}>
              <Text style={s.opcionTitle}>Foto de entrega</Text>
              <Text style={s.opcionSub}>Siempre activa: cada entrega queda con foto y hora</Text>
            </View>
            <Switch value disabled trackColor={{ true: C.green }} thumbColor={C.white} />
          </View>
          <View style={s.opcionSep} />
          <View style={s.opcionRow}>
            <View style={s.opcionTexts}>
              <Text style={s.opcionTitle}>Entregar en orden</Text>
              <Text style={s.opcionSub}>
                Se respeta el orden de tu lista. Si está apagado, el sistema optimiza el recorrido.
              </Text>
            </View>
            <Switch
              value={ordenObligatorio}
              onValueChange={(v) => { invalidar(); setOrdenObligatorio(v); }}
              trackColor={{ false: '#CCCCCC', true: C.green }}
              thumbColor={C.white}
            />
          </View>
        </View>

        {/* Cuándo */}
        <Text style={s.sectionLabel}>¿CUÁNDO?</Text>
        <View style={s.modoRow}>
          <TouchableOpacity
            style={modo === 'inmediata' ? s.modoBtnSel : s.modoBtn}
            onPress={() => { invalidar(); setModo('inmediata'); }}
            activeOpacity={0.8}
          >
            <Text style={modo === 'inmediata' ? s.modoTxtSel : s.modoTxt}>⚡ Ahora</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={modo === 'programada' ? s.modoBtnSel : s.modoBtn}
            onPress={() => { invalidar(); setModo('programada'); }}
            activeOpacity={0.8}
          >
            <Text style={modo === 'programada' ? s.modoTxtSel : s.modoTxt}>📅 Programar</Text>
          </TouchableOpacity>
        </View>

        {modo === 'programada' && (
          <View style={s.programarCard}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
              {dias.map((d, i) => (
                <TouchableOpacity
                  key={d.label}
                  style={diaIdx === i ? s.chipSel : s.chip}
                  onPress={() => { invalidar(); setDiaIdx(i); }}
                  activeOpacity={0.8}
                >
                  <Text style={diaIdx === i ? s.chipTxtSel : s.chipTxt}>{d.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
              {HORAS.map((h) => (
                <TouchableOpacity
                  key={h}
                  style={hora === h ? s.chipSel : s.chip}
                  onPress={() => { invalidar(); setHora(h); }}
                  activeOpacity={0.8}
                >
                  <Text style={hora === h ? s.chipTxtSel : s.chipTxt}>{h}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Cotización */}
        {cotizacion ? (
          <View style={s.cotizacionCard}>
            <Text style={s.cotizacionTitle}>TU COTIZACIÓN</Text>
            <View style={s.cotRow}>
              <Text style={s.cotLbl}>Entregas</Text>
              <Text style={s.cotVal}>{cotizacion.numero_paradas}</Text>
            </View>
            <View style={s.cotRow}>
              <Text style={s.cotLbl}>Recorrido</Text>
              <Text style={s.cotVal}>{Number(cotizacion.distancia_km).toFixed(1)} km</Text>
            </View>
            <View style={s.cotRow}>
              <Text style={s.cotLbl}>Tiempo estimado</Text>
              <Text style={s.cotVal}>{cotizacion.tiempo_estimado_min} min</Text>
            </View>
            <View style={s.cotRow}>
              <Text style={s.cotLbl}>Horas cotizadas</Text>
              <Text style={s.cotVal}>
                {cotizacion.horas_cotizadas} h × ${fmtCOP(cotizacion.tarifa_hora)}
              </Text>
            </View>
            {cotizacion.es_nocturna && (
              <View style={s.cotRow}>
                <Text style={s.cotLbl}>Recargo nocturno</Text>
                <Text style={s.cotVal}>+20%</Text>
              </View>
            )}
            <View style={s.cotTotalRow}>
              <Text style={s.cotTotalLbl}>Total ({vehiculoSel.label})</Text>
              <Text style={s.cotTotalVal}>${fmtCOP(cotizacion.precio_total)}</Text>
            </View>
            <Text style={s.legal}>
              Precio fijo. Solo se cobra tiempo extra causado por el comercio o los
              destinatarios (pedido no listo, no contestan, dirección errada), en
              fracciones de media hora. Cancelar después de que un conductor acepte
              cuesta el 10% del valor; con el conductor en camino o en el punto de
              recogida, el 20%. Pago en efectivo al conductor al finalizar.
            </Text>
            <TouchableOpacity
              style={publicando ? s.publicarBtnDis : s.publicarBtn}
              onPress={handlePublicar}
              disabled={publicando}
              activeOpacity={0.85}
            >
              {publicando
                ? <ActivityIndicator color={C.black} size="small" />
                : <Text style={s.publicarBtnTxt}>PUBLICAR RUTA</Text>
              }
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={cotizando ? s.cotizarBtnDis : s.cotizarBtn}
            onPress={handleCotizar}
            disabled={cotizando}
            activeOpacity={0.85}
          >
            {cotizando
              ? <ActivityIndicator color={C.black} size="small" />
              : <Text style={s.cotizarBtnTxt}>COTIZAR RUTA</Text>
            }
          </TouchableOpacity>
        )}
      </ScrollView>
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
    backgroundColor:   C.white,
  },
  backBtn:      { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow:    { color: C.black, fontSize: 24, fontWeight: '700' },
  headerTitle:  { flex: 1, color: C.black, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  headerSpacer: { width: 40 },

  scroll:  { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 48 },

  sectionLabel: {
    color: C.grayLight, fontSize: 11, fontWeight: '700',
    letterSpacing: 1.5, marginTop: 18, marginBottom: 8,
  },

  inputCard: {
    backgroundColor: C.white,
    borderRadius:    18,
    borderWidth:     1,
    borderColor:     C.grayBorder,
    paddingHorizontal: 14,
    paddingVertical:   4,
    ...SHADOW,
  },
  inputRow:         { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 4 },
  dotYellow:        { width: 10, height: 10, borderRadius: 5, backgroundColor: C.yellow, marginRight: 10, marginTop: 16 },
  dotBlack:         { width: 10, height: 10, borderRadius: 5, backgroundColor: C.black,  marginRight: 10, marginTop: 16 },
  autocompleteWrap: { flex: 1 },

  paradaCard: {
    backgroundColor:   C.white,
    borderRadius:      18,
    borderWidth:       1,
    borderColor:       C.grayBorder,
    paddingHorizontal: 14,
    paddingTop:        12,
    paddingBottom:     10,
    marginBottom:      10,
    ...SHADOW,
  },
  paradaHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  paradaNum: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: C.yellow,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 8,
  },
  paradaNumTxt: { color: C.black, fontSize: 12, fontWeight: '800' },
  paradaTitle:  { flex: 1, color: C.black, fontSize: 13, fontWeight: '700' },
  paradaDel:    { padding: 6 },
  paradaDelTxt: { color: C.grayLight, fontSize: 16, fontWeight: '700' },

  destinatarioRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  destinatarioInput: {
    flex:              1,
    backgroundColor:   C.grayBg,
    borderRadius:      12,
    paddingHorizontal: 12,
    paddingVertical:   9,
    color:             C.black,
    fontSize:          13,
  },

  agregarBtn: {
    borderRadius:    16,
    borderWidth:     1.5,
    borderColor:     C.yellow,
    borderStyle:     'dashed',
    paddingVertical: 14,
    alignItems:      'center',
    marginTop:       2,
  },
  agregarBtnTxt: { color: C.black, fontSize: 14, fontWeight: '700' },

  vehiculosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  vehiculoCard: {
    width:           '47.5%',
    backgroundColor: C.white,
    borderRadius:    18,
    borderWidth:     1.5,
    borderColor:     C.grayBorder,
    paddingVertical: 14,
    alignItems:      'center',
    ...SHADOW,
  },
  vehiculoCardSel: {
    width:           '47.5%',
    backgroundColor: C.yellowLight,
    borderRadius:    18,
    borderWidth:     1.5,
    borderColor:     C.yellow,
    paddingVertical: 14,
    alignItems:      'center',
    ...SHADOW,
  },
  vehiculoIcon:   { fontSize: 28, marginBottom: 6 },
  vehiculoLabel:  { color: C.black, fontSize: 14, fontWeight: '800' },
  vehiculoTarifa: { color: C.black, fontSize: 12, fontWeight: '600', marginTop: 2 },
  vehiculoLimite: { color: C.grayLight, fontSize: 11, marginTop: 2 },

  pesoCard: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   C.white,
    borderRadius:      18,
    borderWidth:       1,
    borderColor:       C.grayBorder,
    paddingHorizontal: 16,
    paddingVertical:   6,
    ...SHADOW,
  },
  pesoInput: { flex: 1, color: C.black, fontSize: 16, fontWeight: '700', paddingVertical: 10 },
  pesoKg:    { color: C.grayLight, fontSize: 14, fontWeight: '600', marginLeft: 6 },
  pesoAviso: { color: C.grayLight, fontSize: 11, marginLeft: 12 },

  opcionesCard: {
    backgroundColor:   C.white,
    borderRadius:      18,
    borderWidth:       1,
    borderColor:       C.grayBorder,
    paddingHorizontal: 16,
    ...SHADOW,
  },
  opcionRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  opcionTexts: { flex: 1, marginRight: 10 },
  opcionTitle: { color: C.black, fontSize: 14, fontWeight: '700', marginBottom: 3 },
  opcionSub:   { color: C.grayLight, fontSize: 12, lineHeight: 17 },
  opcionSep:   { height: 1, backgroundColor: C.grayBorder },

  modoRow: { flexDirection: 'row', gap: 10 },
  modoBtn: {
    flex:            1,
    backgroundColor: C.white,
    borderRadius:    16,
    borderWidth:     1.5,
    borderColor:     C.grayBorder,
    paddingVertical: 14,
    alignItems:      'center',
  },
  modoBtnSel: {
    flex:            1,
    backgroundColor: C.yellowLight,
    borderRadius:    16,
    borderWidth:     1.5,
    borderColor:     C.yellow,
    paddingVertical: 14,
    alignItems:      'center',
  },
  modoTxt:    { color: C.grayLight, fontSize: 14, fontWeight: '600' },
  modoTxtSel: { color: C.black, fontSize: 14, fontWeight: '800' },

  programarCard: { marginTop: 10 },
  chipsRow:      { gap: 8, paddingVertical: 5 },
  chip: {
    backgroundColor:   C.grayBg,
    borderRadius:      14,
    paddingHorizontal: 14,
    paddingVertical:   9,
  },
  chipSel: {
    backgroundColor:   C.black,
    borderRadius:      14,
    paddingHorizontal: 14,
    paddingVertical:   9,
  },
  chipTxt:    { color: C.black, fontSize: 13, fontWeight: '600' },
  chipTxtSel: { color: C.yellow, fontSize: 13, fontWeight: '800' },

  cotizarBtn: {
    backgroundColor: C.black,
    borderRadius:    18,
    paddingVertical: 18,
    alignItems:      'center',
    marginTop:       24,
  },
  cotizarBtnDis: {
    backgroundColor: C.grayBorder,
    borderRadius:    18,
    paddingVertical: 18,
    alignItems:      'center',
    marginTop:       24,
  },
  cotizarBtnTxt: { color: C.yellow, fontSize: 15, fontWeight: '800', letterSpacing: 1 },

  cotizacionCard: {
    backgroundColor: C.white,
    borderRadius:    22,
    borderWidth:     1.5,
    borderColor:     C.yellow,
    padding:         18,
    marginTop:       24,
    ...SHADOW,
  },
  cotizacionTitle: { color: C.grayLight, fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 10 },
  cotRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  cotLbl:      { color: C.grayLight, fontSize: 13 },
  cotVal:      { color: C.black, fontSize: 13, fontWeight: '700' },
  cotTotalRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    borderTopWidth: 1,
    borderTopColor: C.grayBorder,
    marginTop:      8,
    paddingTop:     12,
  },
  cotTotalLbl: { color: C.black, fontSize: 14, fontWeight: '700' },
  cotTotalVal: { color: C.black, fontSize: 24, fontWeight: '800' },
  legal: {
    color:      C.grayLight,
    fontSize:   11,
    lineHeight: 16,
    marginTop:  12,
  },
  publicarBtn: {
    backgroundColor: C.yellow,
    borderRadius:    18,
    paddingVertical: 18,
    alignItems:      'center',
    marginTop:       14,
  },
  publicarBtnDis: {
    backgroundColor: C.grayBorder,
    borderRadius:    18,
    paddingVertical: 18,
    alignItems:      'center',
    marginTop:       14,
  },
  publicarBtnTxt: { color: C.black, fontSize: 15, fontWeight: '800', letterSpacing: 1 },
});

import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, TextInput, Alert, ActivityIndicator, Image, BackHandler,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SERVICES } from '../constants/services';
import { servicesApi } from '../api/client';
import { getUserUuid } from '../utils/tokenStorage';

// Opciones de contexto para grúa y acarreo (deben coincidir con el backend)
const GRUA_TIPOS = [
  { id: 'motocarro', label: 'Motocarro' },
  { id: 'camioneta', label: 'Camioneta' },
  { id: 'camabaja',  label: 'Camabaja' },
];
const GRUA_ZONAS = [
  { id: 'urbana',         label: 'Urbana' },
  { id: 'intermunicipal', label: 'Intermunicipal' },
];
const ACARREO_TIPOS = [
  { id: 'motocarro', label: 'Motocarro' },
  { id: 'camioneta', label: 'Camioneta' },
  { id: 'turbo',     label: 'Turbo' },
  { id: 'nh',        label: 'NH' },
];

const C = {
  white: '#FFFFFF',
  black: '#111111',
  yellow: '#F4C400',
  yellowLight: '#FFF8DC',
  grayLight: '#888888',
  grayBorder: '#EEEEEE',
  grayBg: '#F5F5F5',
  green: '#22C55E',   // oferta por encima de la tarifa
  red:   '#EF4444',   // oferta por debajo del mínimo
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
  const esGrua     = serviceId === 'grua';
  const esAcarreo  = serviceId === 'acarreo';

  const [price, setPrice]     = useState('');
  const [loading, setLoading] = useState(false);

  // ─── Oferta del cliente sobre la tarifa sugerida ───
  // La tarifa calculada deja de ser un precio impuesto y pasa a ser una
  // sugerencia: el cliente ofrece lo que quiera por encima del piso. Es el
  // modelo de inDrive, y encaja con lo que ya hacía el sistema (el conductor
  // podía aceptar o contraofertar); lo que faltaba era dejar mover el precio.
  const sugerido = negotiable ? 0 : Math.round(fareInfo.adjusted);

  // Cuánto puede bajar. El servidor lo verifica por su cuenta con la distancia
  // real; este valor solo pinta el mismo límite para no dejar enviar algo que
  // vaya a ser rechazado. Se consulta al backend con este valor por defecto.
  const [pisoRatio, setPisoRatio] = useState(0.85);
  const piso = Math.round(sugerido * pisoRatio);

  // Oferta actual como texto (permite borrar el campo mientras se escribe).
  const [oferta, setOferta] = useState(String(sugerido));
  const ofertaNum = parseInt(oferta, 10) || 0;

  useEffect(() => {
    let vivo = true;
    servicesApi.configTarifas()
      .then(({ data }) => {
        if (vivo && typeof data?.piso_ratio === 'number') setPisoRatio(data.piso_ratio);
      })
      .catch(() => { /* se queda el valor por defecto; el servidor manda igual */ });
    return () => { vivo = false; };
  }, []);

  // Desviación respecto al sugerido, para decirle al cliente qué esperar.
  const desvio = sugerido > 0 ? Math.round(((ofertaNum - sugerido) / sugerido) * 100) : 0;
  const bajoPiso = !negotiable && ofertaNum > 0 && ofertaNum < piso;

  const pistaOferta =
    bajoPiso                ? `El mínimo para este trayecto es $${fmtCOP(piso)}`
    : desvio <= -10         ? 'Bastante por debajo: puede que tarden en tomarlo'
    : desvio < 0            ? 'Algo por debajo de la tarifa'
    : desvio === 0          ? 'Tarifa sugerida'
    : desvio <= 15          ? 'Por encima: te lo tomarán más rápido'
    :                         'Muy por encima de la tarifa';

  const ajustar = (delta) => {
    const nuevo = Math.max(piso, ofertaNum + delta);
    setOferta(String(nuevo));
  };

  // Contexto de grúa / acarreo
  const [gruaTipo, setGruaTipo]       = useState(null);
  const [gruaZona, setGruaZona]       = useState(null);
  const [tarjetaPath, setTarjetaPath] = useState(null);   // path en storage (backend)
  const [tarjetaPrev, setTarjetaPrev] = useState(null);   // uri local para previsualizar
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [acarreoTipo, setAcarreoTipo] = useState(null);
  const [peso, setPeso]               = useState('');
  const [ayudante, setAyudante]       = useState(false);

  // Requisitos mínimos para poder buscar conductor
  const detallesOk =
    esGrua    ? (gruaTipo && gruaZona) :
    esAcarreo ? !!acarreoTipo :
    true;
  const precioOk = negotiable
    ? (price.length > 0 && parseInt(price, 10) > 0)
    : (ofertaNum >= piso);
  const ready = detallesOk && precioOk;

  const subirTarjeta = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos acceso a tus fotos para subir la tarjeta de propiedad.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const uri = result.assets[0].uri;
      setSubiendoFoto(true);
      const clienteId = await getUserUuid();
      const formData = new FormData();
      formData.append('cliente_id', clienteId);
      formData.append('archivo', { uri, type: 'image/jpeg', name: 'tarjeta.jpg' });
      const { data } = await servicesApi.subirManifiesto(formData);
      setTarjetaPath(data.path);
      setTarjetaPrev(uri);
    } catch (err) {
      Alert.alert('Error', 'No se pudo subir la foto. Puedes continuar sin ella y entregarla al conductor.');
    } finally {
      setSubiendoFoto(false);
    }
  };

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
      // En servicios con tarifa se envía lo que el cliente ofreció, no la
      // tarifa calculada: la sugerencia es solo el punto de partida.
      const precioPropuesto = negotiable ? parseInt(price, 10) : ofertaNum;
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
      if (esGrua) {
        body.grua_tipo = gruaTipo;
        body.grua_zona = gruaZona;
        if (tarjetaPath) body.tarjeta_propiedad_path = tarjetaPath;
      }
      if (esAcarreo) {
        body.acarreo_tipo = acarreoTipo;
        body.necesita_ayudante = ayudante;
        if (peso) body.peso_estimado_kg = parseInt(peso, 10);
      }

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

        {/* Detalles de grúa */}
        {esGrua && (
          <>
            <Text style={s.section}>TIPO DE GRÚA</Text>
            <View style={s.chipsRow}>
              {GRUA_TIPOS.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={gruaTipo === t.id ? s.chipOn : s.chipOff}
                  onPress={() => setGruaTipo(t.id)}
                  activeOpacity={0.8}
                >
                  <Text style={gruaTipo === t.id ? s.chipTxtOn : s.chipTxtOff}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.section}>ZONA</Text>
            <View style={s.chipsRow}>
              {GRUA_ZONAS.map((z) => (
                <TouchableOpacity
                  key={z.id}
                  style={gruaZona === z.id ? s.chipOn : s.chipOff}
                  onPress={() => setGruaZona(z.id)}
                  activeOpacity={0.8}
                >
                  <Text style={gruaZona === z.id ? s.chipTxtOn : s.chipTxtOff}>{z.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.section}>TARJETA DE PROPIEDAD (OPCIONAL)</Text>
            <TouchableOpacity style={s.uploadBox} onPress={subirTarjeta} activeOpacity={0.8} disabled={subiendoFoto}>
              {subiendoFoto ? (
                <ActivityIndicator color={C.black} size="small" />
              ) : tarjetaPrev ? (
                <View style={s.uploadDone}>
                  <Image source={{ uri: tarjetaPrev }} style={s.uploadThumb} />
                  <Text style={s.uploadDoneTxt}>Foto cargada · toca para cambiar</Text>
                </View>
              ) : (
                <Text style={s.uploadTxt}>📄  Subir foto de la tarjeta de propiedad</Text>
              )}
            </TouchableOpacity>
            <Text style={s.priceHint}>
              Requerida para el manifiesto de carga. Si no la tienes a mano, puedes continuar y entregarla al conductor.
            </Text>
          </>
        )}

        {/* Detalles de acarreo */}
        {esAcarreo && (
          <>
            <Text style={s.section}>TIPO DE VEHÍCULO</Text>
            <View style={s.chipsRow}>
              {ACARREO_TIPOS.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={acarreoTipo === t.id ? s.chipOn : s.chipOff}
                  onPress={() => setAcarreoTipo(t.id)}
                  activeOpacity={0.8}
                >
                  <Text style={acarreoTipo === t.id ? s.chipTxtOn : s.chipTxtOff}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.section}>PESO APROXIMADO (OPCIONAL)</Text>
            <View style={[s.priceCard, SHADOW]}>
              <TextInput
                style={s.priceInput}
                placeholder="0"
                placeholderTextColor={C.grayBorder}
                value={peso}
                onChangeText={(v) => setPeso(v.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                maxLength={6}
              />
              <Text style={s.cop}>KG</Text>
            </View>

            <TouchableOpacity
              style={s.checkRow}
              onPress={() => setAyudante((v) => !v)}
              activeOpacity={0.8}
            >
              <View style={ayudante ? s.checkBoxOn : s.checkBoxOff}>
                {ayudante && <Text style={s.checkMark}>✓</Text>}
              </View>
              <Text style={s.checkLabel}>Necesito ayudante para cargar</Text>
            </TouchableOpacity>
          </>
        )}

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
            <Text style={s.section}>OFRECE TU PRECIO</Text>
            <View style={[s.priceCard, SHADOW, bajoPiso && s.priceCardMal]}>
              <TouchableOpacity
                style={s.stepBtn}
                onPress={() => ajustar(-500)}
                disabled={ofertaNum <= piso}
                activeOpacity={0.7}
              >
                <Text style={ofertaNum <= piso ? s.stepTxtOff : s.stepTxt}>−</Text>
              </TouchableOpacity>

              <View style={s.priceMid}>
                <Text style={s.currency}>$</Text>
                <TextInput
                  style={s.priceInput}
                  value={oferta}
                  onChangeText={(v) => setOferta(v.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                  maxLength={7}
                  selectTextOnFocus
                />
              </View>

              <TouchableOpacity style={s.stepBtn} onPress={() => ajustar(500)} activeOpacity={0.7}>
                <Text style={s.stepTxt}>+</Text>
              </TouchableOpacity>
            </View>

            <Text style={bajoPiso ? s.pistaMal : desvio > 0 ? s.pistaBien : s.pistaNeutra}>
              {pistaOferta}
              {!bajoPiso && desvio !== 0 && `  ·  ${desvio > 0 ? '+' : ''}${desvio}%`}
            </Text>

            {ofertaNum !== sugerido && !bajoPiso && (
              <TouchableOpacity onPress={() => setOferta(String(sugerido))} activeOpacity={0.7}>
                <Text style={s.volverSugerido}>
                  Volver a la tarifa sugerida (${fmtCOP(sugerido)})
                </Text>
              </TouchableOpacity>
            )}

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
                <Text style={s.breakdownTxt}>sugerido ${fmtCOP(sugerido)}</Text>
              </View>
            </View>
            <Text style={s.priceHint}>
              El conductor puede aceptar tu precio o proponerte otro.
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

  /* Ofrece tu precio */
  priceCardMal: { borderColor: C.red },
  priceMid:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  stepBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.grayBg,
    alignItems: 'center', justifyContent: 'center',
  },
  stepTxt:    { fontSize: 26, fontWeight: '700', color: C.black, marginTop: -2 },
  stepTxtOff: { fontSize: 26, fontWeight: '700', color: C.grayBorder, marginTop: -2 },
  pistaNeutra: { color: C.grayLight, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  pistaBien:   { color: C.green, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  pistaMal:    { color: C.red, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  volverSugerido: {
    color: C.grayLight, fontSize: 12, fontWeight: '600',
    textDecorationLine: 'underline', marginBottom: 10,
  },

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

  // Chips de selección (tipo/zona)
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  chipOn:  { backgroundColor: C.yellow, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1.5, borderColor: C.yellow },
  chipOff: { backgroundColor: C.white, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1.5, borderColor: C.grayBorder },
  chipTxtOn:  { color: C.black, fontSize: 14, fontWeight: '700' },
  chipTxtOff: { color: C.grayLight, fontSize: 14, fontWeight: '600' },

  // Subida de tarjeta
  uploadBox: { borderWidth: 1.5, borderColor: C.grayBorder, borderRadius: 16, paddingVertical: 18, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8, minHeight: 60 },
  uploadTxt: { color: C.grayLight, fontSize: 14, fontWeight: '600' },
  uploadDone: { flexDirection: 'row', alignItems: 'center' },
  uploadThumb: { width: 40, height: 40, borderRadius: 8, marginRight: 12 },
  uploadDoneTxt: { color: C.black, fontSize: 13, fontWeight: '600' },

  // Checkbox ayudante
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, marginTop: 4 },
  checkBoxOn:  { width: 24, height: 24, borderRadius: 6, backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  checkBoxOff: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: C.grayBorder, marginRight: 12 },
  checkMark: { color: C.black, fontSize: 15, fontWeight: '800' },
  checkLabel: { color: C.black, fontSize: 15, fontWeight: '500' },
});

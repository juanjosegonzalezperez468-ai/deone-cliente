import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, Alert, ActivityIndicator,
  Dimensions, Image, PanResponder,
} from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import * as Location from 'expo-location';
import { SERVICES } from '../constants/services';
import { GOOGLE_MAPS_KEY } from '../constants/config';
import { isNegotiable, calcFare, getDirections } from '../utils/fare';
import auth from '@react-native-firebase/auth';
import { servicesApi, authApi } from '../api/client';
import { getUserUuid, clearBackendToken, clearPhone, clearUserUuid } from '../utils/tokenStorage';

const C = {
  white:      '#FFFFFF',
  black:      '#111111',
  yellow:     '#F4C400',
  yellowLight:'#FFF8DC',
  grayLight:  '#888888',
  grayBorder: '#EEEEEE',
  grayBg:     '#F5F5F5',
};

const MANIZALES = { lat: 5.0703, lng: -75.5138 };

const { width: SW } = Dimensions.get('window');
const CARD_W = Math.floor((SW - 40 - 24) / 2);

const fmtCOP = (n) =>
  Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const placesQuery = {
  key:          GOOGLE_MAPS_KEY,
  language:     'es',
  components:   'country:co',
  location:     `${MANIZALES.lat},${MANIZALES.lng}`,
  radius:       30000,
  strictbounds: true,
};

const placesStyles = {
  container:          { flex: 0 },
  textInputContainer: { backgroundColor: 'transparent' },
  textInput: {
    backgroundColor: 'transparent',
    color:     C.black,
    fontSize:  15,
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

function ServiceCard({ service, selected, onPress, cardWidth }) {
  return (
    <TouchableOpacity
      style={[s.card, selected && s.cardSelected, { width: cardWidth, margin: 6 }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={s.iconCircle}>
        <Text style={s.icon}>{service.icon}</Text>
      </View>
      <Text style={s.cardName}>{service.label}</Text>
      <Text style={s.cardDesc}>{service.description}</Text>
    </TouchableOpacity>
  );
}

function FareSliderBar({ ratio, setRatio }) {
  const trackW     = useRef(300);
  const startRatio = useRef(0);
  const [displayW, setDisplayW] = useState(300);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const pos = Math.max(0, Math.min(1, evt.nativeEvent.locationX / trackW.current));
        const r = (pos - 0.5) * 0.4;
        startRatio.current = r;
        setRatio(r);
      },
      onPanResponderMove: (_, gs) => {
        const r = Math.max(-0.2, Math.min(0.2,
          startRatio.current + (gs.dx / trackW.current) * 0.4));
        setRatio(r);
      },
    })
  ).current;

  const thumbPct = (ratio + 0.2) / 0.4;
  const thumbPx  = thumbPct * displayW;
  const TR = 11;

  return (
    <View
      onLayout={(e) => {
        trackW.current = e.nativeEvent.layout.width;
        setDisplayW(e.nativeEvent.layout.width);
      }}
      style={s.sliderWrap}
      {...panResponder.panHandlers}
    >
      <View style={s.sliderRail} />
      <View style={{
        position: 'absolute', left: 0, top: 20,
        height: 4, width: thumbPx,
        backgroundColor: C.yellow, borderRadius: 2,
      }} />
      <View style={{
        position: 'absolute',
        top: 11,
        left: Math.max(0, Math.min(displayW - TR * 2, thumbPx - TR)),
        width: TR * 2, height: TR * 2, borderRadius: TR,
        backgroundColor: C.yellow,
        borderWidth: 3, borderColor: C.white,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
      }} />
    </View>
  );
}

const ESTADO_LABELS = {
  pendiente:   'Buscando conductor',
  negociando:  'Negociando',
  confirmado:  'Confirmado',
  en_camino:   'Conductor en camino',
  en_servicio: 'En curso',
  completado:  'Completado',
  cancelado:   'Cancelado',
};
const ESTADO_COLORS = {
  pendiente:   '#888888',
  negociando:  '#F4C400',
  confirmado:  '#22C55E',
  en_camino:   '#3B82F6',
  en_servicio: '#3B82F6',
  completado:  '#22C55E',
  cancelado:   '#FF3B30',
};
const ACTIVE_STATES = ['confirmado', 'en_camino', 'en_servicio'];

export default function HomeScreen({ navigate }) {
  const [selected, setSelected]       = useState('');
  const [origin, setOrigin]           = useState({ text: '', lat: null, lng: null });
  const [dest, setDest]               = useState({ text: '', lat: null, lng: null });
  const [gpsLoading, setGpsLoading]   = useState(false);
  const [fareInfo, setFareInfo]       = useState(null);
  const [fareLoading, setFareLoading] = useState(false);
  const [fareRatio, setFareRatio]     = useState(0);
  const originRef = useRef(null);
  const uuidRef   = useRef('');

  const [activeTab,        setActiveTab]        = useState('home');
  const [historial,        setHistorial]        = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [perfil,           setPerfil]           = useState(null);

  useEffect(() => {
    getUserUuid().then(id => { if (id) uuidRef.current = id; });
  }, []);

  useEffect(() => {
    if (activeTab === 'viajes' || activeTab === 'mensajes') fetchHistorial();
    if (activeTab === 'cuenta') fetchPerfil();
  }, [activeTab]);

  const fetchHistorial = async () => {
    if (!uuidRef.current) return;
    setLoadingHistorial(true);
    try {
      const { data } = await servicesApi.historial(uuidRef.current);
      setHistorial(data.servicios || []);
    } catch {}
    setLoadingHistorial(false);
  };

  const fetchPerfil = async () => {
    if (!uuidRef.current || perfil) return;
    try {
      const { data } = await authApi.perfil(uuidRef.current);
      setPerfil(data);
    } catch {}
  };

  const handleLogout = async () => {
    await Promise.all([clearBackendToken(), clearPhone(), clearUserUuid()]);
    await auth().signOut();
    navigate('Login');
  };

  useEffect(() => {
    if (!origin.lat || !dest.lat || !selected) {
      setFareInfo(null);
      setFareRatio(0);
      return;
    }
    if (isNegotiable(selected)) {
      setFareInfo(null);
      setFareRatio(0);
      setFareLoading(false);
      return;
    }
    let cancelled = false;
    setFareLoading(true);
    setFareInfo(null);
    setFareRatio(0);
    getDirections(origin.lat, origin.lng, dest.lat, dest.lng)
      .then(({ km, minutes }) => {
        if (cancelled) return;
        setFareInfo({ km, minutes, base: calcFare(km, minutes, selected) });
        setFareLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setFareLoading(false);
      });
    return () => { cancelled = true; };
  }, [origin.lat, dest.lat, selected]);

  const adjusted = fareInfo ? Math.round(fareInfo.base * (1 + fareRatio)) : null;
  const pctLabel = fareRatio === 0 ? 'Base' : `${fareRatio > 0 ? '+' : ''}${Math.round(fareRatio * 100)}%`;

  const ready =
    selected.length > 0 &&
    origin.lat !== null &&
    dest.lat   !== null &&
    (isNegotiable(selected) || fareInfo !== null);

  const handleGps = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Activa los permisos de ubicación en Configuración.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = loc.coords;
      const [addr] = await Location.reverseGeocodeAsync({ latitude, longitude });
      const text = [addr.street, addr.streetNumber, addr.city].filter(Boolean).join(' ');
      originRef.current?.setAddressText(text);
      setOrigin({ text: text || 'Ubicación actual', lat: latitude, lng: longitude });
    } catch {
      Alert.alert('Error', 'No se pudo obtener tu ubicación.');
    } finally {
      setGpsLoading(false);
    }
  };

  const handleBuscar = () => {
    if (!ready) return;
    navigate('Request', {
      serviceId: selected,
      origin,
      dest,
      fareInfo: fareInfo ? { ...fareInfo, adjusted } : null,
    });
  };

  const firstFour = SERVICES.slice(0, 4);
  const lastOne   = SERVICES[4];

  const showFareArea = selected.length > 0 && origin.lat !== null && dest.lat !== null;

  return (
    <View style={s.root}>
      <StatusBar backgroundColor={C.white} barStyle="dark-content" />

      {activeTab === 'home' && <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        nestedScrollEnabled={false}
      >
        {/* Header */}
        <View style={s.header}>
          <Image
            source={require('../../assets/logo.png')}
            style={s.logo}
            resizeMode="contain"
          />
          <Text style={s.city}>Manizales 📍</Text>
        </View>

        {/* Título + subtítulo */}
        <Text style={s.heading}>¿A dónde vamos?</Text>
        <Text style={s.subtitle}>Elige tu servicio y punto de destino</Text>

        {/* Card de ruta */}
        <View style={s.routeCard}>
          <View style={s.inputRow}>
            <View style={s.dotYellow} />
            <View style={s.autocompleteWrap}>
              <GooglePlacesAutocomplete
                ref={originRef}
                placeholder="¿Desde dónde?"
                fetchDetails
                onPress={(data, details) => {
                  const loc = details?.geometry?.location;
                  setOrigin({ text: data.description, lat: loc?.lat ?? null, lng: loc?.lng ?? null });
                }}
                query={placesQuery}
                styles={placesStyles}
                enablePoweredByContainer={false}
                textInputProps={{ placeholderTextColor: '#BBBBBB' }}
                keepResultsAfterBlur={false}
              />
            </View>
            <TouchableOpacity style={s.gpsBtn} onPress={handleGps} activeOpacity={0.7}>
              {gpsLoading
                ? <ActivityIndicator size="small" color={C.yellow} />
                : <Text style={s.gpsTxt}>📍</Text>
              }
            </TouchableOpacity>
          </View>

          <View style={s.divider} />

          <View style={s.inputRow}>
            <View style={s.dotBlack} />
            <View style={s.autocompleteWrap}>
              <GooglePlacesAutocomplete
                placeholder="¿A dónde?"
                fetchDetails
                onPress={(data, details) => {
                  const loc = details?.geometry?.location;
                  setDest({ text: data.description, lat: loc?.lat ?? null, lng: loc?.lng ?? null });
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

        {/* Sección servicios */}
        <Text style={s.sectionLabel}>Elige tu servicio</Text>

        <View style={s.grid}>
          {firstFour.map((srv) => (
            <ServiceCard
              key={srv.id}
              service={srv}
              selected={selected === srv.id}
              onPress={() => setSelected(srv.id)}
              cardWidth={CARD_W}
            />
          ))}
        </View>

        {lastOne && (
          <View style={s.gridCenter}>
            <ServiceCard
              service={lastOne}
              selected={selected === lastOne.id}
              onPress={() => setSelected(lastOne.id)}
              cardWidth={CARD_W}
            />
          </View>
        )}

        {/* Tarifa calculada */}
        {showFareArea && (
          fareLoading ? (
            <View style={s.fareCard}>
              <ActivityIndicator color={C.yellow} size="small" />
              <Text style={s.fareLoadingTxt}>Calculando tarifa...</Text>
            </View>
          ) : isNegotiable(selected) ? (
            <View style={s.fareCard}>
              <Text style={s.fareNegIcon}>💬</Text>
              <Text style={s.fareNegTxt}>Precio libre — negocia directamente con el conductor</Text>
            </View>
          ) : fareInfo ? (
            <View style={s.fareCard}>
              <View style={s.fareTop}>
                <View>
                  <Text style={s.fareLbl}>TARIFA ESTIMADA</Text>
                  <Text style={s.farePrice}>${fmtCOP(adjusted)}</Text>
                  <Text style={s.fareBreak}>
                    {fareInfo.km.toFixed(1)}km · {fareInfo.minutes}min
                  </Text>
                </View>
                <View style={s.fareBadge}>
                  <Text style={s.fareBadgeTxt}>{pctLabel}</Text>
                </View>
              </View>
              <FareSliderBar ratio={fareRatio} setRatio={setFareRatio} />
              <View style={s.fareSliderLabels}>
                <Text style={s.fareSliderLbl}>−20%</Text>
                <Text style={s.fareSliderLbl}>+20%</Text>
              </View>
            </View>
          ) : null
        )}

        {/* Botón */}
        <TouchableOpacity
          style={ready ? s.btnOn : s.btnOff}
          onPress={handleBuscar}
          activeOpacity={0.85}
        >
          <Text style={ready ? s.btnTxtOn : s.btnTxtOff}>
            {ready ? '🔍  BUSCAR CONDUCTOR' : 'BUSCAR CONDUCTOR'}
          </Text>
        </TouchableOpacity>
      </ScrollView>}

      {activeTab === 'viajes' && (
        <ScrollView style={s.scroll} contentContainerStyle={s.tabContent} showsVerticalScrollIndicator={false}>
          <Text style={s.tabTitle}>Mis viajes</Text>
          {loadingHistorial
            ? <ActivityIndicator color={C.yellow} style={{ marginTop: 40 }} />
            : historial.length === 0
              ? (
                <View style={s.emptyTab}>
                  <Text style={s.emptyTabIcon}>🏍️</Text>
                  <Text style={s.emptyTabTxt}>Aún no tienes viajes</Text>
                </View>
              )
              : historial.map((srv) => {
                  const svc      = SERVICES.find(x => x.id === srv.tipo_servicio);
                  const color    = ESTADO_COLORS[srv.estado] || '#888888';
                  const label    = ESTADO_LABELS[srv.estado]  || srv.estado;
                  const precio   = srv.precio_final || srv.precio_propuesto;
                  const isActive = ACTIVE_STATES.includes(srv.estado);
                  return (
                    <TouchableOpacity
                      key={srv.id}
                      style={s.histCard}
                      activeOpacity={isActive ? 0.7 : 1}
                      onPress={() => {
                        if (!isActive) return;
                        navigate('ViajeEnCurso', {
                          serviceDbId:       srv.id,
                          conductorId:       srv.conductor_id || '',
                          conductorNombre:   'Conductor',
                          conductorVehiculo: srv.tipo_servicio,
                          precioAceptado:    precio,
                          destDir:           srv.destino_direccion || '',
                          destLat:           srv.destino_lat,
                          destLng:           srv.destino_lng,
                        });
                      }}
                    >
                      <View style={s.histIconWrap}>
                        <Text style={s.histIcon}>{svc ? svc.icon : '🚗'}</Text>
                      </View>
                      <View style={s.histInfo}>
                        <Text style={s.histDest} numberOfLines={1}>{srv.destino_direccion || '—'}</Text>
                        <Text style={s.histOrigen} numberOfLines={1}>{srv.origen_direccion || ''}</Text>
                      </View>
                      <View style={s.histRight}>
                        <Text style={s.histPrecio}>${Number(precio).toLocaleString('es-CO')}</Text>
                        <View style={[s.histBadge, { backgroundColor: color + '22' }]}>
                          <Text style={[s.histBadgeTxt, { color }]}>{label}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
          }
        </ScrollView>
      )}

      {activeTab === 'mensajes' && (
        <ScrollView style={s.scroll} contentContainerStyle={s.tabContent} showsVerticalScrollIndicator={false}>
          <Text style={s.tabTitle}>Mensajes</Text>
          {loadingHistorial
            ? <ActivityIndicator color={C.yellow} style={{ marginTop: 40 }} />
            : (() => {
                const conChat = historial.filter(srv =>
                  ['confirmado', 'en_camino', 'en_servicio'].includes(srv.estado) && srv.conductor_id
                );
                if (conChat.length === 0) return (
                  <View style={s.emptyTab}>
                    <Text style={s.emptyTabIcon}>💬</Text>
                    <Text style={s.emptyTabTxt}>No tienes conversaciones activas</Text>
                  </View>
                );
                return conChat.map(srv => {
                  const svc = SERVICES.find(x => x.id === srv.tipo_servicio);
                  return (
                    <TouchableOpacity
                      key={srv.id}
                      style={s.histCard}
                      activeOpacity={0.7}
                      onPress={() => navigate('Chat', {
                        serviceDbId:     srv.id,
                        conductorNombre: 'Conductor',
                      })}
                    >
                      <View style={s.histIconWrap}>
                        <Text style={s.histIcon}>{svc ? svc.icon : '🚗'}</Text>
                      </View>
                      <View style={s.histInfo}>
                        <Text style={s.histDest} numberOfLines={1}>Chat — {svc?.label || srv.tipo_servicio}</Text>
                        <Text style={s.histOrigen} numberOfLines={1}>{srv.destino_direccion || ''}</Text>
                      </View>
                      <Text style={s.chatArrow}>→</Text>
                    </TouchableOpacity>
                  );
                });
              })()
          }
        </ScrollView>
      )}

      {activeTab === 'cuenta' && (
        <ScrollView style={s.scroll} contentContainerStyle={s.tabContent} showsVerticalScrollIndicator={false}>
          <Text style={s.tabTitle}>Mi cuenta</Text>
          <View style={s.avatarWrap}>
            <View style={s.avatar}>
              <Text style={s.avatarTxt}>
                {(perfil?.nombre || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={s.cuentaNombre}>{perfil?.nombre || 'Usuario'}</Text>
            {perfil?.telefono ? <Text style={s.cuentaPhone}>{perfil.telefono}</Text> : null}
          </View>
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Text style={s.logoutTxt}>CERRAR SESIÓN</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Barra de navegación inferior */}
      <View style={s.bottomNav}>
        <TouchableOpacity style={s.navItem} onPress={() => setActiveTab('home')} activeOpacity={0.7}>
          <Text style={activeTab === 'home' ? s.navIconActive : s.navIcon}>⌂</Text>
          <Text style={activeTab === 'home' ? s.navLabelActive : s.navLabel}>Inicio</Text>
          {activeTab === 'home' && <View style={s.navActiveDot} />}
        </TouchableOpacity>
        <TouchableOpacity style={s.navItem} onPress={() => setActiveTab('viajes')} activeOpacity={0.7}>
          <Text style={activeTab === 'viajes' ? s.navIconActive : s.navIcon}>🚗</Text>
          <Text style={activeTab === 'viajes' ? s.navLabelActive : s.navLabel}>Viajes</Text>
          {activeTab === 'viajes' && <View style={s.navActiveDot} />}
        </TouchableOpacity>
        <TouchableOpacity style={s.navItem} onPress={() => setActiveTab('mensajes')} activeOpacity={0.7}>
          <Text style={activeTab === 'mensajes' ? s.navIconActive : s.navIcon}>✉</Text>
          <Text style={activeTab === 'mensajes' ? s.navLabelActive : s.navLabel}>Mensajes</Text>
          {activeTab === 'mensajes' && <View style={s.navActiveDot} />}
        </TouchableOpacity>
        <TouchableOpacity style={s.navItem} onPress={() => setActiveTab('cuenta')} activeOpacity={0.7}>
          <Text style={activeTab === 'cuenta' ? s.navIconActive : s.navIcon}>◎</Text>
          <Text style={activeTab === 'cuenta' ? s.navLabelActive : s.navLabel}>Cuenta</Text>
          {activeTab === 'cuenta' && <View style={s.navActiveDot} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.white },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 52 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  logo:   { height: 32, width: 120 },
  city:   { color: C.grayLight, fontSize: 13, fontWeight: '500' },

  heading:  { color: C.black, fontSize: 30, fontWeight: '800', marginBottom: 4, letterSpacing: -0.5 },
  subtitle: { color: C.grayLight, fontSize: 13, marginBottom: 20 },

  routeCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 2,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: C.grayBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  inputRow:         { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6 },
  dotYellow:        { width: 12, height: 12, borderRadius: 6, backgroundColor: C.yellow, marginRight: 12, marginTop: 14 },
  dotBlack:         { width: 12, height: 12, borderRadius: 6, backgroundColor: C.black,  marginRight: 12, marginTop: 14 },
  autocompleteWrap: { flex: 1 },
  gpsBtn:           { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  gpsTxt:           { fontSize: 18 },
  divider:          { height: 1, backgroundColor: C.grayBorder, marginLeft: 24, marginRight: 4 },

  sectionLabel: { color: C.grayLight, fontSize: 12, fontWeight: '600', marginBottom: 12 },
  grid:         { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6, marginBottom: 4 },
  gridCenter:   { alignItems: 'center', marginBottom: 16 },

  card: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.grayBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  cardSelected: { borderColor: C.yellow, borderWidth: 2 },
  iconCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.yellowLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  icon:     { fontSize: 26 },
  cardName: { color: C.black, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  cardDesc: { color: C.grayLight, fontSize: 11, textAlign: 'center' },

  /* Fare card */
  fareCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: C.yellow,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
  },
  fareLoadingTxt: { color: C.grayLight, fontSize: 13, marginTop: 8 },
  fareNegIcon:    { fontSize: 22, marginBottom: 6 },
  fareNegTxt:     { color: C.grayLight, fontSize: 13, textAlign: 'center' },

  fareTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', marginBottom: 16 },
  fareLbl:  { color: C.grayLight, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 4 },
  farePrice:{ color: C.black, fontSize: 32, fontWeight: '800' },
  fareBreak:{ color: C.grayLight, fontSize: 12, marginTop: 2 },
  fareBadge:{ backgroundColor: C.yellowLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  fareBadgeTxt: { color: C.black, fontSize: 13, fontWeight: '700' },

  sliderWrap: { height: 44, justifyContent: 'center', width: '100%' },
  sliderRail: { height: 4, backgroundColor: C.grayBorder, borderRadius: 2 },

  fareSliderLabels: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 6 },
  fareSliderLbl:    { color: C.grayLight, fontSize: 11 },

  /* Botón */
  btnOn:     { backgroundColor: C.yellow, borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginBottom: 8 },
  btnOff:    { backgroundColor: C.grayBg, borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginBottom: 8 },
  btnTxtOn:  { color: C.black,     fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  btnTxtOff: { color: C.grayLight, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },

  /* Nav inferior */
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.grayBorder,
    paddingBottom: 28,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 8,
  },
  navItem:        { flex: 1, alignItems: 'center' },
  navIconActive:  { fontSize: 20, color: C.yellow, marginBottom: 2 },
  navLabelActive: { fontSize: 11, color: C.black, fontWeight: '700' },
  navActiveDot:   { width: 4, height: 4, borderRadius: 2, backgroundColor: C.yellow, marginTop: 3 },
  navIcon:        { fontSize: 20, color: C.grayLight, marginBottom: 2 },
  navLabel:       { fontSize: 11, color: C.grayLight, fontWeight: '500' },

  /* Tab views */
  tabContent:  { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 32 },
  tabTitle:    { color: C.black, fontSize: 28, fontWeight: '800', marginBottom: 20 },
  emptyTab:    { alignItems: 'center', paddingTop: 60 },
  emptyTabIcon:{ fontSize: 44, marginBottom: 12 },
  emptyTabTxt: { color: C.grayLight, fontSize: 15 },

  histCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.grayBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  histIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.yellowLight,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  histIcon:    { fontSize: 20 },
  histInfo:    { flex: 1 },
  histDest:    { color: C.black,     fontSize: 14, fontWeight: '600', marginBottom: 2 },
  histOrigen:  { color: C.grayLight, fontSize: 12 },
  histRight:   { alignItems: 'flex-end', marginLeft: 8 },
  histPrecio:  { color: C.black, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  histBadge:   { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  histBadgeTxt:{ fontSize: 10, fontWeight: '700' },
  chatArrow:   { color: C.yellow, fontSize: 18, fontWeight: '700', marginLeft: 8 },

  avatarWrap:   { alignItems: 'center', paddingTop: 20, marginBottom: 40 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.yellow,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  avatarTxt:    { color: C.black, fontSize: 36, fontWeight: '800' },
  cuentaNombre: { color: C.black,     fontSize: 22, fontWeight: '700', marginBottom: 4 },
  cuentaPhone:  { color: C.grayLight, fontSize: 15 },

  logoutBtn: {
    marginHorizontal: 32,
    borderWidth: 1.5,
    borderColor: '#FF3B30',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  logoutTxt: { color: '#FF3B30', fontSize: 15, fontWeight: '700', letterSpacing: 1 },
});

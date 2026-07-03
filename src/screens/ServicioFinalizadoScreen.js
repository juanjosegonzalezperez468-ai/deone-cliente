import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Animated, ActivityIndicator, BackHandler, Alert,
} from 'react-native';
import { ratingsApi } from '../api/client';

const C = {
  bg:     '#F8F8F8',
  white:  '#FFFFFF',
  black:  '#111111',
  yellow: '#FFC400',
  gray:   '#757575',
  border: '#EEEEEE',
  green:  '#22C55E',
};

const SHADOW = {
  shadowColor:   '#000',
  shadowOffset:  { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius:  8,
  elevation:     4,
};

export default function ServicioFinalizadoScreen({ params, goBack }) {
  const {
    precioFinal     = 0,
    serviceDbId     = '',
    conductorId     = '',
    conductorNombre = 'Conductor',
  } = params;

  const [rating, setRating]         = useState(5);
  const [enviado, setEnviado]       = useState(false);
  const [loadingEnvio, setLoadingEnvio] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue:  1,
      tension:  55,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  // Botón físico/gesto "atrás" de Android: igual que "VOLVER AL INICIO"
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });
    return () => sub.remove();
  }, []);

  const handleEnviarCalificacion = async () => {
    if (loadingEnvio || enviado) return;
    setLoadingEnvio(true);
    try {
      await ratingsApi.enviar({
        service_id:   serviceDbId,
        conductor_id: conductorId,
        calificacion: rating,
        comentario:   '',
      });
      setEnviado(true);
    } catch (e) {
      Alert.alert(
        'No se pudo enviar la calificación',
        e?.friendlyMessage || 'Intenta de nuevo en unos segundos.',
      );
    } finally {
      setLoadingEnvio(false);
    }
  };

  return (
    <View style={s.root}>
      <StatusBar backgroundColor={C.bg} barStyle="dark-content" />

      {/* Confetti decorativo */}
      <View style={s.confettiWrap} pointerEvents="none">
        <Text style={s.conf1}>🎉</Text>
        <Text style={s.conf2}>✨</Text>
        <Text style={s.conf3}>🎊</Text>
        <Text style={s.conf4}>⭐</Text>
      </View>

      {/* Contenido central */}
      <View style={s.content}>

        {/* Check animado */}
        <Animated.View style={[s.checkCircle, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={s.checkIcon}>✓</Text>
        </Animated.View>

        <Text style={s.title}>¡Gracias por viajar{'\n'}con DEONE!</Text>
        <Text style={s.sub}>Tu viaje finalizó exitosamente</Text>

        {/* Total pagado */}
        <View style={s.totalCard}>
          <Text style={s.totalLbl}>TOTAL PAGADO</Text>
          <Text style={s.totalVal}>${Number(precioFinal).toLocaleString('es-CO')} COP</Text>
        </View>

        {/* Calificación */}
        <Text style={s.rateTitle}>Califica a {conductorNombre.split(' ')[0]}</Text>
        <View style={s.starsRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <TouchableOpacity
              key={n}
              onPress={() => !enviado && setRating(n)}
              activeOpacity={0.7}
            >
              <Text style={n <= rating ? s.starOn : s.starOff}>★</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Botón enviar */}
        {!enviado ? (
          <TouchableOpacity
            style={loadingEnvio ? s.btnEnviarDis : s.btnEnviar}
            onPress={handleEnviarCalificacion}
            activeOpacity={0.85}
          >
            {loadingEnvio
              ? <ActivityIndicator color={C.black} size="small" />
              : <Text style={s.btnEnviarTxt}>ENVIAR CALIFICACIÓN</Text>
            }
          </TouchableOpacity>
        ) : (
          <View style={s.enviadoCard}>
            <Text style={s.enviadoTxt}>✓ ¡Calificación enviada!</Text>
          </View>
        )}

      </View>

      {/* Botón volver */}
      <View style={s.bottom}>
        <TouchableOpacity style={s.btnVolver} onPress={goBack} activeOpacity={0.85}>
          <Text style={s.btnVolverTxt}>VOLVER AL INICIO</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  /* Confetti */
  confettiWrap: { position: 'absolute', top: 0, left: 0, right: 0 },
  conf1: { position: 'absolute', top: 60,  left:  '8%',  fontSize: 28 },
  conf2: { position: 'absolute', top: 90,  left:  '22%', fontSize: 26 },
  conf3: { position: 'absolute', top: 50,  right: '10%', fontSize: 28 },
  conf4: { position: 'absolute', top: 130, right: '28%', fontSize: 24 },

  /* Content */
  content: {
    flex:             1,
    alignItems:       'center',
    justifyContent:   'center',
    paddingHorizontal: 28,
  },

  checkCircle: {
    width:           96,
    height:          96,
    borderRadius:    48,
    backgroundColor: C.yellow,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    24,
    shadowColor:     C.yellow,
    shadowOffset:    { width: 0, height: 6 },
    shadowOpacity:   0.4,
    shadowRadius:    14,
    elevation:       8,
  },
  checkIcon: { color: C.black, fontSize: 50, fontWeight: '900', lineHeight: 56 },

  title: {
    color:       C.black,
    fontSize:    26,
    fontWeight:  '800',
    textAlign:   'center',
    lineHeight:  34,
    marginBottom: 8,
  },
  sub: {
    color:        C.gray,
    fontSize:     14,
    textAlign:    'center',
    marginBottom: 24,
  },

  totalCard: {
    backgroundColor: C.white,
    borderRadius:    20,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems:      'center',
    marginBottom:    24,
    width:           '100%',
    ...SHADOW,
  },
  totalLbl: { color: C.gray, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 6 },
  totalVal: { color: C.black, fontSize: 32, fontWeight: '800' },

  rateTitle: { color: C.black, fontSize: 15, fontWeight: '600', marginBottom: 12 },
  starsRow:  { flexDirection: 'row', gap: 4, marginBottom: 20 },
  starOn:    { fontSize: 38, color: C.yellow },
  starOff:   { fontSize: 38, color: C.border },

  btnEnviar: {
    backgroundColor:  C.yellow,
    borderRadius:     18,
    paddingVertical:  16,
    paddingHorizontal: 36,
    alignItems:       'center',
    marginBottom:     4,
  },
  btnEnviarDis: {
    backgroundColor:  C.border,
    borderRadius:     18,
    paddingVertical:  16,
    paddingHorizontal: 36,
    alignItems:       'center',
    marginBottom:     4,
  },
  btnEnviarTxt: { color: C.black, fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },

  enviadoCard: {
    backgroundColor: '#DCFCE7',
    borderRadius:    14,
    paddingHorizontal: 20,
    paddingVertical:  10,
    marginBottom:    4,
  },
  enviadoTxt: { color: '#15803D', fontSize: 14, fontWeight: '700' },

  /* Bottom */
  bottom: {
    paddingHorizontal: 24,
    paddingBottom:     44,
  },
  btnVolver: {
    borderRadius:    18,
    paddingVertical: 16,
    alignItems:      'center',
    borderWidth:     1.5,
    borderColor:     C.border,
  },
  btnVolverTxt: { color: C.gray, fontSize: 15, fontWeight: '600', letterSpacing: 0.5 },
});

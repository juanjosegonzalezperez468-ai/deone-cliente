import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Animated,
} from 'react-native';

const C = {
  white: '#FFFFFF',
  black: '#111111',
  yellow: '#F4C400',
  grayLight: '#888888',
  grayBorder: '#EEEEEE',
};

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
};

export default function FinishedScreen({ params, goBack }) {
  const { offer = {}, precioPropuesto } = params;
  const precioFinal = offer.precioAceptado || precioPropuesto || 8000;

  const [rating, setRating] = useState(0);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={s.root}>
      <StatusBar backgroundColor={C.white} barStyle="dark-content" />

      {/* Confetti decorativo */}
      <View style={s.confettiWrap} pointerEvents="none">
        <Text style={[s.confetti, { top: 60,  left: '8%'  }]}>🎉</Text>
        <Text style={[s.confetti, { top: 90,  left: '22%' }]}>✨</Text>
        <Text style={[s.confetti, { top: 50,  right: '12%'}]}>🎊</Text>
        <Text style={[s.confetti, { top: 130, right: '28%'}]}>⭐</Text>
      </View>

      {/* Contenido central */}
      <View style={s.content}>
        <Animated.View style={[s.checkCircle, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={s.checkIcon}>✓</Text>
        </Animated.View>

        <Text style={s.title}>¡Gracias por viajar{'\n'}con DEONE!</Text>
        <Text style={s.sub}>Tu viaje ha finalizado exitosamente</Text>

        {/* Total pagado */}
        <View style={[s.totalCard, SHADOW]}>
          <Text style={s.totalLabel}>TOTAL PAGADO</Text>
          <Text style={s.totalValue}>${Number(precioFinal).toLocaleString('es-CO')} COP</Text>
        </View>

        {/* Calificación */}
        <Text style={s.rateTitle}>Califica tu experiencia</Text>
        <View style={s.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
              <Text style={star <= rating ? s.starOn : s.starOff}>★</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Links */}
        <TouchableOpacity style={s.linkBtn} activeOpacity={0.7}>
          <Text style={s.linkTxt}>Ver detalles del viaje</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.linkBtn} activeOpacity={0.7}>
          <Text style={s.linkTxt}>¿Necesitas ayuda?</Text>
        </TouchableOpacity>
      </View>

      {/* Botón volver */}
      <View style={s.bottomActions}>
        <TouchableOpacity style={s.homeBtn} onPress={goBack} activeOpacity={0.85}>
          <Text style={s.homeBtnTxt}>VOLVER AL INICIO</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.white },

  confettiWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  confetti:     { position: 'absolute', fontSize: 28 },

  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },

  checkCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: C.yellow,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 28,
    shadowColor: C.yellow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 6,
  },
  checkIcon: { color: C.black, fontSize: 52, fontWeight: '900', lineHeight: 60 },

  title: { color: C.black, fontSize: 26, fontWeight: '800', textAlign: 'center', lineHeight: 34, marginBottom: 8 },
  sub:   { color: C.grayLight, fontSize: 14, textAlign: 'center', marginBottom: 28 },

  totalCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: C.grayBorder,
    width: '100%',
  },
  totalLabel: { color: C.grayLight, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 6 },
  totalValue: { color: C.black, fontSize: 32, fontWeight: '800' },

  rateTitle: { color: C.black, fontSize: 15, fontWeight: '600', marginBottom: 14 },
  starsRow:  { flexDirection: 'row', gap: 6, marginBottom: 28 },
  starOn:    { fontSize: 38, color: C.yellow },
  starOff:   { fontSize: 38, color: C.grayBorder },

  linkBtn: { paddingVertical: 7 },
  linkTxt: { color: C.grayLight, fontSize: 14, textDecorationLine: 'underline' },

  bottomActions: { paddingHorizontal: 20, paddingBottom: 44 },
  homeBtn:       { backgroundColor: C.yellow, borderRadius: 18, paddingVertical: 18, alignItems: 'center' },
  homeBtnTxt:    { color: C.black, fontSize: 17, fontWeight: '700', letterSpacing: 1 },
});

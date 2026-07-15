import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, StatusBar, Alert, ActivityIndicator, Linking,
} from 'react-native';
import { billingApi } from '../api/client';
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
};

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
};

const MONTOS = [10000, 20000, 50000, 100000];
const WHATSAPP_SOPORTE = 'https://wa.me/573239420671';

const fmtCOP = (n) => Number(n || 0).toLocaleString('es-CO');

export default function RecargaSaldoScreen({ goBack }) {
  const [saldo, setSaldo]       = useState(null);
  const [monto, setMonto]       = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviada, setEnviada]   = useState(false);

  const cargarSaldo = async () => {
    try {
      const uuid = await getUserUuid();
      const { data } = await billingApi.saldo(uuid);
      const val = typeof data === 'object' ? data.saldo : data;
      if (typeof val === 'number') setSaldo(val);
    } catch {}
  };

  useEffect(() => { cargarSaldo(); }, []);

  const solicitar = async () => {
    const valor = Number(monto);
    if (!valor || valor < 5000) {
      Alert.alert('Monto inválido', 'La recarga mínima es de $5.000 COP.');
      return;
    }
    if (valor > 500000) {
      Alert.alert('Monto inválido', 'La recarga máxima es de $500.000 COP.');
      return;
    }
    if (enviando) return;
    setEnviando(true);
    try {
      await billingApi.solicitarRecarga(valor);
      setEnviada(true);
    } catch (e) {
      const detalle = e?.response?.data?.detail;
      Alert.alert(
        'No se pudo solicitar',
        typeof detalle === 'string' ? detalle : (e?.friendlyMessage || 'Intenta de nuevo.'),
      );
    }
    setEnviando(false);
  };

  return (
    <View style={s.root}>
      <StatusBar backgroundColor={C.white} barStyle="dark-content" />

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={goBack} activeOpacity={0.7}>
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Recargar saldo</Text>
        <View style={s.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Saldo actual */}
        <View style={s.saldoCard}>
          <Text style={s.saldoLbl}>TU SALDO</Text>
          {saldo === null
            ? <ActivityIndicator color={C.black} style={s.saldoLoading} />
            : <Text style={saldo < 0 ? s.saldoValNegativo : s.saldoVal}>${fmtCOP(saldo)}</Text>
          }
          {saldo !== null && saldo < 0 && (
            <Text style={s.saldoDeuda}>
              Tienes una deuda pendiente por cancelación de ruta. Recarga para poder publicar de nuevo.
            </Text>
          )}
          <Text style={s.saldoNota}>
            El saldo es la garantía para publicar rutas de entregas (20% del valor de la ruta).
            Solo se descuenta si cancelas una ruta ya aceptada.
          </Text>
        </View>

        {enviada ? (
          <View style={s.okCard}>
            <Text style={s.okIcon}>✅</Text>
            <Text style={s.okTitle}>Solicitud enviada</Text>
            <Text style={s.okSub}>
              Tu recarga de ${fmtCOP(Number(monto))} quedó pendiente de aprobación.
              Envía el comprobante de pago por WhatsApp para que el equipo Deone la apruebe.
            </Text>
            <TouchableOpacity
              style={s.waBtn}
              onPress={() => Linking.openURL(WHATSAPP_SOPORTE).catch(() => {})}
              activeOpacity={0.85}
            >
              <Text style={s.waBtnTxt}>ENVIAR COMPROBANTE POR WHATSAPP</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.volverBtn} onPress={goBack} activeOpacity={0.8}>
              <Text style={s.volverTxt}>VOLVER</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Monto */}
            <Text style={s.sectionLabel}>¿CUÁNTO QUIERES RECARGAR?</Text>
            <View style={s.montosRow}>
              {MONTOS.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={Number(monto) === m ? s.montoChipSel : s.montoChip}
                  onPress={() => setMonto(String(m))}
                  activeOpacity={0.8}
                >
                  <Text style={Number(monto) === m ? s.montoChipTxtSel : s.montoChipTxt}>
                    ${fmtCOP(m)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.montoInputRow}>
              <Text style={s.montoSym}>$</Text>
              <TextInput
                style={s.montoInput}
                placeholder="Otro monto"
                placeholderTextColor="#BBBBBB"
                keyboardType="numeric"
                maxLength={6}
                value={monto}
                onChangeText={(v) => setMonto(v.replace(/\D/g, ''))}
              />
              <Text style={s.montoCOP}>COP</Text>
            </View>

            <TouchableOpacity
              style={Number(monto) >= 5000 && !enviando ? s.solicitarBtn : s.solicitarBtnDis}
              onPress={solicitar}
              disabled={Number(monto) < 5000 || enviando}
              activeOpacity={0.85}
            >
              {enviando
                ? <ActivityIndicator color={C.black} size="small" />
                : <Text style={s.solicitarBtnTxt}>SOLICITAR RECARGA</Text>
              }
            </TouchableOpacity>

            <Text style={s.pasos}>
              1. Solicita la recarga aquí.{'\n'}
              2. Paga por Nequi o transferencia y envía el comprobante por WhatsApp.{'\n'}
              3. El equipo Deone aprueba tu recarga y el saldo queda disponible.
            </Text>
          </>
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
  },
  backBtn:      { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow:    { color: C.black, fontSize: 24, fontWeight: '700' },
  headerTitle:  { flex: 1, color: C.black, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  headerSpacer: { width: 40 },

  content: { paddingHorizontal: 20, paddingBottom: 48 },

  saldoCard: {
    backgroundColor: C.black,
    borderRadius:    22,
    padding:         20,
    marginBottom:    20,
  },
  saldoLbl:        { color: C.yellow, fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 6 },
  saldoVal:        { color: C.white, fontSize: 34, fontWeight: '800' },
  saldoValNegativo:{ color: C.red, fontSize: 34, fontWeight: '800' },
  saldoLoading:    { alignSelf: 'flex-start', marginVertical: 10 },
  saldoDeuda:      { color: '#FFB4B4', fontSize: 12, marginTop: 8, lineHeight: 17 },
  saldoNota:       { color: '#BBBBBB', fontSize: 11, marginTop: 10, lineHeight: 16 },

  sectionLabel: {
    color: C.grayLight, fontSize: 11, fontWeight: '700',
    letterSpacing: 1.5, marginBottom: 10,
  },

  montosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  montoChip: {
    backgroundColor:   C.grayBg,
    borderRadius:      14,
    paddingHorizontal: 16,
    paddingVertical:   12,
  },
  montoChipSel: {
    backgroundColor:   C.yellowLight,
    borderWidth:       1.5,
    borderColor:       C.yellow,
    borderRadius:      14,
    paddingHorizontal: 16,
    paddingVertical:   12,
  },
  montoChipTxt:    { color: C.black, fontSize: 14, fontWeight: '600' },
  montoChipTxtSel: { color: C.black, fontSize: 14, fontWeight: '800' },

  montoInputRow: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   C.grayBg,
    borderRadius:      16,
    paddingHorizontal: 16,
    marginBottom:      18,
  },
  montoSym:   { color: C.black, fontSize: 20, fontWeight: '800', marginRight: 6 },
  montoInput: { flex: 1, color: C.black, fontSize: 20, fontWeight: '800', paddingVertical: 14 },
  montoCOP:   { color: C.grayLight, fontSize: 13, fontWeight: '600' },

  solicitarBtn: {
    backgroundColor: C.yellow,
    borderRadius:    18,
    paddingVertical: 17,
    alignItems:      'center',
  },
  solicitarBtnDis: {
    backgroundColor: C.grayBorder,
    borderRadius:    18,
    paddingVertical: 17,
    alignItems:      'center',
  },
  solicitarBtnTxt: { color: C.black, fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },

  pasos: { color: C.grayLight, fontSize: 12, lineHeight: 20, marginTop: 18 },

  okCard:  { alignItems: 'center', paddingTop: 20 },
  okIcon:  { fontSize: 48, marginBottom: 14 },
  okTitle: { color: C.black, fontSize: 20, fontWeight: '800', marginBottom: 8 },
  okSub:   { color: C.grayLight, fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 22 },
  waBtn: {
    backgroundColor: '#25D366',
    borderRadius:    16,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems:      'center',
    alignSelf:       'stretch',
  },
  waBtnTxt:  { color: C.white, fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  volverBtn: { paddingVertical: 16, alignItems: 'center' },
  volverTxt: { color: C.yellow, fontSize: 14, fontWeight: '800', letterSpacing: 1.5 },
});

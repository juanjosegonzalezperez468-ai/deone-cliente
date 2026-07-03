import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { authApi } from '../api/client';
import { getUserUuid } from '../utils/tokenStorage';

const C = {
  bg:     '#F8F8F8',
  white:  '#FFFFFF',
  black:  '#111111',
  yellow: '#FFC400',
  gray:   '#757575',
  border: '#EEEEEE',
};

export default function TerminosScreen({ navigate }) {
  const [loading, setLoading]     = useState(false);
  const [leido,   setLeido]       = useState(false);
  const scrollRef                 = useRef(null);

  const handleScroll = ({ nativeEvent }) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const llegóAlFinal =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 40;
    if (llegóAlFinal) setLeido(true);
  };

  const handleAceptar = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const uuid = await getUserUuid();
      await authApi.aceptarTerminos(uuid);
      navigate('Home');
    } catch {
      Alert.alert('Error', 'No se pudo registrar tu aceptación. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <StatusBar backgroundColor={C.white} barStyle="dark-content" />

      <View style={s.header}>
        <Text style={s.titulo}>Términos y Privacidad</Text>
        <Text style={s.subtitulo}>Lee hasta el final para continuar</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={s.scroll}
        contentContainerStyle={s.content}
        onScroll={handleScroll}
        scrollEventThrottle={200}
        showsVerticalScrollIndicator
      >
        <Text style={s.seccion}>POLÍTICA DE PRIVACIDAD Y TÉRMINOS DE USO</Text>
        <Text style={s.fecha}>Última actualización: julio de 2026</Text>

        <Text style={s.parrafo}>
          DEONE es una plataforma tecnológica de intermediación entre usuarios que solicitan
          servicios de transporte y conductores independientes que ofrecen dichos servicios
          en las ciudades de Colombia donde DEONE opera. Al usar esta aplicación aceptas los
          siguientes términos.
        </Text>

        <Text style={s.titulo2}>1. DATOS QUE RECOLECTAMOS</Text>
        <Text style={s.parrafo}>
          Recolectamos la siguiente información para prestar el servicio:{'\n\n'}
          • Número de teléfono: para verificar tu identidad mediante código OTP.{'\n'}
          • Nombre: para identificarte dentro de la plataforma.{'\n'}
          • Ubicación en tiempo real: para calcular tu posición de origen, conectarte con
          conductores cercanos y mostrar el avance del recorrido.{'\n'}
          • Historial de viajes: para mostrarte tus servicios anteriores y calcular precios.
        </Text>

        <Text style={s.titulo2}>2. USO DE TUS DATOS</Text>
        <Text style={s.parrafo}>
          Tus datos se usan exclusivamente para:{'\n\n'}
          • Conectarte con conductores disponibles en tu zona.{'\n'}
          • Calcular tarifas y gestionar el pago del servicio.{'\n'}
          • Enviarte notificaciones sobre el estado de tu viaje.{'\n'}
          • Mejorar la seguridad y calidad de la plataforma.{'\n\n'}
          No vendemos, arrendamos ni compartimos tus datos personales con terceros con fines
          comerciales. Solo los compartimos con el conductor asignado a tu viaje (nombre y
          teléfono) y con proveedores técnicos necesarios para operar el servicio (Firebase
          de Google para autenticación y notificaciones, Supabase para almacenamiento de datos).
        </Text>

        <Text style={s.titulo2}>3. UBICACIÓN</Text>
        <Text style={s.parrafo}>
          La aplicación accede a tu ubicación mientras está en primer plano para detectar tu
          posición al solicitar un servicio y para mostrarte la distancia al conductor. No
          accedemos a tu ubicación en segundo plano. Puedes revocar este permiso en cualquier
          momento desde la configuración de tu dispositivo, aunque esto impedirá el uso de
          la app.
        </Text>

        <Text style={s.titulo2}>4. RETENCIÓN Y ELIMINACIÓN</Text>
        <Text style={s.parrafo}>
          Conservamos tus datos mientras mantengas una cuenta activa en DEONE. Puedes
          solicitar la eliminación de tu cuenta y sus datos asociados escribiendo a
          soporte@deone.co. Procederemos a la eliminación dentro de los 15 días hábiles
          siguientes a la solicitud.
        </Text>

        <Text style={s.titulo2}>5. DERECHOS DE LOS USUARIOS</Text>
        <Text style={s.parrafo}>
          De conformidad con la Ley 1581 de 2012 (Ley de Protección de Datos Personales de
          Colombia) tienes derecho a:{'\n\n'}
          • Conocer, actualizar y rectificar tus datos personales.{'\n'}
          • Solicitar prueba de la autorización otorgada.{'\n'}
          • Ser informado sobre el uso dado a tus datos.{'\n'}
          • Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) por
          infracciones a la ley.{'\n'}
          • Revocar la autorización y solicitar la supresión de tus datos cuando no se
          respeten los principios y derechos de la ley.
        </Text>

        <Text style={s.titulo2}>6. TÉRMINOS DEL SERVICIO</Text>
        <Text style={s.parrafo}>
          DEONE es una plataforma de intermediación tecnológica. Los conductores son
          personas independientes y DEONE no es responsable por los actos u omisiones de
          los conductores durante la prestación del servicio de transporte.{'\n\n'}
          El usuario acepta usar la plataforma únicamente para fines legales y conforme a
          estos términos. DEONE se reserva el derecho de suspender cuentas que violen estos
          términos, realicen fraudes o usen la plataforma de forma indebida.
        </Text>

        <Text style={s.titulo2}>7. MODIFICACIONES</Text>
        <Text style={s.parrafo}>
          DEONE puede actualizar esta política en cualquier momento. En caso de cambios
          sustanciales, te notificaremos dentro de la aplicación y solicitaremos una nueva
          aceptación.
        </Text>

        <Text style={s.titulo2}>8. CONTACTO</Text>
        <Text style={s.parrafo}>
          Para cualquier consulta sobre privacidad o datos personales escríbenos a:{'\n'}
          soporte@deone.co
        </Text>

        <View style={s.finalMarker}>
          <Text style={s.finalTxt}>— Fin del documento —</Text>
        </View>
      </ScrollView>

      <View style={s.footer}>
        {!leido && (
          <Text style={s.scrollHint}>Desplázate hasta el final para habilitar el botón</Text>
        )}
        <TouchableOpacity
          style={leido && !loading ? s.btnAceptar : s.btnDis}
          onPress={handleAceptar}
          activeOpacity={0.85}
          disabled={!leido || loading}
        >
          {loading
            ? <ActivityIndicator color={C.black} size="small" />
            : <Text style={s.btnTxt}>ACEPTO Y CONTINUAR</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.white },
  header: {
    paddingHorizontal: 24,
    paddingTop:        56,
    paddingBottom:     16,
    backgroundColor:   C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  titulo:    { fontSize: 22, fontWeight: '800', color: C.black, marginBottom: 4 },
  subtitulo: { fontSize: 13, color: C.gray },

  scroll:  { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 },

  seccion: {
    fontSize:     14,
    fontWeight:   '800',
    color:        C.black,
    letterSpacing: 0.5,
    marginBottom:  4,
    textAlign:    'center',
  },
  fecha: {
    fontSize:    12,
    color:       C.gray,
    textAlign:   'center',
    marginBottom: 20,
  },
  titulo2: {
    fontSize:    13,
    fontWeight:  '700',
    color:       C.black,
    marginTop:   20,
    marginBottom: 8,
  },
  parrafo: {
    fontSize:   13,
    color:      '#333333',
    lineHeight: 21,
  },
  finalMarker: {
    marginTop:  28,
    marginBottom: 8,
    alignItems: 'center',
  },
  finalTxt: { fontSize: 12, color: C.gray },

  footer: {
    paddingHorizontal: 20,
    paddingTop:        12,
    paddingBottom:     36,
    backgroundColor:   C.white,
    borderTopWidth:    1,
    borderTopColor:    C.border,
  },
  scrollHint: {
    fontSize:    12,
    color:       C.gray,
    textAlign:   'center',
    marginBottom: 10,
  },
  btnAceptar: {
    backgroundColor: C.yellow,
    borderRadius:    16,
    paddingVertical: 16,
    alignItems:      'center',
  },
  btnDis: {
    backgroundColor: C.border,
    borderRadius:    16,
    paddingVertical: 16,
    alignItems:      'center',
  },
  btnTxt: { color: C.black, fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
});

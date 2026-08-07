import React, { useEffect } from 'react';
import { View, Image, StyleSheet, StatusBar } from 'react-native';
import axios from 'axios';
import auth from '@react-native-firebase/auth';
import { API_URL } from '../constants/config';
import { getBackendToken, storeBackendToken, getPhone, getUserUuid, storeUserUuid } from '../utils/tokenStorage';
import { registrarNotificacionesPush } from '../utils/notifications';

// Estados en los que el cliente tiene algo en curso y hay que devolverlo a la
// pantalla correspondiente al reabrir la app.
//
// 'pendiente' y 'negociando' son tan activos como el resto: el cliente ya pidió
// el servicio y está esperando. Si no se contemplan, al reabrir la app aparece
// la pantalla de pedir un servicio nuevo mientras la solicitud sigue viva en el
// backend, sin forma de cancelarla desde ningún sitio.
const ACTIVE_STATES = ['pendiente', 'negociando', 'confirmado', 'en_camino', 'en_servicio'];

// A qué pantalla vuelve cada estado. 'negociando' también va a Waiting: esa
// pantalla ya consulta las ofertas en su primer ciclo y salta sola a 'Ofertas',
// así que no hace falta duplicar aquí esa lógica.
const PANTALLA_POR_ESTADO = {
  pendiente:   'Waiting',
  negociando:  'Waiting',
  confirmado:  'ConductorEnCamino',
  en_camino:   'ConductorEnCamino',
  en_servicio: 'ViajeEnCurso',
};

async function checkActiveTrip(uuid, jwt) {
  try {
    const { data } = await axios.get(
      `${API_URL}/services/cliente/${uuid}`,
      { headers: { Authorization: `Bearer ${jwt}` } },
    );
    const servicios = data.servicios || [];
    return servicios.find(s => ACTIVE_STATES.includes(s.estado)) || null;
  } catch {
    return null;
  }
}

export default function SplashScreen({ navigate }) {
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (user) => {
      if (!user) { navigate('Login'); return; }
      try {
        let uuid = await getUserUuid();
        let jwt  = await getBackendToken();

        let terminos_aceptados = true;

        if (!uuid || !jwt) {
          // Restore session silently
          const phone = await getPhone();
          if (!phone) { navigate('Login'); return; }
          const idToken = await user.getIdToken();
          const { data } = await axios.post(
            `${API_URL}/auth/verificar-otp`,
            { telefono: phone, token: idToken, tipo: 'cliente' },
            { headers: { 'Content-Type': 'application/json' } },
          );
          jwt  = data.token;
          uuid = data.usuario.id;
          terminos_aceptados = data.usuario.terminos_aceptados ?? true;
          await storeBackendToken(jwt);
          await storeUserUuid(uuid);
        }

        // No bloquea la navegación: el permiso de notificaciones puede tardar/mostrar diálogo
        registrarNotificacionesPush(uuid);

        if (!terminos_aceptados) {
          navigate('Terminos');
          return;
        }

        const activeTrip = await checkActiveTrip(uuid, jwt);
        if (activeTrip) {
          navigate(PANTALLA_POR_ESTADO[activeTrip.estado] || 'ViajeEnCurso', {
            serviceDbId:       activeTrip.id,
            // WaitingScreen los necesita: 'serviceId' para pintar el icono y el
            // nombre del servicio, 'precioPropuesto' para el resumen y para
            // pasárselo a la pantalla siguiente cuando aparezca conductor.
            serviceId:         activeTrip.tipo_servicio,
            precioPropuesto:   activeTrip.precio_propuesto,
            conductorId:       activeTrip.conductor_id || '',
            conductorNombre:   'Conductor',
            conductorVehiculo: activeTrip.tipo_servicio,
            precioAceptado:    activeTrip.precio_final || activeTrip.precio_propuesto,
            destDir:           activeTrip.destino_direccion || '',
            destLat:           activeTrip.destino_lat,
            destLng:           activeTrip.destino_lng,
            origenDir:         activeTrip.origen_direccion || '',
            origenLat:         activeTrip.origen_lat,
            origenLng:         activeTrip.origen_lng,
          });
          return;
        }

        navigate('Home');
      } catch {
        navigate('Login');
      }
    });
    return unsubscribe;
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Image
        source={require('../../assets/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 220,
    height: 220,
  },
});

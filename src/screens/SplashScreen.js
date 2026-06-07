import React, { useEffect } from 'react';
import { View, Image, StyleSheet, StatusBar } from 'react-native';
import axios from 'axios';
import auth from '@react-native-firebase/auth';
import { API_URL } from '../constants/config';
import { getBackendToken, storeBackendToken, getPhone, getUserUuid, storeUserUuid } from '../utils/tokenStorage';

const ACTIVE_STATES = ['confirmado', 'en_camino', 'en_servicio'];

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

        if (!uuid || !jwt) {
          // Restore session silently
          const phone = await getPhone();
          if (!phone) { navigate('Login'); return; }
          const idToken = await user.getIdToken();
          const { data } = await axios.post(
            `${API_URL}/auth/verificar-otp`,
            { telefono: phone, token: idToken, tipo: 'cliente', nombre: 'usuario' },
            { headers: { 'Content-Type': 'application/json' } },
          );
          jwt  = data.token;
          uuid = data.usuario.id;
          await storeBackendToken(jwt);
          await storeUserUuid(uuid);
        }

        const activeTrip = await checkActiveTrip(uuid, jwt);
        if (activeTrip) {
          const screen =
            activeTrip.estado === 'confirmado' ? 'ConductorEnCamino' :
            activeTrip.estado === 'en_camino'  ? 'ConductorEnCamino' :
            'ViajeEnCurso';
          navigate(screen, {
            serviceDbId:       activeTrip.id,
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

import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';

// Aviso previo al permiso de notificaciones, igual que el de ubicación
// (locationDisclosure.js): Google Play exige divulgación in-app inmediatamente
// antes del diálogo del sistema. Mismo patrón que en deone-conductor.
let avisoRechazadoEnSesion = false;
let solicitudEnCurso = null;

function mostrarAvisoNotificaciones() {
  return new Promise((resolve) => {
    Alert.alert(
      'Notificaciones de tus viajes',
      'Deone te envía notificaciones para avisarte de las ofertas de los ' +
        'conductores, el estado de tus viajes y los mensajes del conductor.',
      [
        { text: 'Ahora no',  style: 'cancel', onPress: () => resolve(false) },
        { text: 'Continuar', onPress: () => resolve(true) },
      ],
      { cancelable: false },
    );
  });
}

/**
 * Pide el permiso de notificaciones mostrando antes el aviso dentro de la
 * app. Si ya está concedido (o el sistema no permite volver a pedirlo) no
 * muestra nada, y si el usuario rechaza el aviso no se insiste en la sesión.
 * Llamadas simultáneas comparten una sola solicitud.
 */
export function solicitarNotificacionesConAviso() {
  if (!solicitudEnCurso) {
    solicitudEnCurso = (async () => {
      const actual = await Notifications.getPermissionsAsync();
      if (actual.granted || !actual.canAskAgain || avisoRechazadoEnSesion) {
        return actual;
      }
      const acepto = await mostrarAvisoNotificaciones();
      if (!acepto) {
        avisoRechazadoEnSesion = true;
        return actual;
      }
      return Notifications.requestPermissionsAsync();
    })().finally(() => { solicitudEnCurso = null; });
  }
  return solicitudEnCurso;
}

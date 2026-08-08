import React, { useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import crashlytics from '@react-native-firebase/crashlytics';
import SplashScreen             from './src/screens/SplashScreen';
import LoginScreen              from './src/screens/LoginScreen';
import OTPScreen                from './src/screens/OTPScreen';
import RegistroScreen           from './src/screens/RegistroScreen';
import HomeScreen               from './src/screens/HomeScreen';
import RequestScreen            from './src/screens/RequestScreen';
import WaitingScreen            from './src/screens/WaitingScreen';
import OfertasScreen            from './src/screens/OfertasScreen';
import ConductorEnCaminoScreen  from './src/screens/ConductorEnCaminoScreen';
import ViajeEnCursoScreen       from './src/screens/ViajeEnCursoScreen';
import ServicioFinalizadoScreen from './src/screens/ServicioFinalizadoScreen';
import ChatScreen               from './src/screens/ChatScreen';
import TerminosScreen           from './src/screens/TerminosScreen';
import CrearRutaScreen          from './src/screens/CrearRutaScreen';
import BuscandoRutaScreen       from './src/screens/BuscandoRutaScreen';
import RutaEnCursoScreen        from './src/screens/RutaEnCursoScreen';
import RutaFinalizadaScreen     from './src/screens/RutaFinalizadaScreen';
import MisRutasScreen           from './src/screens/MisRutasScreen';
import RecargaSaldoScreen       from './src/screens/RecargaSaldoScreen';
import SoporteScreen            from './src/screens/SoporteScreen';
import ErrorBoundary            from './src/components/ErrorBoundary';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Errores fuera del árbol de React (async/callbacks) — el ErrorBoundary no los ve
if (global.ErrorUtils) {
  const defaultHandler = global.ErrorUtils.getGlobalHandler();
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    try {
      crashlytics().recordError(error);
    } catch {}
    defaultHandler(error, isFatal);
  });
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router />
    </ErrorBoundary>
  );
}

function Router() {
  const [route, setRoute] = useState({ screen: 'Splash', params: {} });

  const navigate = (screenName, screenParams) => {
    setRoute({ screen: screenName, params: screenParams || {} });
  };

  const goBack = () => {
    setRoute({ screen: 'Home', params: {} });
  };

  // Tocar una notificación push navega a la pantalla relevante.
  // Para viajes, reusa la lógica de detección de viaje activo de SplashScreen
  // en vez de duplicar la construcción de parámetros (precio, conductor, etc.).
  useEffect(() => {
    const handleResponse = (response) => {
      const data = response?.notification?.request?.content?.data || {};
      // Notificaciones de rutas de reparto
      if (data.ruta_id) {
        if (data.screen === 'RutaEnCurso') {
          navigate('RutaEnCurso', { rutaId: data.ruta_id });
        } else if (data.screen === 'RutaFinalizada') {
          navigate('RutaFinalizada', { rutaId: data.ruta_id });
        } else if (data.screen === 'Chat') {
          navigate('Chat', { serviceDbId: data.ruta_id });
        } else {
          navigate('MisRutas');
        }
        return;
      }
      if (!data.service_id) return;
      if (data.screen === 'Chat') {
        navigate('Chat', { serviceDbId: data.service_id });
      } else {
        navigate('Splash');
      }
    };

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleResponse(response);
    });
    const sub = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => sub.remove();
  }, []);

  const { screen, params } = route;

  if (screen === 'Login')             return <LoginScreen              navigate={navigate} />;
  if (screen === 'OTP')               return <OTPScreen                params={params} navigate={navigate} />;
  if (screen === 'Registro')          return <RegistroScreen           params={params} navigate={navigate} />;
  if (screen === 'Request')           return <RequestScreen            params={params} navigate={navigate} goBack={goBack} />;
  if (screen === 'Waiting')           return <WaitingScreen            params={params} navigate={navigate} goBack={goBack} />;
  if (screen === 'Ofertas')           return <OfertasScreen            params={params} navigate={navigate} goBack={goBack} />;
  if (screen === 'ConductorEnCamino') return <ConductorEnCaminoScreen  params={params} navigate={navigate} goBack={goBack} />;
  if (screen === 'ViajeEnCurso')      return <ViajeEnCursoScreen       params={params} navigate={navigate} goBack={goBack} />;
  if (screen === 'ServicioFinalizado')return <ServicioFinalizadoScreen  params={params} goBack={goBack} />;
  if (screen === 'Chat')              return <ChatScreen                 params={params} goBack={goBack} />;
  if (screen === 'Terminos')          return <TerminosScreen             navigate={navigate} />;
  if (screen === 'CrearRuta')         return <CrearRutaScreen            params={params} navigate={navigate} goBack={goBack} />;
  if (screen === 'BuscandoRuta')      return <BuscandoRutaScreen         params={params} navigate={navigate} goBack={goBack} />;
  if (screen === 'RutaEnCurso')       return <RutaEnCursoScreen          params={params} navigate={navigate} goBack={goBack} />;
  if (screen === 'RutaFinalizada')    return <RutaFinalizadaScreen       params={params} goBack={goBack} />;
  if (screen === 'MisRutas')          return <MisRutasScreen             navigate={navigate} goBack={goBack} />;
  if (screen === 'RecargaSaldo')      return <RecargaSaldoScreen         goBack={goBack} />;
  if (screen === 'Soporte')           return <SoporteScreen              onBack={goBack} />;
  if (screen === 'Home')              return <HomeScreen               navigate={navigate} />;
  return <SplashScreen navigate={navigate} />;
}

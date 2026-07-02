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
  if (screen === 'Home')              return <HomeScreen               navigate={navigate} />;
  return <SplashScreen navigate={navigate} />;
}

import React, { useState } from 'react';
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

export default function App() {
  const [screen, setScreen] = useState('Splash');
  const [params, setParams] = useState({});

  const navigate = (screenName, screenParams) => {
    setParams(screenParams || {});
    setScreen(screenName);
  };

  const goBack = () => {
    setParams({});
    setScreen('Home');
  };

  if (screen === 'Login')             return <LoginScreen              navigate={navigate} />;
  if (screen === 'OTP')               return <OTPScreen                params={params} navigate={navigate} />;
  if (screen === 'Registro')          return <RegistroScreen           params={params} navigate={navigate} />;
  if (screen === 'Request')           return <RequestScreen            params={params} navigate={navigate} goBack={goBack} />;
  if (screen === 'Waiting')           return <WaitingScreen            params={params} navigate={navigate} goBack={goBack} />;
  if (screen === 'Ofertas')           return <OfertasScreen            params={params} navigate={navigate} goBack={goBack} />;
  if (screen === 'ConductorEnCamino') return <ConductorEnCaminoScreen  params={params} navigate={navigate} goBack={goBack} />;
  if (screen === 'ViajeEnCurso')      return <ViajeEnCursoScreen       params={params} navigate={navigate} goBack={goBack} />;
  if (screen === 'ServicioFinalizado')return <ServicioFinalizadoScreen  params={params} goBack={goBack} />;
  if (screen === 'Home')              return <HomeScreen               navigate={navigate} />;
  return <SplashScreen navigate={navigate} />;
}

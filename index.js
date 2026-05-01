// Bare RN entry point — required by metro in --dev-client mode.
// Expo's AppEntry.js does the same registration but it's wrapped in the
// expo-router/expo-go shell. With a custom native build (android/) we
// register the app component ourselves.
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);

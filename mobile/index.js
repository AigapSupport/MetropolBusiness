/**
 * RN giriş noktası — AppRegistry kaydı.
 * Native projeler (android/ios) eklendiğinde bu dosya değişmeden çalışır.
 * @format
 */
import { AppRegistry } from 'react-native';

import { name as appName } from './app.json';
import App from './src/App';

AppRegistry.registerComponent(appName, () => App);

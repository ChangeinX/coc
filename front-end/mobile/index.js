/**
 * Expo entry: register the root component as 'main'.
 * This ensures compatibility with Expo's virtual Metro entry.
 */
import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import App from './src/App';

registerRootComponent(App);
// pre-commit hook test: no-op change to trigger mobile checks

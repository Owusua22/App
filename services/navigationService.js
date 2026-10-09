// src/services/navigationService.js
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export const navigate = (name, params) => {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
};

export const goBack = () => {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
};

export const reset = (routeName) => {
  if (navigationRef.isReady()) {
    navigationRef.reset({
      index: 0,
      routes: [{ name: routeName }],
    });
  }
};

let pendingAuthRedirect = false;

// Pending redirect is important when expiry is detected during the welcome
// screen, before the stack navigator exists. onStateChange flushes it later.
export const flushAuthRedirect = () => {
  if (!pendingAuthRedirect || !navigationRef.isReady() || !navigationRef.getRootState()?.routes?.length) return;
  pendingAuthRedirect = false;
  navigationRef.reset({ index: 0, routes: [{ name: 'SignIn' }] });
};

export const requestAuthRedirect = () => {
  pendingAuthRedirect = true;
  flushAuthRedirect();
};

import { useCallback, useEffect, useRef } from "react";
import { useStore } from "react-redux";
import { hasValidToken } from "../redux/slice/customerSessionStorage";

// Used only for delayed login/password-update UI callbacks, not for storage.
// A callback must never continue an expired or replaced session.
export default function useModalSessionCompletion(visible = true) {
  const store = useStore();
  const timer = useRef(null);
  const visibleRef = useRef(visible);
  const mounted = useRef(false);
  visibleRef.current = visible;

  const cancelCompletion = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cancelCompletion();
    };
  }, [cancelCompletion]);

  useEffect(() => {
    if (!visible) cancelCompletion();
  }, [visible, cancelCompletion]);

  const getActiveCustomer = useCallback((contactNumber) => {
    const state = store.getState().customer;
    if (!state.isAuthenticated || !hasValidToken(state.currentCustomer)) return null;
    if (contactNumber != null &&
        String(state.currentCustomer.contactNumber) !== String(contactNumber)) return null;
    return state.currentCustomer;
  }, [store]);

  const scheduleCompletion = useCallback((callback, delay = 0) => {
    cancelCompletion();
    const customer = getActiveCustomer();
    if (!customer || !visibleRef.current || !mounted.current) return false;
    const version = store.getState().customer.sessionVersion;
    timer.current = setTimeout(() => {
      timer.current = null;
      const current = getActiveCustomer(customer.contactNumber);
      if (!mounted.current || !visibleRef.current || !current ||
          store.getState().customer.sessionVersion !== version) return;
      // Use current Redux data, not a customer object captured before logout/refresh.
      callback(current);
    }, delay);
    return true;
  }, [store, cancelCompletion, getActiveCustomer]);

  return { getActiveCustomer, scheduleCompletion, cancelCompletion };
}

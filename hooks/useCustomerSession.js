import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { useDispatch, useSelector, useStore } from "react-redux";
import { setSessionChangeHandler } from "../redux/slice/axiosInstance";
import {
  checkAuthStatus,
  logoutCustomer,
  sessionCustomerCleared,
  sessionCustomerUpdated,
  validateCustomerSession,
} from "../redux/slice/customerSlice";
import {
  getTokenExpiry,
  hasValidToken,
} from "../redux/slice/customerSessionStorage";

const MAX_EXPIRY_CHECK_MS = 60 * 1000;

export default function useCustomerSession() {
  const dispatch = useDispatch();
  const store = useStore();
  const session = useSelector((state) => state.customer);
  const [isChecking, setIsChecking] = useState(true);
  const [isForeground, setIsForeground] = useState(
    () => AppState.currentState === "active"
  );

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(
    () =>
      setSessionChangeHandler((customer) => {
        if (customer) dispatch(sessionCustomerUpdated(customer));
        else dispatch(sessionCustomerCleared());
      }),
    [dispatch]
  );

  useEffect(() => {
    let cancelled = false;
    let queue = Promise.resolve();

    const runCheck = (bootstrap) => {
      if (cancelled) return;
      if (AppState.currentState === "active") setIsChecking(true);
      queue = queue
        .then(() =>
          bootstrap
            ? dispatch(checkAuthStatus())
            : dispatch(validateCustomerSession())
        )
        .catch(() => {
          if (!cancelled && bootstrap) dispatch(logoutCustomer());
        })
        .finally(() => {
          if (!cancelled && AppState.currentState === "active") setIsChecking(false);
        });
    };

    runCheck(true);

    const subscription = AppState.addEventListener("change", (next) => {
      if (cancelled) return;
      if (next === "active") {
        setIsForeground(true);
        runCheck(false);
      } else {
        setIsForeground(false);
      }
    });

    const webTargets = [];

    if (Platform.OS === "web" && typeof document !== "undefined") {
      const onVisible = () => {
        if (cancelled) return;
        if (document.visibilityState === "visible") {
          setIsForeground(true);
          runCheck(false);
        } else {
          setIsForeground(false);
        }
      };
      document.addEventListener("visibilitychange", onVisible);
      webTargets.push(() => document.removeEventListener("visibilitychange", onVisible));

      if (typeof window !== "undefined") {
        const onFocus = () => runCheck(false);
        window.addEventListener("focus", onFocus);
        window.addEventListener("pageshow", onFocus);
        webTargets.push(() => {
          window.removeEventListener("focus", onFocus);
          window.removeEventListener("pageshow", onFocus);
        });
      }
    }

    return () => {
      cancelled = true;
      subscription.remove();
      webTargets.forEach((off) => off());
    };
  }, [dispatch]);

  const token = session.currentCustomer?.accessToken;
  const isAuthenticated = session.isAuthenticated;

  useEffect(() => {
    if (!isAuthenticated || !token) return undefined;
    const expiry = getTokenExpiry(token);
    if (expiry <= 0) return undefined;

    let timer = null;
    let cancelled = false;

    const schedule = () => {
      const remaining = expiry - Date.now();
      if (remaining <= 0) {
        dispatch(logoutCustomer());
        return;
      }
      timer = setTimeout(schedule, Math.min(remaining, MAX_EXPIRY_CHECK_MS));
    };

    const tick = () => {
      if (cancelled) return;
      const current = store.getState().customer;
      if (!current.isAuthenticated || current.currentCustomer?.accessToken !== token) {
        return;
      }
      schedule();
    };

    tick();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [dispatch, store, isAuthenticated, token]);

  const tokenExpired = useCallback(
    (customer) => isAuthenticated && !hasValidToken(customer),
    [isAuthenticated]
  );

  return {
    blocked:
      !isForeground ||
      isChecking ||
      !session.isAuthChecked ||
      tokenExpired(session.currentCustomer),
    cleanupError: session.sessionCleanupError,
  };
}

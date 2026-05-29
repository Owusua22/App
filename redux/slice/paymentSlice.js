// src/redux/slice/paymentSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "./axiosInstance";

/* ─── Constants ───────────────────────────────────────── */
const PSP = "fte";
const COMPANY_CODE = "fte";
const LAMBDA_TARGET = "payment";
const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;

/* ═══════════════════════════════════════════════════════
 *  RETRY UTILITY
 *  Only retries on HTTP-level failures (5xx).
 *    401  → never retry (auth error)
 *    5xx  → retry up to MAX_RETRY_ATTEMPTS
 *    else → throw immediately
 *
 *  IMPORTANT: We do NOT inspect response body content here.
 *  The gateway returns HTTP 200 for both success AND
 *  "submitted for processing" (code 03), so any body-level
 *  interpretation must happen in the UI layer.
 * ═══════════════════════════════════════════════════════ */
const executeWithRetry = async (requestFn, maxAttempts = MAX_RETRY_ATTEMPTS) => {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      const status = error.response?.status;

      // Hard-stop on auth errors
      if (status === 401) {
        const authErr = new Error(
          "Authentication failed. Please verify your credentials."
        );
        authErr.isAuthError = true;
        authErr.status = 401;
        authErr.response = error.response;
        throw authErr;
      }

      // Retry on 5xx
      const isRetryable = status >= 500 && status < 600;
      if (isRetryable && attempt < maxAttempts) {
        const delay = BASE_RETRY_DELAY * Math.pow(2, attempt - 1);
        console.warn(
          `[Payment] Attempt ${attempt}/${maxAttempts} failed (${status}). ` +
            `Retrying in ${delay}ms…`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      break; // Non-retryable or exhausted
    }
  }

  throw lastError;
};

/* ─── Error normaliser (mirrors web slice's toErrorPayload) ── */
const toErrorPayload = (error, fallback) => {
  const server =
    error.response?.data?.message ??
    error.response?.data?.responseMessage ??
    (typeof error.response?.data === "string" ? error.response.data : null);

  return {
    message: server || error.message || fallback,
    status: error.response?.status ?? error.status ?? null,
    isAuthError: error.isAuthError ?? error.response?.status === 401,
  };
};

/* ═══════════════════════════════════════════════════════
 *  ASYNC THUNKS
 *  All thunks return raw gateway data on HTTP success.
 *  The UI inspects responseCode to interpret the result.
 * ═══════════════════════════════════════════════════════ */

// 1️⃣ Validate Account
export const validateAccount = createAsyncThunk(
  "payment/validateAccount",
  async ({ msisdn, network }, { rejectWithValue }) => {
    try {
      const response = await executeWithRetry(() =>
        api.post(
          "/",
          { msisdn, network },
          {
            params: {
              endpoint: "/PaymentPrompt/ValidateAccount",
              target: LAMBDA_TARGET,
              PSP,
            },
          }
        )
      );
      return response.data; // raw – UI checks responseCode
    } catch (error) {
      return rejectWithValue(toErrorPayload(error, "Failed to validate account"));
    }
  }
);

// 2️⃣ Debit Customer
export const debitCustomer = createAsyncThunk(
  "payment/debitCustomer",
  async ({ refNo, msisdn, amount, network, narration }, { rejectWithValue }) => {
    try {
      const response = await executeWithRetry(() =>
        api.post(
          "/",
          { refNo, msisdn, amount, network, narration },
          {
            params: {
              endpoint: "/PaymentPrompt/DebitCustomer",
              target: LAMBDA_TARGET,
              PSP,
            },
          }
        )
      );
      return response.data; // raw – UI checks responseCode
    } catch (error) {
      return rejectWithValue(toErrorPayload(error, "Payment request failed"));
    }
  }
);

// 3️⃣ Check Transaction Status
export const checkTransactionStatus = createAsyncThunk(
  "payment/checkTransactionStatus",
  async ({ refNo }, { rejectWithValue }) => {
    try {
      const response = await executeWithRetry(() =>
        api.post(
          "/",
          { refNo },
          {
            params: {
              endpoint: "/PaymentPrompt/CheckTransactionStatus",
              target: LAMBDA_TARGET,
              PSP,
            },
          }
        )
      );
      return response.data; // raw
    } catch (error) {
      return rejectWithValue(
        toErrorPayload(error, "Failed to check transaction status")
      );
    }
  }
);

// 4️⃣ Debit by Customer Network Provider ID
export const debitByCustomerNetworkProviderId = createAsyncThunk(
  "payment/debitByCustomerNetworkProviderId",
  async (
    { transactionNumber, contactNumber, customerNetworkProviderId, amount },
    { rejectWithValue }
  ) => {
    try {
      const response = await executeWithRetry(() =>
        api.post(
          "/",
          {
            transactionNumber,
            contactNumber,
            customerNetworkProviderId,
            amountPaid: amount,
          },
          {
            params: {
              endpoint: "/PaymentPrompt/DebitbyCustomerNetworkProviderId",
              target: LAMBDA_TARGET,
              PSP,
            },
          }
        )
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        toErrorPayload(error, "Failed to debit by customer network provider")
      );
    }
  }
);

// 5️⃣ Get Account Hold Name
export const getAccountHoldName = createAsyncThunk(
  "payment/getAccountHoldName",
  async ({ msisdn, network }, { rejectWithValue }) => {
    try {
      const response = await executeWithRetry(() =>
        api.post(
          "/",
          { msisdn, network },
          {
            params: {
              endpoint: "/PaymentPrompt/AccountHoldName",
              target: LAMBDA_TARGET,
              PSP,
            },
          }
        )
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(toErrorPayload(error, "Failed to get account hold name"));
    }
  }
);

// 6️⃣ Get PSP Transactions By Company
export const getPSPTransactionsByCompany = createAsyncThunk(
  "payment/getPSPTransactionsByCompany",
  async ({ from, to }, { rejectWithValue }) => {
    try {
      const response = await executeWithRetry(() =>
        api.get("", {
          params: {
            endpoint: "/PSP/GetPSPTransactionsByCompany",
            target: LAMBDA_TARGET,
            from,
            to,
            CompanyCode: COMPANY_CODE,
          },
        })
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        toErrorPayload(error, "Failed to fetch PSP transactions report")
      );
    }
  }
);

// 7️⃣ Dispatch to All Networks
export const dispatchToAllNetworks = createAsyncThunk(
  "payment/dispatchToAllNetworks",
  async ({ paymentData, networks }, { dispatch, rejectWithValue }) => {
    try {
      const settled = await Promise.all(
        networks.map(async (network) => {
          const startTime = Date.now();
          try {
            const result = await dispatch(
              debitByCustomerNetworkProviderId({
                ...paymentData,
                customerNetworkProviderId: network.id,
              })
            ).unwrap();

            return {
              network: network.name,
              networkId: network.id,
              success: true,
              data: result,
              duration: Date.now() - startTime,
              timestamp: new Date().toISOString(),
            };
          } catch (err) {
            return {
              network: network.name,
              networkId: network.id,
              success: false,
              error: typeof err === "string" ? err : err?.message ?? "Failed",
              duration: Date.now() - startTime,
              timestamp: new Date().toISOString(),
            };
          }
        })
      );

      const successCount = settled.filter((r) => r.success).length;
      return {
        results: settled,
        summary: {
          total: settled.length,
          successful: successCount,
          failed: settled.length - successCount,
          completedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return rejectWithValue(
        toErrorPayload(error, "Network dispatch operation failed")
      );
    }
  }
);

/* ═══════════════════════════════════════════════════════
 *  INITIAL STATE
 *  Provides BOTH shapes:
 *    - flat booleans (web slice compat)
 *    - nested loading{} + step fields (checkout screen)
 * ═══════════════════════════════════════════════════════ */
const initialState = {
  // Data
  debitCustomerData: null,
  validateAccountData: null,
  transactionStatus: null,
  debitNetworkData: null,
  accountHoldName: null,
  pspTransactionsReport: null,
  networkDispatchData: null,

  // Granular loading (checkout screen reads these)
  loading: {
    validation: false,
    accountName: false,
    payment: false,
    statusCheck: false,
    networkDispatch: false,
  },

  // Flat booleans (web slice compat)
  validating: false,
  checkingStatus: false,

  // Error
  error: null,
  lastError: null,
  authError: false,

  // Flow steps
  validationStep: "idle",  // 'idle' | 'validating' | 'success' | 'failed'
  paymentStep: "idle",     // 'idle' | 'processing' | 'success' | 'failed'
  dispatchStep: "idle",    // 'idle' | 'dispatching' | 'completed' | 'partial' | 'failed'

  currentRefNo: null,
  retryAttempts: 0,
};

/* ═══════════════════════════════════════════════════════
 *  SLICE
 * ═══════════════════════════════════════════════════════ */
const paymentSlice = createSlice({
  name: "payment",
  initialState,

  reducers: {
    resetPaymentState: (state) => {
      Object.assign(state, {
        ...initialState,
        currentRefNo: generateRefNo(),
      });
    },

    resetPSPTransactionsReport: (state) => {
      state.pspTransactionsReport = null;
      state.error = null;
    },

    resetValidateAccountData: (state) => {
      state.validateAccountData = null;
      state.accountHoldName = null;
      state.validating = false;
      state.loading = { ...state.loading, validation: false, accountName: false };
      state.validationStep = "idle";
      state.error = null;
      state.authError = false;
    },

    resetTransactionStatus: (state) => {
      state.transactionStatus = null;
      state.checkingStatus = false;
      state.loading = { ...state.loading, statusCheck: false };
    },

    clearError: (state) => {
      state.error = null;
      state.authError = false;
    },

    /**
     * The UI calls this to mark validation success/failure based on
     * the responseCode it inspected. The slice itself never decides.
     */
    setValidationStep: (state, action) => {
      state.validationStep = action.payload;
      if (action.payload === "idle") {
        state.validateAccountData = null;
        state.accountHoldName = null;
        state.error = null;
        state.authError = false;
        state.loading = { ...state.loading, validation: false, accountName: false };
        state.validating = false;
      }
    },

    setPaymentStep: (state, action) => {
      state.paymentStep = action.payload;
    },

    generateNewRefNo: (state) => {
      state.currentRefNo = generateRefNo();
    },

    incrementRetryAttempts: (state) => {
      state.retryAttempts += 1;
    },

    resetRetryAttempts: (state) => {
      state.retryAttempts = 0;
    },
  },

  extraReducers: (builder) => {
    /* ── validateAccount ─────────────────────────────── */
    builder
      .addCase(validateAccount.pending, (state) => {
        state.loading = { ...state.loading, validation: true };
        state.validating = true;
        state.validationStep = "validating";
        state.validateAccountData = null;
        state.accountHoldName = null;
        state.error = null;
        state.authError = false;
      })
      .addCase(validateAccount.fulfilled, (state, action) => {
        state.loading = { ...state.loading, validation: false };
        state.validating = false;
        state.validateAccountData = action.payload;
        // ⚠️ Do NOT auto-set validationStep="success" here.
        // The UI checks responseCode and dispatches setValidationStep itself.
        state.error = null;
        state.retryAttempts = 0;
      })
      .addCase(validateAccount.rejected, (state, action) => {
        state.loading = { ...state.loading, validation: false };
        state.validating = false;
        state.validateAccountData = null;
        state.validationStep = "failed";
        state.error = action.payload ?? action.error?.message;
        state.lastError = action.payload;
        state.authError = action.payload?.isAuthError ?? false;
      });

    /* ── getAccountHoldName ──────────────────────────── */
    builder
      .addCase(getAccountHoldName.pending, (state) => {
        state.loading = { ...state.loading, accountName: true };
      })
      .addCase(getAccountHoldName.fulfilled, (state, action) => {
        state.loading = { ...state.loading, accountName: false };
        state.accountHoldName = action.payload;
      })
      .addCase(getAccountHoldName.rejected, (state, action) => {
        state.loading = { ...state.loading, accountName: false };
        state.lastError = action.payload;
        // Non-critical: don't overwrite primary error
      });

    /* ── debitCustomer ───────────────────────────────── */
    builder
      .addCase(debitCustomer.pending, (state) => {
        state.loading = { ...state.loading, payment: true };
        state.paymentStep = "processing";
        state.debitCustomerData = null;
        state.error = null;
        state.authError = false;
      })
      .addCase(debitCustomer.fulfilled, (state, action) => {
        state.loading = { ...state.loading, payment: false };
        state.debitCustomerData = action.payload;
        // ⚠️ Do NOT auto-set paymentStep="success" here.
        // Code "03" = submitted for processing, code "01"/"00" = paid, etc.
        // The UI handles interpretation.
        state.error = null;
      })
      .addCase(debitCustomer.rejected, (state, action) => {
        state.loading = { ...state.loading, payment: false };
        state.paymentStep = "failed";
        state.error = action.payload ?? action.error?.message ?? "Payment failed";
        state.lastError = action.payload;
        state.authError = action.payload?.isAuthError ?? false;
      });

    /* ── checkTransactionStatus ──────────────────────── */
    builder
      .addCase(checkTransactionStatus.pending, (state) => {
        state.loading = { ...state.loading, statusCheck: true };
        state.checkingStatus = true;
      })
      .addCase(checkTransactionStatus.fulfilled, (state, action) => {
        state.loading = { ...state.loading, statusCheck: false };
        state.checkingStatus = false;
        state.transactionStatus = action.payload;
      })
      .addCase(checkTransactionStatus.rejected, (state, action) => {
        state.loading = { ...state.loading, statusCheck: false };
        state.checkingStatus = false;
        state.lastError = action.payload;
        if (action.payload?.isAuthError) {
          state.authError = true;
          state.error = action.payload;
        }
      });

    /* ── debitByCustomerNetworkProviderId ────────────── */
    builder
      .addCase(debitByCustomerNetworkProviderId.pending, (state) => {
        state.loading = { ...state.loading, payment: true };
        state.error = null;
      })
      .addCase(debitByCustomerNetworkProviderId.fulfilled, (state, action) => {
        state.loading = { ...state.loading, payment: false };
        state.debitNetworkData = action.payload;
      })
      .addCase(debitByCustomerNetworkProviderId.rejected, (state, action) => {
        state.loading = { ...state.loading, payment: false };
        state.error = action.payload ?? action.error?.message;
      });

    /* ── dispatchToAllNetworks ───────────────────────── */
    builder
      .addCase(dispatchToAllNetworks.pending, (state) => {
        state.loading = { ...state.loading, networkDispatch: true };
        state.dispatchStep = "dispatching";
        state.networkDispatchData = null;
        state.error = null;
      })
      .addCase(dispatchToAllNetworks.fulfilled, (state, action) => {
        state.loading = { ...state.loading, networkDispatch: false };
        state.networkDispatchData = action.payload;
        const { successful, total } = action.payload.summary;
        if (successful === total) state.dispatchStep = "completed";
        else if (successful > 0) state.dispatchStep = "partial";
        else state.dispatchStep = "failed";
      })
      .addCase(dispatchToAllNetworks.rejected, (state, action) => {
        state.loading = { ...state.loading, networkDispatch: false };
        state.error = action.payload ?? action.error?.message;
        state.dispatchStep = "failed";
      });

    /* ── getPSPTransactionsByCompany ─────────────────── */
    builder
      .addCase(getPSPTransactionsByCompany.pending, (state) => {
        state.loading = { ...state.loading, payment: true };
        state.error = null;
      })
      .addCase(getPSPTransactionsByCompany.fulfilled, (state, action) => {
        state.loading = { ...state.loading, payment: false };
        state.pspTransactionsReport = action.payload;
      })
      .addCase(getPSPTransactionsByCompany.rejected, (state, action) => {
        state.loading = { ...state.loading, payment: false };
        state.error = action.payload ?? action.error?.message;
      });
  },
});

/* ─── Internal helper ─────────────────────────────────── */
function generateRefNo() {
  return `TXN_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 8)
    .toUpperCase()}`;
}

/* ─── Action exports ──────────────────────────────────── */
export const {
  resetPaymentState,
  resetPSPTransactionsReport,
  resetValidateAccountData,
  resetTransactionStatus,
  clearError,
  setValidationStep,
  setPaymentStep,
  generateNewRefNo,
  incrementRetryAttempts,
  resetRetryAttempts,
} = paymentSlice.actions;

export default paymentSlice.reducer;

/* ═══════════════════════════════════════════════════════
 *  GATEWAY RESPONSE CODE CONSTANTS
 *  Exported so the UI can use the same canonical values.
 * ═══════════════════════════════════════════════════════ */
export const GATEWAY_CODES = {
  // Validation success codes
  VALIDATION_SUCCESS: ["00", "0", "01", "1"],

  // Debit "payment prompt sent" (waiting for user to approve on phone)
  DEBIT_SUBMITTED: ["03"],

  // Final payment success (transaction completed)
  PAYMENT_COMPLETED: ["01", "1", "00", "0"],
};

/** Helper: validateAccount succeeded? */
export const isValidationSuccess = (data) => {
  if (!data) return false;
  const code = String(data.responseCode ?? data.code ?? "");
  return GATEWAY_CODES.VALIDATION_SUCCESS.includes(code);
};

/** Helper: debitCustomer prompt was sent (code 03 means waiting for approval) */
export const isDebitSubmitted = (data) => {
  if (!data) return false;
  const code = String(data.responseCode ?? data.code ?? "");
  return (
    GATEWAY_CODES.DEBIT_SUBMITTED.includes(code) ||
    GATEWAY_CODES.PAYMENT_COMPLETED.includes(code)
  );
};

/** Helper: transaction is fully completed (paid) */
export const isPaymentCompleted = (data) => {
  if (!data) return false;
  const code = String(data.responseCode ?? data.code ?? "");
  const msg = String(data.responseMessage ?? "").toLowerCase();
  return (
    GATEWAY_CODES.PAYMENT_COMPLETED.includes(code) &&
    msg.includes("successfully")
  );
};

/* ─── Selectors ───────────────────────────────────────── */
export const selectAnyLoading = (state) =>
  Object.values(state.payment.loading).some(Boolean);
export const selectIsValidated = (state) =>
  state.payment.validationStep === "success";
export const selectPaymentLoading = (state) => state.payment.loading;
export const selectPaymentError = (state) => state.payment.error;
export const selectAuthError = (state) => state.payment.authError;
export const selectDispatchSummary = (state) =>
  state.payment.networkDispatchData?.summary ?? null;
import toast, { ToastOptions } from "react-hot-toast";

const DEFAULT_TOAST_OPTIONS: ToastOptions = {
  duration: 3000,
  position: "top-center",
  style: {
    background: "#333",
    color: "#fff",
    fontSize: "16px",
    borderRadius: "8px",
  },
};

export const appToast = {
  success: (message: string, options?: ToastOptions) =>
    toast.success(message, { ...DEFAULT_TOAST_OPTIONS, ...options }),

  error: (message: string, options?: ToastOptions) =>
    toast.error(message, { ...DEFAULT_TOAST_OPTIONS, ...options }),

  info: (message: string, options?: ToastOptions) =>
    toast(message, { ...DEFAULT_TOAST_OPTIONS, ...options }),

  loading: (message: string, options?: ToastOptions) =>
    toast.loading(message, { ...DEFAULT_TOAST_OPTIONS, ...options }),

  dismiss: () => toast.dismiss(), // Dismiss all toasts
};

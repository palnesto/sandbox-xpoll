import { FallbackProps, ErrorBoundary } from "react-error-boundary";

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="p-6">
      <div className="max-w-md mx-auto rounded-lg border border-gray-200 bg-white shadow-md p-6 text-center">
        <h2 className="text-lg font-semibold text-red-600">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm text-gray-600">{error.message}</p>
        <button
          onClick={resetErrorBoundary}
          className="mt-4 rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>{children}</ErrorBoundary>
  );
}

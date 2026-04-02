import { RotateCcw } from "lucide-react";
import React from "react";
import Button from "@/components/ui/Button";
import Surface from "@/components/ui/Surface";

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  React.PropsWithChildren,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Unhandled app error:", error, errorInfo);
  }

  private handleReturnHome = () => {
    if (typeof window !== "undefined") {
      window.location.hash = "/";
    }

    this.setState({ error: null });
  };

  render() {
    const { children } = this.props;
    const { error } = this.state;

    if (!error) {
      return children;
    }

    const message = error.message?.trim() || null;

    return (
      <section className="flex min-h-screen items-center justify-center bg-[rgb(248,245,240)] px-4 py-6 sm:px-6 lg:px-8">
        <div className="w-full max-w-[31rem]">
          <Surface variant="card" radius="2xl" padding="xl">
            <div className="max-w-[25rem]">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[rgba(196,102,60,0.8)]">
                Something went wrong
              </p>
              <h1 className="mt-3 font-display text-[clamp(2rem,4vw,2.8rem)] leading-[0.94] tracking-[-0.05em] text-[rgba(74,43,26,0.98)]">
                We could not load this page.
              </h1>
              <p className="mt-4 text-[0.98rem] leading-7 text-[rgba(104,69,47,0.8)]">
                Go back to the home page and try again.
              </p>
            </div>

            {message ? (
              <div className="mt-6 border-l-2 border-[rgba(228,172,138,0.72)] pl-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[rgba(132,88,63,0.72)]">
                  Details
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[rgba(117,76,54,0.9)]">
                  {message}
                </p>
              </div>
            ) : null}

            <div className="mt-7">
              <Button size="lg" onClick={this.handleReturnHome}>
                <RotateCcw size={17} />
                Back to home
              </Button>
            </div>
          </Surface>
        </div>
      </section>
    );
  }
}

export default ErrorBoundary;

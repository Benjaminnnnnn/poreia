import Button from "@/components/ui/Button";
import Surface from "@/components/ui/Surface";
import { RotateCcw } from "lucide-react";
import React from "react";

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
      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-6 sm:px-6">
        {/* Background */}
        <div className="absolute inset-0 bg-[rgb(18,14,10)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(217,119,87,0.18),transparent)]" />

        <div className="relative z-10 w-full max-w-[31rem]">
          <Surface
            variant="glass"
            radius="2xl"
            padding="xl"
            className="before:absolute before:inset-0 before:bg-black/30 before:backdrop-blur before:mix-blend-overlay before:-z-10 before:rounded-[inherit]"
          >
            <div className="relative z-10 max-w-[25rem]">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[#e66a3f]">
                Something went wrong
              </p>
              <h1 className="mt-3 font-display text-[clamp(2rem,4vw,2.8rem)] leading-[0.94] tracking-[-0.05em] text-white drop-shadow">
                We could not load this page.
              </h1>
              <p className="mt-4 text-[0.98rem] leading-7 text-white/80">
                Go back to the home page and try again.
              </p>
            </div>

            {message ? (
              <div className="relative z-10 mt-6 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/50">
                  Details
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-white/70">
                  {message}
                </p>
              </div>
            ) : null}

            <div className="relative z-10 mt-7">
              <Button size="lg" onClick={this.handleReturnHome}>
                <RotateCcw size={17} />
                Back to home
              </Button>
            </div>
          </Surface>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;

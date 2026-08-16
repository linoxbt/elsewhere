import type { ReactNode } from "react";

declare namespace JSX {
  interface IntrinsicElements {
    "appkit-button": {
      balance?: "show" | "hide";
      size?: "sm" | "md" | "lg";
      label?: string;
      loadingLabel?: string;
      disabled?: boolean;
      children?: ReactNode;
    };
  }
}

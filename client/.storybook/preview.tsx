import type { Preview } from "@storybook/react";
import "../src/styles/global.css";

const preview: Preview = {
  parameters: {
    options: {
      storySort: { method: "alphabetical" },
    },
    backgrounds: {
      default: "white",
      values: [{ name: "white", value: "#ffffff" }],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: "centered",
  },
};

export default preview;

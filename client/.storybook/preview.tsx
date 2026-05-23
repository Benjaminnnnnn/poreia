import type { Preview } from "@storybook/react";
import React from "react";
import "../src/styles/global.css";

// Wrap every story in a padded dark container matching the app's glass-overlay aesthetic.
const withAppShell = (Story: React.ComponentType) => (
  <div className="min-h-20 p-8" style={{ background: "rgb(18,14,10)" }}>
    <Story />
  </div>
);

const preview: Preview = {
  decorators: [withAppShell],
  parameters: {
    backgrounds: { disable: true },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: "fullscreen",
  },
};

export default preview;

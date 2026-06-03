import React, { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import SearchPromptBar from "@/features/create-trip/ui/TripPromptInput";
import { Search } from "lucide-react";

const meta: Meta<typeof SearchPromptBar> = {
  title: "UI/SearchPromptBar",
  component: SearchPromptBar,
  argTypes: {
    variant: { control: "select", options: ["overlay", "refine"] },
    isLoading: { control: "boolean" },
    disabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof SearchPromptBar>;

function Controlled({ variant }: { variant?: "overlay" | "refine" }) {
  const [value, setValue] = useState("");
  return (
    <div className="w-[480px]">
      <SearchPromptBar
        label="Search"
        leadingIcon={<Search size={18} />}
        placeholder="3 days in Lisbon with ocean views…"
        submitLabel="Plan trip"
        value={value}
        onValueChange={setValue}
        variant={variant}
      />
    </div>
  );
}

export const Overlay: Story = {
  render: () => <Controlled variant="overlay" />,
};

export const Refine: Story = {
  render: () => <Controlled variant="refine" />,
};

export const Loading: Story = {
  render: () => (
    <div className="w-[480px]">
      <SearchPromptBar
        label="Search"
        leadingIcon={<Search size={18} />}
        placeholder="Planning…"
        submitLabel="Plan trip"
        loadingLabel="Planning…"
        value="5 days in Tokyo"
        onValueChange={() => {}}
        isLoading
      />
    </div>
  ),
};

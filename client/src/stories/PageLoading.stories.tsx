import type { Meta, StoryObj } from "@storybook/react";
import { PageLoading } from "@/shared/ui/PageLoading";

const meta: Meta<typeof PageLoading> = {
  title: "UI/PageLoading",
  component: PageLoading,
  argTypes: {
    label: { control: "text" },
  },
};

export default meta;
type Story = StoryObj<typeof PageLoading>;

export const Default: Story = {
  args: { label: "Loading…" },
};

export const CustomLabel: Story = {
  args: { label: "Planning your trip…" },
};

export const FullHeight: Story = {
  args: { label: "Loading your itinerary…", className: "h-64" },
};

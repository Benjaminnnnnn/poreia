import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import EmptyState from "@/shared/ui/EmptyState";
import Button from "@/shared/ui/Button";

const meta: Meta<typeof EmptyState> = {
  title: "UI/EmptyState",
  component: EmptyState,
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  args: { title: "No trips yet." },
  decorators: [(Story) => <div className="w-[480px]"><Story /></div>],
};

export const WithDescription: Story = {
  args: {
    title: "Your trip shelf is empty.",
    description: "The first itinerary you generate will stay here so you can jump back in without reopening a menu.",
  },
  decorators: [(Story) => <div className="w-[480px]"><Story /></div>],
};

export const WithAction: Story = {
  render: () => (
    <div className="w-[480px]">
      <EmptyState
        title="Your trip shelf is empty."
        description="The first itinerary you generate will stay here so you can jump back in without reopening a menu."
        action={<Button>Plan a trip</Button>}
      />
    </div>
  ),
};

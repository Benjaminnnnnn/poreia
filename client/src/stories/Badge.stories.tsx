import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import Badge from "@/components/ui/Badge";

const meta: Meta<typeof Badge> = {
  title: "UI/Badge",
  component: Badge,
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "destructive", "outline", "ghost", "link"],
    },
    tone: {
      control: "select",
      options: [undefined, "coral", "teal", "neutral", "glass"],
    },
    size: {
      control: "select",
      options: [undefined, "xs", "sm", "md"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: { children: "Badge", variant: "default" },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default">Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="ghost">Ghost</Badge>
    </div>
  ),
};

export const Tones: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge tone="coral">Coral</Badge>
      <Badge tone="teal">Teal</Badge>
      <Badge tone="neutral">Neutral</Badge>
      <Badge tone="glass">Glass</Badge>
    </div>
  ),
};

export const ToneSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="coral" size="xs">XS</Badge>
        <Badge tone="teal" size="xs">XS</Badge>
        <Badge tone="neutral" size="xs">XS</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="coral" size="sm">Small</Badge>
        <Badge tone="teal" size="sm">Small</Badge>
        <Badge tone="neutral" size="sm">Small</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="coral" size="md">Medium</Badge>
        <Badge tone="teal" size="md">Medium</Badge>
        <Badge tone="neutral" size="md">Medium</Badge>
      </div>
    </div>
  ),
};

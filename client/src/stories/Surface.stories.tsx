import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import Surface from "@/shared/ui/Surface";

const meta: Meta<typeof Surface> = {
  title: "UI/Surface",
  component: Surface,
  argTypes: {
    variant: { control: "select", options: ["card", "subtle", "glass", "muted", "dashed"] },
    padding: { control: "select", options: ["none", "sm", "md", "lg", "xl"] },
    radius: { control: "select", options: ["md", "lg", "xl", "2xl", "3xl"] },
  },
};

export default meta;
type Story = StoryObj<typeof Surface>;

export const Default: Story = {
  args: { variant: "card", padding: "lg", radius: "xl", children: "Surface content" },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      {(["card", "subtle", "muted", "dashed"] as const).map((v) => (
        <Surface key={v} variant={v} padding="md" radius="xl">
          <p className="text-sm font-medium text-slate-700">{v}</p>
          <p className="text-xs text-slate-500 mt-1">Surface content here</p>
        </Surface>
      ))}
    </div>
  ),
};

export const Padding: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      {(["sm", "md", "lg", "xl"] as const).map((p) => (
        <Surface key={p} variant="card" padding={p} radius="lg">
          <p className="text-xs text-slate-500">padding="{p}"</p>
        </Surface>
      ))}
    </div>
  ),
};

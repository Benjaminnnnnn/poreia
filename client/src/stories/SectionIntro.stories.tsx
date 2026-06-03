import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import SectionIntro from "@/shared/ui/SectionIntro";
import Button from "@/shared/ui/Button";
import { Plus } from "lucide-react";

const meta: Meta<typeof SectionIntro> = {
  title: "UI/SectionIntro",
  component: SectionIntro,
  argTypes: {
    align: { control: "select", options: ["start", "between"] },
    tone: { control: "select", options: ["default", "compact"] },
  },
};

export default meta;
type Story = StoryObj<typeof SectionIntro>;

export const Default: Story = {
  args: { title: "Saved trips", description: "Keep multiple trips in progress and pick up where you left off." },
};

export const WithEyebrow: Story = {
  args: {
    eyebrow: "Your itineraries",
    title: "Saved trips",
    description: "Keep multiple trips in progress and pick up where you left off.",
  },
};

export const WithActions: Story = {
  render: () => (
    <div className="w-[600px]">
      <SectionIntro
        eyebrow="Your itineraries"
        title="Saved trips"
        description="Keep multiple trips in progress."
        actions={<Button><Plus size={14} /> New trip</Button>}
      />
    </div>
  ),
};

export const AlignStart: Story = {
  render: () => (
    <div className="w-[600px]">
      <SectionIntro
        align="start"
        eyebrow="Your itineraries"
        title="Saved trips"
        description="All your planned adventures in one place."
        actions={<Button variant="outline">View all</Button>}
      />
    </div>
  ),
};

import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import TextInput from "@/components/ui/TextInput";
import { Mail, Search } from "lucide-react";

const meta: Meta<typeof TextInput> = {
  title: "UI/TextInput",
  component: TextInput,
  argTypes: {
    variant: { control: "select", options: ["default", "subtle", "glass"] },
    size: { control: "select", options: ["md", "lg"] },
    disabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof TextInput>;

export const Default: Story = {
  args: { label: "Destination", placeholder: "e.g. Lisbon, Portugal" },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      <TextInput variant="default" label="Default" placeholder="Placeholder" />
      <TextInput variant="subtle" label="Subtle" placeholder="Placeholder" />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      <TextInput size="md" label="Medium (default)" placeholder="Placeholder" />
      <TextInput size="lg" label="Large" placeholder="Placeholder" />
    </div>
  ),
};

export const WithLeadingIcon: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      <TextInput label="Email" leading={<Mail size={16} />} placeholder="you@example.com" type="email" />
      <TextInput label="Search" leading={<Search size={16} />} placeholder="Search trips…" />
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      <TextInput label="Normal" placeholder="Normal state" />
      <TextInput label="With hint" placeholder="Enter value" hint="This is a hint" />
      <TextInput label="With description" placeholder="Enter value" description="Helpful description text" />
      <TextInput label="With error" placeholder="Enter value" error="This field is required" defaultValue="bad input" />
      <TextInput label="Disabled" placeholder="Cannot edit" disabled />
    </div>
  ),
};

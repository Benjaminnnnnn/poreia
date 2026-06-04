import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import Field from "@/components/ui/Field";
import { Search } from "lucide-react";

const meta: Meta<typeof Field> = {
  title: "UI/Field",
  component: Field,
  argTypes: {
    variant: { control: "select", options: ["default", "subtle", "glass"] },
    size: { control: "select", options: ["md", "lg"] },
  },
};

export default meta;
type Story = StoryObj<typeof Field>;

export const Default: Story = {
  render: () => (
    <div className="w-[360px]">
      <Field label="Email" inputId="email">
        <input id="email" type="email" placeholder="you@example.com" className="w-full bg-transparent text-sm outline-none" />
      </Field>
    </div>
  ),
};

export const WithLeadingIcon: Story = {
  render: () => (
    <div className="w-[360px]">
      <Field label="Search" inputId="search" leading={<Search size={16} />}>
        <input id="search" type="text" placeholder="Find a destination…" className="w-full bg-transparent text-sm outline-none" />
      </Field>
    </div>
  ),
};

export const WithError: Story = {
  render: () => (
    <div className="w-[360px]">
      <Field label="Email" inputId="email-err" error="Please enter a valid email address.">
        <input id="email-err" type="email" defaultValue="not-an-email" className="w-full bg-transparent text-sm outline-none" />
      </Field>
    </div>
  ),
};

export const WithHint: Story = {
  render: () => (
    <div className="w-[360px]">
      <Field label="Password" inputId="password" hint="Must be at least 8 characters.">
        <input id="password" type="password" placeholder="••••••••" className="w-full bg-transparent text-sm outline-none" />
      </Field>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex w-[360px] flex-col gap-4">
      <Field label="Medium (default)" inputId="md" size="md">
        <input id="md" type="text" placeholder="Medium field" className="w-full bg-transparent text-sm outline-none" />
      </Field>
      <Field label="Large" inputId="lg" size="lg">
        <input id="lg" type="text" placeholder="Large field" className="w-full bg-transparent text-sm outline-none" />
      </Field>
    </div>
  ),
};

import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import FadeImage from "@/shared/ui/FadeImage";

const meta: Meta<typeof FadeImage> = {
  title: "UI/FadeImage",
  component: FadeImage,
};

export default meta;
type Story = StoryObj<typeof FadeImage>;

// FadeImage must live inside a relative overflow-hidden container.

export const Default: Story = {
  render: () => (
    <div className="relative h-48 w-80 overflow-hidden rounded-xl">
      <FadeImage
        src="https://images.pexels.com/photos/1261728/pexels-photo-1261728.jpeg?auto=compress&cs=tinysrgb&w=640&q=80"
        alt="Mountain landscape"
      />
    </div>
  ),
};

export const SmallAvatar: Story = {
  render: () => (
    <div className="relative h-12 w-12 overflow-hidden rounded-full">
      <FadeImage
        src="https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?q=80&w=128&auto=format&fit=crop"
        alt="Avatar"
      />
    </div>
  ),
};

export const LoadingState: Story = {
  render: () => (
    <div className="relative h-48 w-80 overflow-hidden rounded-xl">
      {/* Broken URL keeps the shimmer skeleton visible */}
      <FadeImage src="/nonexistent-image.jpg" alt="Loading skeleton" />
    </div>
  ),
};

export const Gallery: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-3 w-[500px]">
      {[
        "https://images.pexels.com/photos/1261728/pexels-photo-1261728.jpeg?auto=compress&cs=tinysrgb&w=400",
        "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=400&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1563085463-3761d7041366?q=80&w=400&auto=format&fit=crop",
      ].map((src, i) => (
        <div key={i} className="relative h-36 overflow-hidden rounded-xl">
          <FadeImage src={src} alt={`Photo ${i + 1}`} />
        </div>
      ))}
    </div>
  ),
};

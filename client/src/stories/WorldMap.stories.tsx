import React, { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import "leaflet/dist/leaflet.css";
import WorldMap from "@/components/WorldMap";
import type { MapPinData } from "@/types";

const meta: Meta<typeof WorldMap> = {
  title: "UI/WorldMap",
  component: WorldMap,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof WorldMap>;

const tokyoPins: MapPinData[] = [
  { id: "1", name: "Senso-ji Temple", lat: 35.7148, lng: 139.7967, description: "Tokyo's oldest Buddhist temple", dayNumber: 1, dayColor: "#e67e22" },
  { id: "2", name: "Shibuya Crossing", lat: 35.6595, lng: 139.7004, description: "The world's busiest pedestrian crossing", dayNumber: 1, dayColor: "#e67e22" },
  { id: "3", name: "Meiji Shrine", lat: 35.6764, lng: 139.6993, description: "Serene Shinto shrine in a forested area", dayNumber: 2, dayColor: "#2980b9" },
  { id: "4", name: "teamLab Planets", lat: 35.6488, lng: 139.7884, description: "Immersive digital art museum", dayNumber: 2, dayColor: "#2980b9" },
  { id: "5", name: "Shinjuku Gyoen", lat: 35.6852, lng: 139.7100, description: "Beautiful national garden", dayNumber: 3, dayColor: "#27ae60" },
];

function InteractiveMap({ pins }: { pins: MapPinData[] }) {
  const [selectedPinId, setSelectedPinId] = useState<string | undefined>();
  return (
    <div className="h-screen w-full">
      <WorldMap
        pins={pins}
        selectedPinId={selectedPinId}
        onPinClick={(pin) => setSelectedPinId(pin.id === selectedPinId ? undefined : pin.id)}
      />
    </div>
  );
}

export const WithPins: Story = {
  render: () => <InteractiveMap pins={tokyoPins} />,
};

export const Empty: Story = {
  render: () => (
    <div className="h-screen w-full">
      <WorldMap pins={[]} onPinClick={() => {}} />
    </div>
  ),
};

export const SinglePin: Story = {
  render: () => <InteractiveMap pins={[tokyoPins[0]]} />,
};


export interface Activity {
  id: string; // Unique ID for Drag and Drop
  time: string;
  description: string;
  location: string;
  lat?: number;
  lng?: number;
  costEstimate?: number;
  img_prompt?: string; // Short visual description for image generation
}

export interface DayPlan {
  day: number;
  theme: string;
  activities: Activity[];
}

export interface BudgetBreakdown {
  category: string;
  amount: number;
}

export interface TravelItinerary {
  destination: string;
  title: string;
  totalDays: number;
  totalBudget: number;
  currency: string;
  overview: string;
  days: DayPlan[];
  budgetBreakdown: BudgetBreakdown[];
}

export interface MapPinData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  image?: string;
  description: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface TripSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  currentItinerary: TravelItinerary | null;
}

import { LucideIcon } from "lucide-react";

export interface FeatureItem {
  title: string;
  description: string;
  icon: LucideIcon;
}

export interface ScreenshotItem {
  title: string;
  description: string;
  imageUrl: string; // Using placeholders for this demo
}

export interface BenchmarkItem {
  metric: string;
  value: string;
  description: string;
}
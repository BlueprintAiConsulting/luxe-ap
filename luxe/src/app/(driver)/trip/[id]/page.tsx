import TripDetailClient from "./TripDetailClient";

export function generateStaticParams() {
  return [];
}

export const dynamicParams = true;

export default function TripDetailPage() {
  return <TripDetailClient />;
}

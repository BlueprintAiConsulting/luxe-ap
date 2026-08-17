import TripDetailClient from "./TripDetailClient";

export function generateStaticParams() {
  return [{ id: "demo" }, { id: "res_demo" }];
}

export const dynamicParams = false;

export default function TripDetailPage() {
  return <TripDetailClient />;
}

import type { Metadata } from "next";
import PosClient from "./PosClient";
import "./pos.css";

export const metadata: Metadata = { title: "Point of sale" };
export const dynamic = "force-dynamic";

export default function AdminPosPage() {
  return <PosClient />;
}

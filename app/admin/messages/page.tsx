import type { Metadata } from "next";
import MessagesClient from "./MessagesClient";

export const metadata: Metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

export default function AdminMessagesPage() {
  return <MessagesClient />;
}

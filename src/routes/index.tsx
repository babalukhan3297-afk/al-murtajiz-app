import { createFileRoute } from "@tanstack/react-router";
import App from "../App";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "AL MURTAJIZ — Ride & Driver Directory" }],
  }),
  component: App,
});

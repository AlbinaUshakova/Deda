'use client';

import { Analytics } from "@vercel/analytics/next";

export default function VercelAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        if (window.localStorage.getItem("deda_exclude_from_analytics") === "1") {
          return null;
        }
        return event;
      }}
    />
  );
}

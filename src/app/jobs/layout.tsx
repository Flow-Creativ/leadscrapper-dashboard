import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jobs History",
  robots: {
    index: false,
    follow: false,
  },
};

export default function JobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

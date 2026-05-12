import { OperatorChrome } from "@/components/operator/OperatorChrome";

export default function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OperatorChrome>{children}</OperatorChrome>;
}

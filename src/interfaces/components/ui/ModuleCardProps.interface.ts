export interface ModuleCardProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  to: string;
  code: string;
  colorClass?: string;
  accentColor?: "blue" | "purple" | "amber" | "green" | "red" | "gray";
}

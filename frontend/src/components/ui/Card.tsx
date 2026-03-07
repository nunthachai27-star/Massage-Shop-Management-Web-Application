interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "dark" | "light";
  hover?: boolean;
}

export function Card({
  children,
  className = "",
  variant = "dark",
  hover = false,
}: CardProps) {
  const variants = {
    dark: "bg-surface-card border border-white/10 text-white",
    light: "bg-white border border-gray-200 text-primary-dark",
  };

  const hoverClass = hover
    ? "hover:border-accent-gold/50 hover:shadow-lg hover:shadow-accent-gold/10 transition-all duration-300 cursor-pointer"
    : "";

  return (
    <div className={`rounded-2xl p-6 ${variants[variant]} ${hoverClass} ${className}`}>
      {children}
    </div>
  );
}

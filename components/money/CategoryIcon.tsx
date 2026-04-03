"use client";

import {
  Utensils, Car, ShoppingBag, Zap, Heart, Film, BookOpen,
  Sparkles, Users, PiggyBank, TrendingUp, Briefcase, Laptop,
  Building2, Home, Package, Banknote, Smartphone, CreditCard,
  Landmark, LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Utensils, Car, ShoppingBag, Zap, Heart, Film, BookOpen,
  Sparkles, Users, PiggyBank, TrendingUp, Briefcase, Laptop,
  Building2, Home, Package, Banknote, Smartphone, CreditCard,
  Landmark,
};

interface CategoryIconProps {
  name: string;
  size?: number;
  className?: string;
  color?: string;
}

export function CategoryIcon({ name, size = 18, className = "", color }: CategoryIconProps) {
  const Icon = iconMap[name];
  if (!Icon) return <Package size={size} className={className} style={color ? { color } : undefined} />;
  return <Icon size={size} className={className} style={color ? { color } : undefined} />;
}

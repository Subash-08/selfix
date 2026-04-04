import { Target, Book, Monitor, Dumbbell, Coffee, Music, PenTool, CheckCircle, Droplet, Flame, Heart, Code } from 'lucide-react';

export const ICON_MAP: Record<string, any> = {
  "dumbbell": Dumbbell,
  "book": Book,
  "monitor": Monitor,
  "coffee": Coffee,
  "music": Music,
  "pen": PenTool,
  "droplet": Droplet,
  "flame": Flame,
  "heart": Heart,
  "code": Code,
  "target": Target,

  // Legacy emoji mappings
  "💪": Dumbbell,
  "📚": Book,
  "🏃": Flame,
  "📱": Monitor,
  "📺": Monitor,
  "🍔": Coffee,
  "💧": Droplet,
  "💻": Code,
  "🧘‍♂️": Heart,
  "🛌": Coffee,
  "📝": PenTool,
  "🎵": Music
};

export const AVAILABLE_ICONS = ["dumbbell", "book", "flame", "monitor", "coffee", "droplet", "code", "heart", "pen", "music", "target"];

export function DynamicIcon({ name, size = 20, className = "" }: { name: string, size?: number, className?: string }) {
  const IconComponent = ICON_MAP[name] || CheckCircle;
  return <IconComponent size={size} className={className} />;
}

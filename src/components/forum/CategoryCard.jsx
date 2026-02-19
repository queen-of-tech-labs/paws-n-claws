import React from "react";
import { MessageSquare, Heart, AlertCircle, Search, Apple, Zap, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const iconMap = {
  MessageSquare: MessageSquare,
  Heart: Heart,
  AlertCircle: AlertCircle,
  Search: Search,
  Apple: Apple,
  Zap: Zap,
  ShoppingCart: ShoppingCart,
};

export default function CategoryCard({ category, onClick }) {
  const Icon = iconMap[category.icon] || MessageSquare;

  return (
    <div onClick={onClick}>
    <Card
      className="cursor-pointer border-slate-700 bg-gradient-to-br from-slate-800/50 to-slate-900/50 hover:from-slate-800 hover:to-slate-800 transition-all duration-200 hover:border-blue-500/50 h-full"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Icon className="w-5 h-5 text-blue-400" />
            </div>
            <CardTitle className="text-lg text-white">{category.name}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-slate-400 line-clamp-2">
          {category.description}
        </CardDescription>
      </CardContent>
    </Card>
    </div>
  );
}
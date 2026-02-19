import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils/index";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";

export default function FeaturedGuides({ guides }) {
  const navigate = useNavigate();
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
        <h2 className="text-xl font-bold text-white">Featured Guides</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {guides.map((guide) => (
          <Card key={guide.id} onClick={() => navigate(createPageUrl(`PetCareGuideDetail?id=${guide.id}`))} className="border-slate-700 bg-gradient-to-br from-slate-800/50 to-slate-900/50 hover:border-blue-500/50 transition-all cursor-pointer group">
            <CardHeader>
              <CardTitle className="text-white text-lg group-hover:text-blue-400 transition-colors mb-2">
                {guide.title}
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                {(guide.pet_types || [guide.pet_type]).map((type, idx) => (
                  <span key={idx} className="px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-medium capitalize">
                    {type}
                  </span>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400 text-sm line-clamp-2">{guide.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils/index";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader, ArrowRight } from "lucide-react";

export default function GuideList({ guides, isLoading }) {
  const navigate = useNavigate();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (guides.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-12 text-center">
        <p className="text-slate-400 text-lg">No guides found. Try adjusting your filters.</p>
      </div>
    );
  }

  const stripHtml = (html) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {guides.map((guide) => (
        <Card
          key={guide.id}
          className="border-slate-700 bg-gradient-to-br from-slate-800/50 to-slate-900/50 hover:border-blue-500/50 transition-all group overflow-hidden flex flex-col"
        >
          {/* Guide Image */}
          {guide.image_url && (
            <div className="w-full h-48 overflow-hidden">
              <img 
                src={guide.image_url} 
                alt={guide.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          )}
          
          <CardContent className="p-6 flex-1 flex flex-col">
            {/* Pet Type Badges */}
            <div className="flex flex-wrap gap-2 mb-3">
              {(guide.pet_types || [guide.pet_type]).map((type, idx) => (
                <Badge key={idx} className="bg-blue-500/20 text-blue-400 capitalize">
                  {type}
                </Badge>
              ))}
            </div>
            
            {/* Guide Title */}
            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">
              {guide.title}
            </h3>
            
            {/* Overview or Content Preview */}
            <p className="text-slate-400 text-sm mb-4 line-clamp-3">
              {guide.overview || stripHtml(guide.content).substring(0, 150) + "..."}
            </p>
            
            {/* Read Full Guide Button */}
            <Button
              onClick={() => navigate(createPageUrl(`PetCareGuideDetail?id=${guide.id}`))}
              className="mt-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white w-full group-hover:shadow-lg transition-all"
            >
              Read Full Guide
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
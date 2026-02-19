import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from '@/api/firebaseClient';
import { createPageUrl } from "@/utils/index";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, Loader } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function sanitizeHtml(html) {
  const allowedTags = ['h1', 'h2', 'h3', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'br', 'img'];
  const allowedAttributes = { img: ['src', 'alt', 'width', 'height'] };
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const cleanNode = (node) => {
    // Keep text nodes
    if (node.nodeType === Node.TEXT_NODE) {
      return;
    }
    
    // Process element nodes
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();
      
      // If tag is not allowed, replace with its children
      if (!allowedTags.includes(tagName)) {
        const children = Array.from(node.childNodes);
        children.forEach(child => {
          node.parentNode.insertBefore(child, node);
        });
        node.parentNode.removeChild(node);
        return;
      }
      
      // Remove non-allowed attributes
      const allowedAttrs = allowedAttributes[tagName] || [];
      const attrs = Array.from(node.attributes);
      attrs.forEach(attr => {
        if (!allowedAttrs.includes(attr.name)) {
          node.removeAttribute(attr.name);
        }
      });
    }
    
    // Recursively clean children
    const children = Array.from(node.childNodes);
    children.forEach(child => cleanNode(child));
  };
  
  Array.from(doc.body.childNodes).forEach(child => cleanNode(child));
  
  return doc.body.innerHTML;
}

export default function PetCareGuideDetail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const guideId = searchParams.get("id");

  // Fetch guide
  const { data: guide, isLoading: guideLoading } = useQuery({
    queryKey: ["petCareGuide", guideId],
    queryFn: () => (guideId ? api.entities.PetCareGuide.get(guideId) : null),
    enabled: !!guideId,
  });

  // Fetch category
  const { data: category } = useQuery({
    queryKey: ["guideCategory", guide?.category_id],
    queryFn: () => (guide?.category_id ? api.entities.GuideCategory.get(guide.category_id) : null),
    enabled: !!guide?.category_id,
  });

  // Fetch related guides
  const { data: relatedGuides = [] } = useQuery({
    queryKey: ["relatedGuides", guide?.pet_type, guide?.category_id],
    queryFn: () => {
      if (!guide) return [];
      return api.entities.PetCareGuide.filter(
        { pet_type: guide.pet_type, category_id: guide.category_id },
        "-created_date",
        4
      );
    },
    enabled: !!guide,
  });

  if (!guideId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Guide Not Found</h1>
          <Button onClick={() => navigate(createPageUrl("PetCareGuides"))} className="mt-4">
            Back to Guides
          </Button>
        </div>
      </div>
    );
  }

  if (guideLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
        <Loader className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Guide Not Found</h1>
          <Button onClick={() => navigate(createPageUrl("PetCareGuides"))} className="mt-4">
            Back to Guides
          </Button>
        </div>
      </div>
    );
  }

  const filteredRelatedGuides = relatedGuides.filter((g) => g.id !== guide.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate(createPageUrl("PetCareGuides"))}
          className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Guides
        </button>

        {/* Guide Content */}
        <Card className="border-slate-700 bg-gradient-to-br from-slate-800/50 to-slate-900/50 mb-8">
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1">
                <CardTitle className="text-white text-3xl mb-4">{guide.title}</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-blue-500/20 text-blue-400 capitalize">
                    {guide.pet_type}
                  </Badge>
                  {category && (
                    <Badge variant="outline" className="border-slate-600 text-slate-400">
                      {category.name}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {guide.image_url && (
              <img 
                src={guide.image_url} 
                alt={guide.title}
                className="w-full h-64 object-cover rounded-lg mb-6"
              />
            )}
            <p className="text-xs text-slate-500 mb-6">
              Last updated {formatDistanceToNow(new Date(guide.updated_date), { addSuffix: true })}
            </p>
            {guide.overview && (
              <div className="mb-6 p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                <p className="text-slate-200 leading-relaxed">{guide.overview}</p>
              </div>
            )}
            <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-3 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:mb-2 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-3 [&_li]:mb-1 [&_strong]:font-bold [&_em]:italic [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-4">
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(guide.content || '') }} />
            </div>
          </CardContent>
        </Card>

        {/* Veterinary Disclaimer */}
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 mb-8">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-300 mb-1">Veterinary Disclaimer</p>
              <p className="text-xs text-blue-200/80">
                This guide is for informational purposes only and is not a substitute for professional veterinary advice.
                Always consult with a licensed veterinarian for medical concerns about your pet.
              </p>
            </div>
          </div>
        </div>

        {/* Related Guides */}
        {filteredRelatedGuides.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Related Guides</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRelatedGuides.map((relatedGuide) => (
                <Card
                  key={relatedGuide.id}
                  onClick={() => navigate(createPageUrl(`PetCareGuideDetail?id=${relatedGuide.id}`))}
                  className="border-slate-700 bg-slate-800/50 hover:border-blue-500/50 hover:bg-slate-700/50 transition-all cursor-pointer group"
                >
                  <CardHeader>
                    <CardTitle className="text-white text-lg group-hover:text-blue-400 transition-colors">
                      {relatedGuide.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-400 text-sm line-clamp-2">
                      {relatedGuide.overview || (() => {
                        const tmp = document.createElement("DIV");
                        tmp.innerHTML = relatedGuide.content;
                        return tmp.textContent || tmp.innerText || "";
                      })().substring(0, 150) + "..."}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
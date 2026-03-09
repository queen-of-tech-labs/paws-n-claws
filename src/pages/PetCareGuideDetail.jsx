import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from '@/api/firebaseClient';
import { createPageUrl } from "@/utils/index";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, Loader } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Strip dangerous tags but keep formatting tags from the rich text editor
function sanitizeHtml(html) {
  if (!html) return "";
  // Remove script/style/iframe tags only — keep all formatting
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")   // remove inline event handlers
    .replace(/javascript:/gi, "");
}

function safeDate(val) {
  if (!val) return null;
  // Firestore Timestamp object
  if (val?.toDate) return val.toDate();
  // Already a Date
  if (val instanceof Date) return val;
  // Firestore seconds-based object
  if (val?.seconds) return new Date(val.seconds * 1000);
  // String or number
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

export default function PetCareGuideDetail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const guideId = searchParams.get("id");

  // Fetch guide
  const { data: guide, isLoading: guideLoading } = useQuery({
    queryKey: ["petCareGuide", guideId],
    queryFn: () => api.entities.PetCareGuide.get(guideId),
    enabled: !!guideId,
  });

  // Fetch category — correct entity name
  const { data: category } = useQuery({
    queryKey: ["guideCategory", guide?.category_id],
    queryFn: () => api.entities.PetCareCategory.get(guide.category_id),
    enabled: !!guide?.category_id,
  });

  // Fetch related guides from the same category
  const { data: allGuides = [] } = useQuery({
    queryKey: ["petCareGuides"],
    queryFn: () => api.entities.PetCareGuide.list("-createdAt", 100),
    enabled: !!guide,
  });

  if (!guideId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Guide Not Found</h1>
          <Button onClick={() => navigate(createPageUrl("PetCareGuides"))} className="mt-4">Back to Guides</Button>
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
          <Button onClick={() => navigate(createPageUrl("PetCareGuides"))} className="mt-4">Back to Guides</Button>
        </div>
      </div>
    );
  }

  // Handle both pet_types (array) and legacy pet_type (string)
  const petTypes = guide.pet_types || (guide.pet_type ? [guide.pet_type] : []);

  // Related guides — same category, excluding this guide
  const relatedGuides = allGuides
    .filter((g) => g.id !== guide.id && g.category_id === guide.category_id)
    .slice(0, 4);

  // Safe date formatting — won't crash on null/bad values
  const updatedAt = safeDate(guide.updatedAt || guide.updated_date || guide.createdAt);

  const stripHtml = (html) => {
    if (!html) return "";
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">

        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Guides
        </button>

        {/* Guide Card */}
        <Card className="border-slate-700 bg-gradient-to-br from-slate-800/50 to-slate-900/50 mb-8">
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1">
                <CardTitle className="text-white text-3xl mb-4">{guide.title}</CardTitle>
                <div className="flex flex-wrap gap-2">
                  {petTypes.map((type, i) => (
                    <Badge key={i} className="bg-blue-500/20 text-blue-400 capitalize">{type}</Badge>
                  ))}
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
            {/* Cover image */}
            {guide.image_url && (
              <img
                src={guide.image_url}
                alt={guide.title}
                className="w-full h-64 object-cover rounded-lg mb-6"
              />
            )}

            {/* Last updated — only shown when date is valid */}
            {updatedAt && (
              <p className="text-xs text-slate-500 mb-6">
                Last updated {formatDistanceToNow(updatedAt, { addSuffix: true })}
              </p>
            )}

            {/* Overview box */}
            {guide.overview && (
              <div className="mb-6 p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                <p className="text-slate-200 leading-relaxed">{guide.overview}</p>
              </div>
            )}

            {/* Rich text content */}
            <div
              className="
                prose prose-invert max-w-none text-slate-300 leading-relaxed
                [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mb-4 [&_h1]:mt-6
                [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mb-3 [&_h2]:mt-5
                [&_h3]:text-xl  [&_h3]:font-bold [&_h3]:text-slate-200 [&_h3]:mb-2 [&_h3]:mt-4
                [&_p]:mb-4
                [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-3 [&_ul]:space-y-1
                [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-3 [&_ol]:space-y-1
                [&_li]:text-slate-300
                [&_strong]:font-bold [&_strong]:text-white
                [&_em]:italic
                [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-400 [&_blockquote]:my-4
                [&_a]:text-blue-400 [&_a]:underline [&_a]:hover:text-blue-300
                [&_hr]:border-slate-600 [&_hr]:my-6
                [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-4
                [&_table]:w-full [&_table]:border-collapse [&_table]:my-4
                [&_th]:p-3 [&_th]:border [&_th]:border-slate-600 [&_th]:bg-slate-700 [&_th]:text-white [&_th]:font-bold [&_th]:text-left
                [&_td]:p-3 [&_td]:border [&_td]:border-slate-600 [&_td]:text-slate-300 [&_td]:align-top
                [&_tr:nth-child(even)_td]:bg-slate-800/60
                [&_tr:nth-child(odd)_td]:bg-slate-900/40
              "
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(guide.content || "") }}
            />
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 mb-8">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-300 mb-1">Veterinary Disclaimer</p>
              <p className="text-xs text-blue-200/80">
                This guide is for informational purposes only and is not a substitute for professional
                veterinary advice. Always consult with a licensed veterinarian for medical concerns about your pet.
              </p>
            </div>
          </div>
        </div>

        {/* Related Guides */}
        {relatedGuides.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Related Guides</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {relatedGuides.map((rg) => (
                <Card
                  key={rg.id}
                  onClick={() => navigate(createPageUrl(`PetCareGuideDetail?id=${rg.id}`))}
                  className="border-slate-700 bg-slate-800/50 hover:border-blue-500/50 hover:bg-slate-700/50 transition-all cursor-pointer group"
                >
                  <CardHeader>
                    <CardTitle className="text-white text-lg group-hover:text-blue-400 transition-colors">
                      {rg.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-400 text-sm line-clamp-2">
                      {rg.overview || stripHtml(rg.content).substring(0, 150) + "..."}
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

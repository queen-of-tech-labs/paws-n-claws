import React, { useState } from "react";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPageUrl } from "@/utils/index";
import { useNavigate } from "react-router-dom";

export default function CommunityHeader({ onSearchChange }) {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    onSearchChange?.(e.target.value);
  };

  return (
    <div className="mb-12">
      {/* Title Section */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Community Forum</h1>
        <p className="text-slate-400">Connect with pet lovers, share stories, and get advice</p>
      </div>

      {/* Search and Create Button */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search discussions..."
            value={searchQuery}
            onChange={handleSearch}
            className="pl-10 bg-slate-800 border-slate-700 text-white placeholder-slate-500"
          />
        </div>
        <Button
          onClick={() => navigate(createPageUrl("ForumCreatePost"))}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Create Post
        </Button>
      </div>
    </div>
  );
}
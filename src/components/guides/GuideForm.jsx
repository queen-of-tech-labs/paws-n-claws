import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Upload, X, Save,
  Bold, Italic, Underline, List, ListOrdered,
  Heading1, Heading2, AlignLeft, AlignCenter, AlignRight,
  Link, Minus, Quote
} from "lucide-react";

// ─── Rich Text Editor ──────────────────────────────────────────────────────
function RichTextEditor({ value, onChange, placeholder }) {
  const editorRef = useRef(null);
  const isInitialized = useRef(false);

  // Set initial content once
  useEffect(() => {
    if (editorRef.current && !isInitialized.current) {
      editorRef.current.innerHTML = value || "";
      isInitialized.current = true;
    }
  }, []);

  const exec = useCallback((cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    // Propagate change
    if (onChange) onChange(editorRef.current.innerHTML);
  }, [onChange]);

  const handleInput = useCallback(() => {
    if (onChange) onChange(editorRef.current.innerHTML);
  }, [onChange]);

  // Paste handler — strips colors/fonts but fully preserves structure
  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const html  = e.clipboardData.getData("text/html");
    const text  = e.clipboardData.getData("text/plain");

    if (html) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      // ── 1. Unwrap invisible Word/MSO wrapper elements but keep their children ──
      doc.querySelectorAll(
        "o\\:p, w\\:sdt, w\\:sdtContent, [class^='Mso'], [class*=' Mso']"
      ).forEach(el => el.replaceWith(...el.childNodes));

      // ── 2. Walk every element: strip ONLY color/font styles, keep everything else ──
      const COLOR_PROPS = [
        "color","background","background-color","font-family",
        "font-size","line-height","letter-spacing","mso-highlight",
        "text-decoration-color","border-color",
      ];
      doc.querySelectorAll("*").forEach(el => {
        COLOR_PROPS.forEach(p => el.style.removeProperty(p));
        // Remove class/data attrs that carry Word color themes
        el.removeAttribute("class");
        el.removeAttribute("data-contrast");
        el.removeAttribute("data-iml");
        el.removeAttribute("lang");
        // Clean up empty style attributes
        if (el.getAttribute("style") === "") el.removeAttribute("style");
      });

      // ── 3. Convert Word paragraph-as-list-item pattern to real <li> ──
      // Word sometimes pastes lists as <p> tags with bullet chars instead of <ul><li>
      const paras = Array.from(doc.querySelectorAll("p"));
      let ulGroup = null, olGroup = null;
      paras.forEach(p => {
        const raw = p.textContent.trimStart();
        const isBullet  = /^[•·‣▪◦\-]\s/.test(raw);
        const isOrdered = /^\d+[.)]\s/.test(raw);

        if (isBullet) {
          if (!ulGroup) { ulGroup = doc.createElement("ul"); p.before(ulGroup); }
          olGroup = null;
          const li = doc.createElement("li");
          li.innerHTML = p.innerHTML.replace(/^[•·‣▪◦\-]\s*/, "");
          ulGroup.appendChild(li);
          p.remove();
        } else if (isOrdered) {
          if (!olGroup) { olGroup = doc.createElement("ol"); p.before(olGroup); }
          ulGroup = null;
          const li = doc.createElement("li");
          li.innerHTML = p.innerHTML.replace(/^\d+[.)]\s*/, "");
          olGroup.appendChild(li);
          p.remove();
        } else {
          ulGroup = null; olGroup = null;
        }
      });

      // ── 4. Collapse empty paragraphs used as spacers into a single <br> ──
      doc.querySelectorAll("p").forEach(p => {
        if (!p.textContent.trim() && !p.querySelector("img,br")) {
          p.replaceWith(doc.createElement("br"));
        }
      });

      document.execCommand("insertHTML", false, doc.body.innerHTML);
    } else if (text) {
      // Fallback: plain text — split on blank lines into paragraphs
      const clean = text
        .split(/\n{2,}/)
        .map(para => {
          const lines = para.split("\n");
          // Detect plain-text bullet lists
          if (lines.every(l => /^[•·\-*]\s/.test(l.trim()))) {
            return "<ul>" + lines.map(l =>
              `<li>${l.replace(/^[•·\-*]\s*/, "").trim()}</li>`
            ).join("") + "</ul>";
          }
          if (lines.every(l => /^\d+[.)]\s/.test(l.trim()))) {
            return "<ol>" + lines.map(l =>
              `<li>${l.replace(/^\d+[.)]\s*/, "").trim()}</li>`
            ).join("") + "</ol>";
          }
          return `<p>${lines.join("<br>")}</p>`;
        })
        .join("");
      document.execCommand("insertHTML", false, clean);
    }

    if (onChange) onChange(editorRef.current.innerHTML);
  }, [onChange]);

  const handleKeyDown = useCallback((e) => {
    // Tab → indent
    if (e.key === "Tab") {
      e.preventDefault();
      exec("insertHTML", "&nbsp;&nbsp;&nbsp;&nbsp;");
    }
    // Ctrl+B / Cmd+B
    if ((e.ctrlKey || e.metaKey) && e.key === "b") { e.preventDefault(); exec("bold"); }
    if ((e.ctrlKey || e.metaKey) && e.key === "i") { e.preventDefault(); exec("italic"); }
    if ((e.ctrlKey || e.metaKey) && e.key === "u") { e.preventDefault(); exec("underline"); }
  }, [exec]);

  const insertLink = useCallback(() => {
    const url = window.prompt("Enter URL:", "https://");
    if (url) exec("createLink", url);
  }, [exec]);

  const insertHR = useCallback(() => {
    exec("insertHTML", "<hr style='border-color:#475569;margin:12px 0'/>");
  }, [exec]);

  const toolbarBtn = (icon, action, title) => (
    <button
      type="button"
      title={title}
      onClick={action}
      className="p-1.5 rounded hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
    >
      {icon}
    </button>
  );

  return (
    <div className="border border-slate-600 rounded-lg overflow-hidden bg-slate-700/50">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-slate-600 bg-slate-800/60">
        {/* Text style */}
        {toolbarBtn(<Bold className="w-4 h-4"/>, () => exec("bold"), "Bold (Ctrl+B)")}
        {toolbarBtn(<Italic className="w-4 h-4"/>, () => exec("italic"), "Italic (Ctrl+I)")}
        {toolbarBtn(<Underline className="w-4 h-4"/>, () => exec("underline"), "Underline (Ctrl+U)")}

        <div className="w-px h-5 bg-slate-600 mx-1"/>

        {/* Headings */}
        {toolbarBtn(<Heading1 className="w-4 h-4"/>, () => exec("formatBlock", "<h1>"), "Heading 1")}
        {toolbarBtn(<Heading2 className="w-4 h-4"/>, () => exec("formatBlock", "<h2>"), "Heading 2")}
        {toolbarBtn(<span className="text-xs font-bold">H3</span>, () => exec("formatBlock", "<h3>"), "Heading 3")}
        {toolbarBtn(<AlignLeft className="w-4 h-4"/>, () => exec("formatBlock", "<p>"), "Paragraph")}

        <div className="w-px h-5 bg-slate-600 mx-1"/>

        {/* Lists */}
        {toolbarBtn(<List className="w-4 h-4"/>, () => exec("insertUnorderedList"), "Bullet List")}
        {toolbarBtn(<ListOrdered className="w-4 h-4"/>, () => exec("insertOrderedList"), "Numbered List")}
        {toolbarBtn(<Quote className="w-4 h-4"/>, () => exec("formatBlock", "<blockquote>"), "Blockquote")}

        <div className="w-px h-5 bg-slate-600 mx-1"/>

        {/* Alignment */}
        {toolbarBtn(<AlignLeft className="w-4 h-4"/>, () => exec("justifyLeft"), "Align Left")}
        {toolbarBtn(<AlignCenter className="w-4 h-4"/>, () => exec("justifyCenter"), "Align Center")}
        {toolbarBtn(<AlignRight className="w-4 h-4"/>, () => exec("justifyRight"), "Align Right")}

        <div className="w-px h-5 bg-slate-600 mx-1"/>

        {/* Extras */}
        {toolbarBtn(<Link className="w-4 h-4"/>, insertLink, "Insert Link")}
        {toolbarBtn(<Minus className="w-4 h-4"/>, insertHR, "Horizontal Rule")}

        <div className="w-px h-5 bg-slate-600 mx-1"/>

        {/* Font size */}
        <select
          onChange={(e) => exec("fontSize", e.target.value)}
          className="text-xs bg-slate-700 border border-slate-600 text-slate-300 rounded px-1 py-0.5 cursor-pointer"
          defaultValue=""
          title="Font Size"
        >
          <option value="" disabled>Size</option>
          <option value="1">Small</option>
          <option value="3">Normal</option>
          <option value="5">Large</option>
          <option value="7">X-Large</option>
        </select>
      </div>

      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        className="min-h-[300px] p-3 text-white focus:outline-none
          [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:mt-4 [&_h1]:text-white
          [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-slate-200
          [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-2 [&_h3]:text-slate-300
          [&_p]:mb-2 [&_p]:leading-relaxed
          [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-2 [&_ul]:space-y-1
          [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-2 [&_ol]:space-y-1
          [&_li]:text-slate-200
          [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-300 [&_blockquote]:my-2
          [&_a]:text-blue-400 [&_a]:underline
          [&_hr]:border-slate-500 [&_hr]:my-3
          empty:before:content-[attr(data-placeholder)] empty:before:text-slate-500 empty:before:pointer-events-none"
        style={{ whiteSpace: "pre-wrap" }}
      />
    </div>
  );
}
import api, { fbStorage } from '@/api/firebaseClient';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const petTypes = [
  { value: "dog", label: "Dog" },
  { value: "cat", label: "Cat" },
  { value: "bird", label: "Bird" },
  { value: "rabbit", label: "Rabbit" },
  { value: "hamster", label: "Hamster" },
  { value: "fish", label: "Fish" },
  { value: "reptile", label: "Reptile" },
  { value: "general", label: "General" },
];

const formatTime = (date) => {
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return "just now";
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
};

export default function GuideForm({
  guide,
  categories,
  onSubmit,
  onCancel,
  isLoading,
}) {
  const [formData, setFormData] = useState(() => {
    if (guide) {
      // Migrate old pet_type field to new pet_types array
      return {
        ...guide,
        pet_types: guide.pet_types || (guide.pet_type ? [guide.pet_type] : ["general"])
      };
    }
    return {
      title: "",
      overview: "",
      content: "",
      pet_types: ["general"],
      category_id: "",
      image_url: "",
      is_featured: false,
    };
  });
  const [errors, setErrors] = useState({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const draftKey = `guide_draft_${guide?.id || "new"}`;

  // Auto-save draft to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(draftKey, JSON.stringify(formData));
      setLastSaved(new Date());
    }, 1000);
    return () => clearTimeout(timer);
  }, [formData, draftKey]);

  // Load draft on mount
  useEffect(() => {
    if (!guide) {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        setFormData(JSON.parse(savedDraft));
      }
    }
  }, []);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (!formData.content || formData.content.replace(/<[^>]*>/g, "").trim() === "") newErrors.content = "Content is required";
    if (!formData.category_id) newErrors.category_id = "Category is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setErrors({ ...errors, image: "Only JPG and PNG files are allowed" });
      return;
    }

    setUploadingImage(true);
    try {
      const storageRef = ref(fbStorage, `guide-images/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const file_url = await getDownloadURL(storageRef);
      setFormData({ ...formData, image_url: file_url });
      setErrors({ ...errors, image: "" });
    } catch (err) {
      setErrors({ ...errors, image: "Failed to upload image" });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
      // Clear draft after successful save
      localStorage.removeItem(draftKey);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Title *
        </label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Guide title"
          className="bg-slate-700/50 border-slate-600 text-white"
        />
        {errors.title && (
          <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {errors.title}
          </p>
        )}
      </div>

      {/* Overview */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Overview
        </label>
        <Textarea
          value={formData.overview}
          onChange={(e) =>
            setFormData({
              ...formData,
              overview: e.target.value.slice(0, 500),
            })
          }
          placeholder="Brief description of the guide (max 500 characters)"
          className="bg-slate-700/50 border-slate-600 text-white h-20"
        />
        <p className="text-xs text-slate-500 mt-1">
          {formData.overview.length}/500
        </p>
      </div>

      {/* Guide Image */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Guide Image
        </label>
        <div className="space-y-2">
          {formData.image_url ? (
            <div className="relative w-full h-40 rounded-lg overflow-hidden border border-slate-600">
              <img
                src={formData.image_url}
                alt="Guide cover"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setFormData({ ...formData, image_url: "" })}
                className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 p-1 rounded"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-slate-600 rounded-lg hover:border-slate-500 cursor-pointer transition-colors bg-slate-700/20">
              <div className="text-center">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-400">
                  {uploadingImage ? "Uploading..." : "Click to upload (JPG, PNG)"}
                </p>
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                className="hidden"
              />
            </label>
          )}
          {errors.image && (
            <p className="text-red-400 text-xs flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.image}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-slate-300">
            Content *
          </label>
          {lastSaved && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Save className="w-3 h-3" />
              Draft saved {formatTime(lastSaved)}
            </div>
          )}
        </div>
        <RichTextEditor
          value={formData.content}
          onChange={(html) => setFormData({ ...formData, content: html })}
          placeholder="Write your guide content here... Use the toolbar above to format text, add headings, bullet points, and more."
        />
        {errors.content && (
          <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {errors.content}
          </p>
        )}
      </div>

      {/* Pet Types and Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Pet Types (select all that apply)
          </label>
          <div className="space-y-2 bg-slate-700/50 border border-slate-600 rounded-lg p-3 max-h-48 overflow-y-auto">
            {petTypes.map((type) => (
              <div key={type.value} className="flex items-center gap-2">
                <Checkbox
                  id={`pet-${type.value}`}
                  checked={(formData.pet_types || []).includes(type.value)}
                  onCheckedChange={(checked) => {
                    const currentTypes = formData.pet_types || ["general"];
                    const newTypes = checked
                      ? [...currentTypes, type.value]
                      : currentTypes.filter((t) => t !== type.value);
                    setFormData({ ...formData, pet_types: newTypes.length > 0 ? newTypes : ["general"] });
                  }}
                  className="border-slate-500"
                />
                <label
                  htmlFor={`pet-${type.value}`}
                  className="text-sm text-slate-300 cursor-pointer"
                >
                  {type.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Category *
          </label>
          <Select
            value={formData.category_id}
            onValueChange={(value) =>
              setFormData({ ...formData, category_id: value })
            }
          >
            <SelectTrigger className="bg-slate-700/50 border-slate-600">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category_id && (
            <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.category_id}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="border-slate-600"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? "Saving..." : guide ? "Update Guide" : "Create Guide"}
        </Button>
      </div>
    </form>
  );
}
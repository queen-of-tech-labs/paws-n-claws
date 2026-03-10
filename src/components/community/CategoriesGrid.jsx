import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from '@/api/firebaseClient';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils/index";
import { Loader2, FolderPlus, MessageSquarePlus } from "lucide-react";

const DEFAULT_CATEGORIES = [
  { name: "General Discussion", icon: "💬", description: "Chat about anything pet-related with fellow pet owners.", slug: "general-discussion" },
  { name: "Health & Wellness", icon: "🏥", description: "Questions and advice about pet health, vet visits, and medical care.", slug: "health-wellness" },
  { name: "Training & Behavior", icon: "🎓", description: "Tips and help for training your pets and understanding their behavior.", slug: "training-behavior" },
  { name: "Nutrition & Diet", icon: "📚", description: "Discuss food, treats, special diets, and nutrition for all pets.", slug: "nutrition-diet" },
  { name: "Adoption & Rescue", icon: "❤️", description: "Share adoption stories, rescue resources, and help find pets forever homes.", slug: "adoption-rescue" },
  { name: "Pet Care Tips", icon: "🐾", description: "Grooming, enrichment, toys, and everyday care advice from the community.", slug: "pet-care-tips" },
];

const SEED_POSTS = [
  // General Discussion
  {
    categorySlug: "general-discussion",
    title: "Introduce yourself and your pets! 🐾",
    content: "Hey everyone! I'm so excited to be part of this community. I have a 3-year-old golden retriever named Biscuit and a very opinionated tabby cat named Mochi. They're best friends — well, Mochi tolerates Biscuit at least 😂. Would love to hear about your furry (or scaly, or feathery!) family members!",
    author: "SarahM",
    daysAgo: 14,
    view_count: 142,
    reply_count: 31,
  },
  {
    categorySlug: "general-discussion",
    title: "What's the funniest thing your pet has ever done?",
    content: "My dog figured out how to open the pantry door and helped himself to an entire bag of dog treats. The look on his face when I caught him — pure zero regret. 😂 I need to hear your best stories to feel better about my life choices as a pet parent.",
    author: "DogDadMike",
    daysAgo: 9,
    view_count: 98,
    reply_count: 24,
  },
  {
    categorySlug: "general-discussion",
    title: "Best pet-friendly vacation spots in the US?",
    content: "Planning a road trip this summer and want to bring my two dogs along. We're thinking somewhere with hiking, maybe near water. We've heard Asheville, NC and Bend, OR are great. Anyone have first-hand experience or other suggestions? Bonus points if the town has dog-friendly restaurants and breweries!",
    author: "WanderlustPaws",
    daysAgo: 5,
    view_count: 76,
    reply_count: 18,
  },

  // Health & Wellness
  {
    categorySlug: "health-wellness",
    title: "My cat has been drinking more water than usual — should I be worried?",
    content: "Over the past couple of weeks I've noticed my 8-year-old cat Luna is drinking a lot more water and using the litter box more frequently. She's still eating and acting normally otherwise. I've heard this can sometimes be a sign of kidney issues or diabetes. Has anyone experienced this? I have a vet appointment scheduled but it's not for another week and I'm anxious.",
    author: "CatMomCarla",
    daysAgo: 3,
    view_count: 211,
    reply_count: 29,
  },
  {
    categorySlug: "health-wellness",
    title: "Heartworm prevention — which monthly treatment do you use?",
    content: "Just adopted a rescue pup and my vet gave me a few options for heartworm prevention. Currently looking at Heartgard Plus vs. Interceptor Plus. I know both are well-reviewed but curious what the community uses and if anyone has had issues with one vs. the other. Also — is it worth adding a flea and tick combo like Simparica Trio?",
    author: "NewDogDad2024",
    daysAgo: 7,
    view_count: 134,
    reply_count: 22,
  },
  {
    categorySlug: "health-wellness",
    title: "Senior dog joint supplements — what actually works?",
    content: "My 11-year-old lab mix Hank has been slowing down on walks and has trouble getting up after lying down for a while. The vet confirmed mild hip dysplasia. We're starting him on glucosamine/chondroitin but I've also seen fish oil and turmeric recommended a lot. Anyone have a senior dog who's seen real improvement with supplements or diet changes?",
    author: "HanksHuman",
    daysAgo: 11,
    view_count: 189,
    reply_count: 34,
  },

  // Training & Behavior
  {
    categorySlug: "training-behavior",
    title: "Puppy won't stop biting — is this normal and when does it stop?",
    content: "We brought home a 10-week-old border collie mix named Pepper three weeks ago and she bites EVERYTHING including hands, ankles, and the kids. I know mouthing is normal for puppies but this feels intense. We're saying 'ouch' and redirecting to toys but it doesn't seem to be clicking yet. Any tips from people who've been through this? When did it get better for your pup?",
    author: "PeppersMom",
    daysAgo: 4,
    view_count: 167,
    reply_count: 41,
  },
  {
    categorySlug: "training-behavior",
    title: "How I finally taught my rescue dog to walk nicely on leash",
    content: "After 6 months of being dragged down the street by my 60lb rescue pit mix, I finally cracked the code and wanted to share. The game-changer for us was a combination of a front-clip harness and the 'be a tree' method — the moment he pulled, I stopped completely and waited. No corrections, no yelling. It took about 2 weeks of total consistency but now our walks are genuinely enjoyable. Happy to answer questions!",
    author: "RescueDogRookie",
    daysAgo: 16,
    view_count: 253,
    reply_count: 47,
  },

  // Nutrition & Diet
  {
    categorySlug: "nutrition-diet",
    title: "Raw feeding — worth it or overhyped?",
    content: "I've been seeing a lot of content lately about raw feeding for dogs and the supposed benefits: shinier coat, better digestion, cleaner teeth. But I'm also seeing a lot of vets warn against it due to bacterial contamination risks. Has anyone switched to raw and noticed a real difference? What precautions do you take? I have a young child at home which is making me more cautious about the handling side of things.",
    author: "NutritionNerd",
    daysAgo: 6,
    view_count: 198,
    reply_count: 52,
  },
  {
    categorySlug: "nutrition-diet",
    title: "Foods I didn't know were dangerous for dogs — learn from my mistake",
    content: "I want to share this in case it helps someone. I gave my dog a small piece of sugar-free gum without knowing it contained xylitol, which is extremely toxic to dogs. He's okay after an emergency vet visit but I felt terrible and couldn't believe I didn't know this. Other things I've since learned to watch out for: grapes, onions, macadamia nuts, and even some peanut butters. Please check your labels!",
    author: "ScaredStraight",
    daysAgo: 20,
    view_count: 312,
    reply_count: 58,
  },

  // Adoption & Rescue
  {
    categorySlug: "adoption-rescue",
    title: "We adopted a bonded pair of senior cats and I'm crying happy tears",
    content: "Meet Figs and Ginger — 12-year-old tortoiseshell sisters who were surrendered when their owner went into assisted living. They were at the shelter for 4 months because most people don't want to adopt seniors, let alone two of them. We brought them home last weekend and I just want to report that they have completely taken over our couch, our laps, and honestly our entire hearts. ADOPT SENIORS, people. They know exactly what's happening and they are so grateful.",
    author: "SeniorCatAdvocate",
    daysAgo: 8,
    view_count: 287,
    reply_count: 63,
  },
  {
    categorySlug: "adoption-rescue",
    title: "Tips for the first 2 weeks with a rescue dog",
    content: "We're bringing home our first rescue dog this weekend and I've been reading about the '3-3-3 rule' (3 days to decompress, 3 weeks to learn the routine, 3 months to feel at home). Any other advice for the transition period? Especially curious about: how much structure to have right away, whether to let him on furniture from day one, and how to handle it if he seems shut down or fearful at first.",
    author: "FirstTimeRescuer",
    daysAgo: 2,
    view_count: 144,
    reply_count: 37,
  },

  // Pet Care Tips
  {
    categorySlug: "pet-care-tips",
    title: "DIY enrichment ideas that keep my dog busy for hours",
    content: "My high-energy shepherd mix needs WAY more mental stimulation than walks alone can provide. Here's what's been working for us: snuffle mats (I made one from a rubber mat and fleece strips for about $8), frozen Kongs with a mix of kibble/peanut butter/banana, hiding kibble in crinkled newspaper inside a cardboard box, and scatter feeding in the grass instead of a bowl. Mental exercise tires dogs out faster than physical — highly recommend trying these!",
    author: "EnrichmentEnthusiast",
    daysAgo: 12,
    view_count: 224,
    reply_count: 44,
  },
  {
    categorySlug: "pet-care-tips",
    title: "How often do you actually bathe your dog?",
    content: "I feel like I'm getting conflicting advice everywhere. My vet says every 4-6 weeks, some groomers say every 2 weeks, and the internet says anywhere from weekly to 'only when dirty.' My golden retriever Maple loves water but seems to get itchy if bathed too often. What's your routine? Does it change by breed, coat type, or activity level?",
    author: "BathTimeBlues",
    daysAgo: 10,
    view_count: 161,
    reply_count: 29,
  },
];

const iconMap = { "💬": "💬", "❤️": "❤️", "🏥": "🏥", "📚": "📚", "🎓": "🎓", "🐾": "🐾" };

export default function CategoriesGrid({ isAdmin }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [seeding, setSeeding] = useState(false);
  const [seedingPosts, setSeedingPosts] = useState(false);
  const [seedError, setSeedError] = useState("");
  const [postSeedDone, setPostSeedDone] = useState(false);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["forumCategories"],
    queryFn: () => api.entities.ForumCategory.list(),
  });

  const { data: existingPosts = [] } = useQuery({
    queryKey: ["forumPostsAll"],
    queryFn: () => api.entities.ForumPost.list("-createdAt", 5),
    enabled: isAdmin && categories.length > 0,
  });

  const handleSeedCategories = async () => {
    setSeeding(true);
    setSeedError("");
    try {
      for (const cat of DEFAULT_CATEGORIES) {
        await api.entities.ForumCategory.create(cat);
      }
      await queryClient.invalidateQueries(["forumCategories"]);
    } catch (err) {
      setSeedError("Something went wrong seeding categories. Please try again.");
    } finally {
      setSeeding(false);
    }
  };

  const handleSeedPosts = async () => {
    setSeedingPosts(true);
    setSeedError("");
    try {
      for (const post of SEED_POSTS) {
        const category = categories.find(c => c.slug === post.categorySlug);
        if (!category) continue;

        const createdDate = new Date();
        createdDate.setDate(createdDate.getDate() - post.daysAgo);

        await api.entities.ForumPost.create({
          title: post.title,
          content: post.content,
          category_id: category.id,
          created_by: post.author,
          created_date: createdDate.toISOString(),
          view_count: post.view_count,
          reply_count: post.reply_count,
          is_seeded: true,
        });
      }
      await queryClient.invalidateQueries(["forumPosts"]);
      await queryClient.invalidateQueries(["forumPostsAll"]);
      await queryClient.invalidateQueries(["trendingPosts"]);
      await queryClient.invalidateQueries(["recentPosts"]);
      setPostSeedDone(true);
    } catch (err) {
      setSeedError("Something went wrong seeding posts. Please try again.");
    } finally {
      setSeedingPosts(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="mb-12">
        <h2 className="text-xl font-bold text-white mb-4 text-center">Forum Categories</h2>
        <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-8 text-center">
          <FolderPlus className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-400 mb-2">No forum categories have been set up yet.</p>
          {isAdmin ? (
            <>
              <p className="text-slate-500 text-sm mb-5">As an admin, you can seed the default categories to get the forum started.</p>
              <Button onClick={handleSeedCategories} disabled={seeding} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                {seeding ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating Categories...</> : <><FolderPlus className="w-4 h-4 mr-2" /> Set Up Forum Categories</>}
              </Button>
              {seedError && <p className="text-red-400 text-sm mt-3">{seedError}</p>}
            </>
          ) : (
            <p className="text-slate-500 text-sm">Check back soon — categories are being set up!</p>
          )}
        </div>
      </div>
    );
  }

  const postsAlreadySeeded = existingPosts.length > 0 || postSeedDone;

  return (
    <div className="mb-12">
      <h2 className="text-xl font-bold text-white mb-4 text-center">Forum Categories</h2>

      {/* Admin: seed posts button */}
      {isAdmin && !postsAlreadySeeded && (
        <div className="rounded-xl border border-slate-600 bg-slate-800/40 p-4 mb-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <p className="text-slate-300 text-sm font-medium">Forum looks empty to new users</p>
            <p className="text-slate-500 text-xs mt-0.5">Populate it with realistic starter posts so it feels active from day one.</p>
          </div>
          <Button onClick={handleSeedPosts} disabled={seedingPosts} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 whitespace-nowrap flex-shrink-0">
            {seedingPosts ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding Posts...</> : <><MessageSquarePlus className="w-4 h-4 mr-2" /> Populate Starter Posts</>}
          </Button>
        </div>
      )}

      {postSeedDone && (
        <div className="rounded-xl border border-green-700/40 bg-green-900/20 p-3 mb-5 text-center">
          <p className="text-green-400 text-sm">✓ {SEED_POSTS.length} starter posts added across all categories!</p>
        </div>
      )}

      {seedError && <p className="text-red-400 text-sm text-center mb-4">{seedError}</p>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <Card
            key={category.id}
            onClick={() => navigate(createPageUrl("ForumCategoryPage") + `?category=${category.id}`)}
            className="cursor-pointer border-slate-700 bg-gradient-to-br from-slate-800/50 to-slate-900/50 hover:from-slate-800 hover:to-slate-800 transition-all p-6 text-center"
          >
            <div className="text-3xl mb-3">{iconMap[category.icon] || "🐾"}</div>
            <h3 className="font-semibold text-white mb-2">{category.name}</h3>
            <p className="text-xs text-slate-400 line-clamp-2">{category.description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

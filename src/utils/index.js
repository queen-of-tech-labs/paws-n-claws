// Utility to build internal page URLs
export function createPageUrl(pageNameOrPath) {
  if (!pageNameOrPath) return '/';
  
  // Handle query strings like "PetDetail?id=123"
  const [pageName, query] = pageNameOrPath.split('?');
  
  // Map PascalCase page names to URL paths
  const pageMap = {
    Home: '/',
    Dashboard: '/dashboard',
    PetProfiles: '/pets',
    PetDetail: '/pets/detail',
    CareTracker: '/care',
    HealthRecords: '/health',
    Appointments: '/appointments',
    VetFinder: '/vet-finder',
    VetNetwork: '/vet-network',
    AnimalRescues: '/rescues',
    PetReminders: '/reminders',
    PetCommunity: '/community',
    ForumCategoryPage: '/community/category',
    ForumPost: '/community/post',
    ForumCreatePost: '/community/create-post',
    PetCareGuides: '/guides',
    PetCareGuideCategory: '/guides/category',
    PetCareGuideDetail: '/guides/detail',
    PetAssistant: '/assistant',
    Account: '/account',
    NotificationPreferences: '/notifications',
    Feedback: '/feedback',
    AdminUsers: '/admin/users',
    AdminUserDetail: '/admin/user',
    AdminRescueSuggestions: '/admin/rescue-suggestions',
    AdminGuideManagement: '/admin/guides',
  };

  const path = pageMap[pageName] || `/${pageName.toLowerCase().replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}`;
  return query ? `${path}?${query}` : path;
}

export function cn(...inputs) {
  return inputs.filter(Boolean).join(' ');
}

// ============================================================================
// BREADCRUMB HELPER FUNCTIONS
// These can be imported by both server and client components
// ============================================================================

export interface BreadcrumbItem {
  label: string;
  href: string;
}

export function generateModuleBreadcrumbs(
  moduleTitle: string,
  moduleSlug: string,
): BreadcrumbItem[] {
  return [
    { label: "Modules", href: "/modules" },
    { label: moduleTitle, href: `/modules/${moduleSlug}` },
  ];
}

export function generateJurisdictionBreadcrumbs(
  country: string,
  countrySlug: string,
): BreadcrumbItem[] {
  return [
    { label: "Jurisdictions", href: "/jurisdictions" },
    { label: country, href: `/jurisdictions/${countrySlug}` },
  ];
}

export function generateBlogBreadcrumbs(
  postTitle: string,
  postSlug: string,
  category?: string,
): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [{ label: "Blog", href: "/blog" }];

  if (category) {
    items.push({
      label: category,
      href: `/blog/category/${category.toLowerCase().replace(/\s+/g, "-")}`,
    });
  }

  items.push({ label: postTitle, href: `/blog/${postSlug}` });

  return items;
}

export function generateGuideBreadcrumbs(
  guideTitle: string,
  guideSlug: string,
): BreadcrumbItem[] {
  return [
    { label: "Guides", href: "/guides" },
    { label: guideTitle, href: `/guides/${guideSlug}` },
  ];
}

export function generateGlossaryBreadcrumbs(
  term: string,
  termSlug: string,
): BreadcrumbItem[] {
  return [
    { label: "Glossary", href: "/glossary" },
    { label: term, href: `/glossary/${termSlug}` },
  ];
}

export function generateCompareBreadcrumbs(
  title: string,
  slug: string,
): BreadcrumbItem[] {
  return [
    { label: "Compare", href: "/compare" },
    { label: title, href: `/compare/${slug}` },
  ];
}

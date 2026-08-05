/**
 * SITE CONFIG
 * -----------
 * This is the single place to edit site TEXT content: background image,
 * contact info, pricing, bio, and section headings.
 *
 * PHOTOS are managed separately from the admin page (/admin) and stored
 * online so they show up for every visitor — you don't edit those here.
 */
window.SITE_CONFIG = {

  // Full-screen background image. Swap this path for a real photo any time —
  // drop the file into assets/images/ and point to it here.
  // A quick way to preview a different image without editing this file:
  // add ?bg=https://example.com/photo.jpg to the page URL.
  backgroundImage: "assets/images/IMG_0448.jpeg",

  hero: {
    availabilityLabel: "Books Open",
    availabilitySubtext: "Currently accepting new commissions",
    heading: "Cody Carlson",
    subheading: "Carving · Painting · Lapidary",
  },

  contact: {
    email: "cody@codycarlson.art",
    phone: "+17013895644",
    phoneDisplay: "(701) 389-5644",
    instagram: "", // e.g. "https://instagram.com/codycarlsonart" — leave blank to hide
  },

  // How the intake form is submitted.
  // "mailto"  -> opens the visitor's email client pre-filled with their message (works with zero setup).
  // "endpoint" -> POSTs the form as JSON to `endpoint` below (e.g. FormSubmit.co, Formspree, a custom API URL).
  form: {
    submitMode: "endpoint", // "mailto" | "endpoint"
    endpoint: "https://formsubmit.co/ajax/cody@codycarlson.art",
  },

  bio: {
    photo: "", // optional path to an artist portrait, e.g. "assets/images/cody-portrait.jpg"
    heading: "About the Work",
    paragraphs: [
      "Cody Carlson works across three disciplines that share a single obsession: coaxing form and color out of resistant material. Each piece begins as raw stone, wood, or canvas and is shaped slowly, by hand, until it holds light the way it was meant to.",
      "Commissions are taken on a limited basis to keep every piece personal — from the first sketch through the final polish.",
    ],
  },

  // ---- PRICING -------------------------------------------------------------
  // `pricingNote` shows at the top of the section as a general guide.
  // Each category can be priced two ways:
  //   • a flat `rate` (e.g. "$250 per foot"), or
  //   • a list of `tiers` (name / price / description).
  // Edit freely — the layout adapts.
  pricingNote: "Pricing is a general guide — every piece is custom, so the final cost varies with size, material, and detail. Consider each price shown the minimum investment to begin a commission. For pieces kept outdoors, plan on occasional upkeep — generally under $100 a year — to keep them looking their best.",

  pricing: [
    {
      category: "Carving",
      rate: "$250 per foot",
      description: "Priced by size. Final quote depends on material, detail, and finish.",
    },
    {
      category: "Painting",
      rate: "$0.80 per square inch",
      description: "Priced by finished canvas area (height × width in inches).",
    },
    {
      category: "Lapidary",
      tiers: [
        { name: "Small", price: "$150+", description: "Single cabochon or pendant stone, standard cuts." },
        { name: "Medium", price: "$500+", description: "Custom-faceted stone with setting-ready finish." },
        { name: "Large", price: "$1,500+", description: "Complex multi-stone or sculptural lapidary work." },
      ],
    },
  ],

  // ---- COLLABORATOR --------------------------------------------------------
  // The photo, headline, and bio here are just DEFAULTS/fallbacks. Once you
  // fill them in from the admin page they are managed there.
  collaborator: {
    sectionHeading: "Collaborator",
    headline: "",
    bio: "",
  },

  // ---- PHOTO GALLERIES (managed from /admin) -------------------------------
  // `max` is how many photo slots the admin page offers for each gallery.
  // On the public site only the photos you've actually added are shown —
  // empty slots never appear to visitors.
  galleries: {
    featured:    { heading: "Featured Work", label: "Piece",  max: 10 },
    studio:      { heading: "In the Studio", label: "Studio", max: 6 },
    stones:      { heading: "My Stones",     label: "Stone",  max: 6 },
    silverRings: { heading: "Silver Rings",  label: "Ring",   max: 6 },
  },

  // 4–6 sponsor / affiliate badges. Each needs a name, link, and logo path.
  // Leave `logo` empty to fall back to a text badge.
  sponsors: [
    { name: "Studio Supply Co.", url: "#", logo: "" },
    { name: "Northwest Stone Guild", url: "#", logo: "" },
    { name: "Artisan Materials", url: "#", logo: "" },
    { name: "Gallery Collective", url: "#", logo: "" },
  ],
};

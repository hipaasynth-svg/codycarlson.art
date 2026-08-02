/**
 * SITE CONFIG
 * -----------
 * This is the single place to edit site content: background image, contact
 * info, pricing, and sponsor badges. No other file needs to change for
 * routine content updates.
 */
window.SITE_CONFIG = {

  // Full-screen background image. Swap this path for a real photo any time —
  // drop the file into assets/images/ and point to it here.
  // A quick way to preview a different image without editing this file:
  // add ?bg=https://example.com/photo.jpg to the page URL.
  backgroundImage: "assets/images/background-placeholder.svg",

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

  interests: [
    "Carving",
    "Painting",
    "Lapidary",
    "Custom Commission",
    "Other",
  ],

  bio: {
    photo: "", // optional path to an artist portrait, e.g. "assets/images/cody-portrait.jpg"
    heading: "About the Work",
    paragraphs: [
      "Cody Carlson works across three disciplines that share a single obsession: coaxing form and color out of resistant material. Each piece begins as raw stone, wood, or canvas and is shaped slowly, by hand, until it holds light the way it was meant to.",
      "Commissions are taken on a limited basis to keep every piece personal — from the first sketch through the final polish.",
    ],
  },

  // Pricing is organized as category -> tiers. Edit freely; the layout
  // adapts to any number of categories or tiers.
  pricing: [
    {
      category: "Carving",
      tiers: [
        { name: "Small", price: "$450+", description: "Tabletop pieces up to 12\" — single material, simple form." },
        { name: "Medium", price: "$1,200+", description: "Statement pieces up to 24\" — detailed relief or figure work." },
        { name: "Large", price: "$3,000+", description: "Feature installations over 24\" — full custom design process." },
      ],
    },
    {
      category: "Painting",
      tiers: [
        { name: "Basic", price: "$300+", description: "Canvas up to 16x20\" — single subject, limited palette." },
        { name: "Standard", price: "$800+", description: "Canvas up to 24x36\" — full color range, layered technique." },
        { name: "Premium", price: "$2,000+", description: "Large-scale or multi-panel commissions, fully custom." },
      ],
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

  // 4–6 sponsor / affiliate badges. Each needs a name, link, and logo path.
  // Leave `logo` empty to fall back to a text badge.
  sponsors: [
    { name: "Studio Supply Co.", url: "#", logo: "" },
    { name: "Northwest Stone Guild", url: "#", logo: "" },
    { name: "Artisan Materials", url: "#", logo: "" },
    { name: "Gallery Collective", url: "#", logo: "" },
  ],

  rolodex: {
    main: { slots: 10, storageKey: "cc_rolodex_main" },
    secondary: { slots: 6, storageKey: "cc_rolodex_secondary" },
  },
};

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

  // Full-screen background. You can now run a SLIDESHOW of up to 20 photos —
  // add them from the admin page (/admin) under "Background Slideshow" and
  // they cross-fade automatically. `backgroundImage` below is the single-image
  // fallback used before any slideshow photos are added (and while the admin
  // manifest is loading). Drop a file into assets/images/ and point to it here.
  // A quick way to preview a different image without editing this file:
  // add ?bg=https://example.com/photo.jpg to the page URL.
  backgroundImage: "assets/images/IMG_0448.jpeg",

  // How long each background slideshow photo stays before cross-fading (ms).
  backgroundSlideInterval: 6000,

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
    heading: "About the Artist",
    paragraphs: [
      "Cody Carlson is a self-taught sculptor based in Minot, North Dakota. Over nine years and more than a thousand works, he has refined a focused practice centered on wildlife, the human form, and animal companions. His sculptures emphasize clarity of form, the natural character of the wood, and a vivid sense of life, with particular attention given to the eyes and a quiet, forward-leaning whimsy that animates each piece.",
      "Working without formal training, Carlson continues to evolve through ongoing experimentation and new lines of inquiry, allowing each phase of the work to open into the next. This restless engagement with material and idea steadily strengthens the practice, moving it toward durable presence within the cultural and regional landscape of the Northern Plains.",
      "His sculptures range from polished outdoor-ready figures to more abstract forms, each carrying the quiet authority of long and consistent studio work. Carlson's work is available through codycarlson.art.",
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
      rate: "60–80¢ per square inch",
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

  // ---- BOOKABLE SERVICES (demos + on-site carving) -------------------------
  // Two offerings shown in their own section: each has a description, a required
  // deposit (shown as text), and a call-to-action that opens the inquiry form
  // pre-filled. Edit the copy and the `deposit` amounts here.
  //   • title       — the offering's name.
  //   • description — the paragraph shown in the card (the "description box").
  //   • deposit     — the required deposit amount, e.g. "$100".
  //   • depositNote — a short line under the deposit (what it covers).
  //   • cta         — the button label.
  //   • inquiry     — the message pre-written into the contact form when the
  //                   button is clicked.
  offeringsHeading: "Demonstrations & On-site Carving",
  offerings: [
    {
      id: "demo",
      title: "Purchase a Demo",
      // PLACEHOLDER — replace with Cody's wording.
      description: "Watch a piece come to life from the first cut. Book a live carving demonstration — in person or streamed — and take home the finished work at the end.",
      deposit: "$100", // PLACEHOLDER amount — set the real deposit.
      depositNote: "Required to reserve your date. Applied toward your final total.",
      cta: "Book a Demo",
      inquiry: "I'd like to book a carving demo.",
    },
    {
      id: "onsite",
      title: "On-site Carving",
      // PLACEHOLDER — replace with Cody's wording.
      description: "Have Cody carve on location — at your event, gallery, business, or gathering. Scope, scale, and subject are tailored to the occasion.",
      deposit: "$250", // PLACEHOLDER amount — set the real deposit.
      depositNote: "Required to book your date. Applied toward your final total.",
      cta: "Request On-site Carving",
      inquiry: "I'm interested in on-site carving.",
    },
  ],

  // ---- AVAILABLE NOW (finished pieces for sale, with Stripe checkout) ------
  // Finished work a visitor can BUY right now with a card, instead of only
  // commissioning something new. Each piece renders as a card showing its
  // photo, size, and PRICE, with a Buy button that goes to Stripe checkout.
  //
  // Leave `availableWork` empty ([]) to hide the whole section.
  //
  // Fields for each piece:
  //   • image  — path to a photo, e.g. "assets/images/summer-walleye.jpg".
  //              Drop the file into assets/images/ and point to it here.
  //              Blank shows a "Photo coming soon" placeholder tile.
  //   • price  — the price shown next to the work, e.g. "$1,200". Blank shows
  //              "Inquire for price". This is DISPLAY ONLY — the amount the
  //              buyer is actually charged comes from Stripe (see below), so
  //              keep this in sync with the Stripe price you set up.
  //   • status — "available" (default), "reserved", or "sold". Anything other
  //              than "available" shows a ribbon and disables the Buy button.
  //
  // NOTE: The paintings store is normally managed from the admin page (/admin)
  // under "Paintings for Sale" — 18 slots, each with a photo, price, and Stripe
  // link — so Cody can update it without editing this file. The list below is
  // only a fallback shown when no paintings have been added in /admin yet.
  //
  // Hooking up Stripe — two ways, pick whichever is easier. If both are set,
  // `buyUrl` wins. If neither is set, the button falls back to "Reserve this
  // piece", which pre-fills the inquiry form below.
  //
  //   A) Payment Link (simplest — NO server setup, no secret keys):
  //      In the Stripe Dashboard create a Payment Link for the piece, copy its
  //      https://buy.stripe.com/... URL, and paste it as `buyUrl`.
  //        buyUrl: "https://buy.stripe.com/xxxxxxxx"
  //
  //   B) On-site Checkout (keeps buyers on your domain):
  //      In Stripe create a Product + Price for the piece, copy the Price ID
  //      (starts with "price_"), and set it as `stripePriceId`. This uses the
  //      /api/checkout function, which needs the STRIPE_SECRET_KEY environment
  //      variable set on the Vercel project (same place as ADMIN_PASSWORD).
  //        stripePriceId: "price_xxxxxxxx"
  availableHeading: "Available Now",
  availableIntro: "Finished, one-of-a-kind pieces ready to ship. Buy directly below, or start a custom commission.",

  // A short reassurance line shown under both store carousels (paintings and
  // sculptures). Keep it factually true — it's a trust cue at the point of
  // purchase. Default speaks to secure Stripe checkout and invites shipping
  // questions rather than promising a specific policy. Leave blank to hide it.
  storeTrustNote: "Secure card checkout, powered by Stripe. Questions about a piece — sizing, shipping, or an extra photo? Start an inquiry below and I'll get right back to you.",

  // ---- SCULPTURES (finished pieces for sale, with Stripe checkout) ---------
  // Same card + checkout behavior as the paintings store above, shown as its
  // own carousel at the TOP of the page. Managed from /admin → "Sculptures"
  // (8 slots), so this section stays hidden until real pieces are added there.
  sculptureHeading: "Sculptures",
  sculptureIntro: "Hand-carved, one-of-a-kind sculptures ready to ship. Buy directly below, or start a custom commission.",
  // Managed from /admin → "Paintings for Sale". This stays EMPTY so the section
  // is simply hidden until real pieces are added there — no placeholder cards
  // ever show to visitors. (You could hard-code fallback pieces here using the
  // fields documented above, but /admin is the normal way.)
  availableWork: [],

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

  // Paintings-for-sale store (managed from /admin → "Paintings for Sale").
  // 18 slots, each with a photo, price, and Stripe link. `max` is the number
  // of slots the admin page offers.
  paintings: { heading: "Paintings for Sale", label: "Painting", max: 18 },

  // Sculptures-for-sale store (managed from /admin → "Sculptures"). 8 slots,
  // each with a photo, price, and Stripe link. `max` is the number of slots the
  // admin page offers.
  sculptures: { heading: "Sculptures", label: "Sculpture", max: 8 },

  // Background slideshow (managed from /admin → "Background Slideshow").
  // Up to `max` full-screen photos that cross-fade behind the site.
  background: { heading: "Background Slideshow", label: "Background", max: 20 },

  // Real sponsor / affiliate badges. Each needs a name, a real `url`, and an
  // optional logo path (leave `logo` empty to fall back to a text badge).
  // The whole "Proudly supported by" footer block is hidden while this is
  // empty — add only genuine partners here. Placeholder badges with "#" links
  // read as fake and hurt trust, so this ships empty until real ones exist.
  // Example:
  //   { name: "Northwest Stone Guild", url: "https://example.com", logo: "" },
  sponsors: [],
};

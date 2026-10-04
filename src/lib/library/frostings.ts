import type { CuratedFrosting, Reference } from "./types";

/**
 * Curated frosting library. Ratios are our own, designed by comparing the verified references
 * listed on each entry (and kept consistent with the frosting calculator's base ratios).
 * Batches are scaled to the quantity the frosting calculator estimates for a given cake.
 */

const VERIFIED = "2026-10-04";
const ref = (r: Omit<Reference, "verifiedAt">): Reference => ({ ...r, verifiedAt: VERIFIED });

export const FROSTINGS: CuratedFrosting[] = [
  /* ─────────────────────────── American buttercream ─────────────────────────── */
  {
    id: "american-buttercream",
    name: "American vanilla buttercream",
    type: "buttercream",
    tags: ["buttercream", "vanilla", "american buttercream", "butter cream", "vanilla frosting", "birthday"],
    diet: { eggless: true, vegan: false, glutenFree: true, dairyFree: false },
    batchGrams: 800,
    ingredients: [
      { group: "American vanilla buttercream", name: "Unsalted butter", grams: 250, ml: null, householdMeasure: "1 cup + 2 tbsp", notes: "softened to about 20 °C — it should dent easily but not look greasy", role: "fat / body", shoppingName: "unsalted butter" },
      { group: "American vanilla buttercream", name: "Icing (powdered) sugar", grams: 500, ml: null, householdMeasure: "about 4 cups", notes: "sifted", role: "sweetness / structure", shoppingName: "icing sugar" },
      { group: "American vanilla buttercream", name: "Heavy cream or whole milk", grams: null, ml: 40, householdMeasure: "2 tbsp + 2 tsp", notes: "room temperature; add more 1 tsp at a time to loosen", role: "consistency", shoppingName: "whipping cream" },
      { group: "American vanilla buttercream", name: "Pure vanilla extract", grams: null, ml: 8, householdMeasure: "1 ½ tsp", notes: null, role: "flavour", shoppingName: "vanilla extract" },
      { group: "American vanilla buttercream", name: "Fine salt", grams: 1, ml: null, householdMeasure: "⅛ tsp", notes: "balances the sweetness", role: "flavour balance", shoppingName: "salt" },
    ],
    method: [
      { title: "Cream the fat", text: "Beat the softened butter on medium speed for 3–4 minutes until it turns pale and fluffy.", why: "Aerating the fat first gives a lighter, less dense frosting that spreads easily." },
      { title: "Add the sugar gradually", text: "With the mixer on low, add the sifted icing sugar in three additions, mixing until no dry sugar remains after each.", why: "Low speed stops a sugar cloud and lumps from forming." },
      { title: "Loosen and flavour", text: "Add the vanilla, salt and half the cream. Beat on medium-high for 2 minutes. Add the remaining cream only if needed for a soft, spreadable texture.", why: null },
      { title: "Smooth it out", text: "For a very smooth finish, stir for 1–2 minutes by hand or on the lowest speed with the paddle to push out large air bubbles before coating the cake.", why: "Fewer air pockets means smoother sides and sharper edges." },
    ],
    notes: "Stiffer consistency (less cream) for piping borders and roses; softer for filling and coating. Crusts lightly as it dries, which helps with smooth finishes. It is the sweetest of the buttercreams — the salt matters.",
    climateNotes: "In hot, humid climates (Singapore, much of India) butter-based frosting softens within an hour at room temperature. Work in an air-conditioned room, chill the cake between coats, and keep it refrigerated until about 20 minutes before serving. Replacing up to a quarter of the butter with vegetable shortening improves heat stability.",
    references: [
      ref({ name: "Sally's Baking Recipes", title: "Vanilla Buttercream Frosting", url: "https://sallysbakingaddiction.com/vanilla-buttercream/", author: "Sally", rating: 4.7, reviewCount: 158, whatWeTook: "Butter-to-sugar range of about 1 : 2–2.6 and a splash of cream; we sit at the lower 1 : 2 end for a less sweet, softer frosting." }),
    ],
  },

  /* ─────────────────────────── Chocolate buttercream ─────────────────────────── */
  {
    id: "chocolate-buttercream",
    name: "Chocolate buttercream",
    type: "chocolate_frosting",
    tags: ["chocolate buttercream", "chocolate frosting", "chocolate", "cocoa", "fudge frosting", "birthday"],
    diet: { eggless: true, vegan: false, glutenFree: true, dairyFree: false },
    batchGrams: 790,
    ingredients: [
      { group: "Chocolate buttercream", name: "Unsalted butter", grams: 250, ml: null, householdMeasure: "1 cup + 2 tbsp", notes: "softened to about 20 °C", role: "fat / body", shoppingName: "unsalted butter" },
      { group: "Chocolate buttercream", name: "Icing (powdered) sugar", grams: 400, ml: null, householdMeasure: "about 3 ⅓ cups", notes: "sifted", role: "sweetness / structure", shoppingName: "icing sugar" },
      { group: "Chocolate buttercream", name: "Unsweetened cocoa powder", grams: 75, ml: null, householdMeasure: "¾ cup", notes: "sifted; Dutch-process gives a darker, smoother result", role: "flavour / colour", shoppingName: "cocoa powder" },
      { group: "Chocolate buttercream", name: "Heavy cream or whole milk", grams: null, ml: 60, householdMeasure: "¼ cup", notes: "room temperature", role: "consistency", shoppingName: "whipping cream" },
      { group: "Chocolate buttercream", name: "Pure vanilla extract", grams: null, ml: 5, householdMeasure: "1 tsp", notes: null, role: "flavour", shoppingName: "vanilla extract" },
      { group: "Chocolate buttercream", name: "Fine salt", grams: 1.5, ml: null, householdMeasure: "¼ tsp", notes: null, role: "flavour balance", shoppingName: "salt" },
    ],
    method: [
      { title: "Beat the butter", text: "Beat the butter on medium-high for 3–5 minutes until pale and fluffy.", why: null },
      { title: "Add cocoa and flavourings", text: "Add the sifted cocoa, salt and vanilla and mix on low until evenly brown.", why: "Mixing cocoa into the fat first coats the particles so it never tastes dusty." },
      { title: "Alternate sugar and cream", text: "Add the icing sugar in three parts on low speed, alternating with splashes of cream, until all is incorporated.", why: "Alternating keeps the frosting from going stiff and crumbly or too wet at any point." },
      { title: "Whip and adjust", text: "Beat on medium for 1–2 minutes until fluffy. Add a teaspoon more cream if stiff, or a spoonful more icing sugar if too soft to pipe.", why: null },
    ],
    notes: "For a deeper, fudgier flavour beat in 60–100 g melted and cooled (not warm) dark chocolate at the end. A pinch of instant espresso powder intensifies the chocolate without tasting of coffee.",
    climateNotes: "Butter-based — in hot, humid weather keep the frosted cake chilled and serve within about 30 minutes out of the fridge.",
    references: [
      ref({ name: "Preppy Kitchen", title: "Chocolate Buttercream Frosting", url: "https://preppykitchen.com/chocolate-buttercream/", author: null, rating: 4.97, reviewCount: 191, whatWeTook: "Cocoa at roughly 15% of the butter-and-sugar mass and alternating sugar with cream; we use less sugar (1 : 1.6 butter to sugar) for a less sweet result." }),
      ref({ name: "Chelsweets", title: "Chocolate Buttercream", url: "https://chelsweets.com/chocolate-buttercream-frosting/", author: null, rating: 4.87, reviewCount: 114, whatWeTook: "The option of adding melted, cooled dark chocolate for a fudgier flavour, offered here as an optional upgrade." }),
    ],
  },

  /* ─────────────────────────── Dark chocolate ganache ─────────────────────────── */
  {
    id: "dark-chocolate-ganache",
    name: "Dark chocolate ganache",
    type: "chocolate_ganache",
    tags: ["ganache", "chocolate ganache", "dark chocolate", "chocolate", "drip", "truffle"],
    diet: { eggless: true, vegan: false, glutenFree: true, dairyFree: false },
    batchGrams: 600,
    ingredients: [
      { group: "Dark chocolate ganache", name: "Dark chocolate (55–70% cocoa)", grams: 400, ml: null, householdMeasure: "about 2 ⅓ cups chopped", notes: "finely chopped bar chocolate or couverture — not compound/candy coating", role: "structure / flavour", shoppingName: "dark chocolate" },
      { group: "Dark chocolate ganache", name: "Heavy whipping cream (35%+ fat)", grams: null, ml: 200, householdMeasure: "¾ cup + 1 tbsp", notes: "heated until just steaming", role: "liquid / emulsion", shoppingName: "whipping cream" },
      { group: "Dark chocolate ganache", name: "Fine salt", grams: 0.5, ml: null, householdMeasure: "pinch", notes: null, role: "flavour", shoppingName: "salt" },
    ],
    method: [
      { title: "Chop finely", text: "Chop the chocolate into small, even pieces and put it in a heatproof bowl.", why: "Small pieces melt evenly from the cream's heat alone, so the chocolate never scorches." },
      { title: "Heat the cream", text: "Heat the cream until small bubbles appear around the edge (about 85–90 °C). Do not let it boil hard.", why: "Boiling cream can make the ganache split and greasy." },
      { title: "Rest, then stir", text: "Pour the hot cream over the chocolate, add the salt, and leave untouched for 3–4 minutes. Stir slowly from the centre outwards until glossy and smooth.", why: "Stirring from the centre builds a stable emulsion; stirring fast adds air bubbles." },
      { title: "Fix if needed", text: "If unmelted pieces remain, warm in 10-second microwave bursts or over barely simmering water, stirring between each.", why: null },
      { title: "Set to the right stage", text: "For drips use at about 30–32 °C. For filling or coating, cool at room temperature (or 20 minutes in the fridge, stirring every 5 minutes) until thick like peanut butter.", why: "Ganache that's too warm runs off the cake; too cold and it tears the crumb." },
    ],
    notes: "Ratio by weight decides the texture. 2 : 1 chocolate to cream (this batch) sets firm — best for coating, sharp edges and under fondant. 1 : 1 (e.g. 300 g chocolate + 300 ml cream) stays soft — best for drips, glazes, soft fillings, or whipping into a fluffy frosting once fully chilled. With 70%+ chocolate, add 10–15% more cream to avoid a dry, stiff set.",
    climateNotes: "Ganache is the most heat-tolerant frosting here. A 2 : 1 ganache holds well in tropical heat and humidity (Singapore, India) — a good choice for outdoor parties where buttercream or whipped cream would melt.",
    references: [
      ref({ name: "King Arthur Baking", title: "Chocolate Ganache", url: "https://www.kingarthurbaking.com/recipes/chocolate-ganache-recipe", author: "King Arthur Test Kitchen", rating: 4.7, reviewCount: 23, whatWeTook: "A ratio range from about 1.25 : 1 up to 2 : 1 chocolate to cream depending on use; we default to 2 : 1 for a firm coating." }),
      ref({ name: "Sally's Baking Recipes", title: "How to Make Chocolate Ganache", url: "https://sallysbakingaddiction.com/chocolate-ganache/", author: "Sally", rating: 4.7, reviewCount: 140, whatWeTook: "The 1 : 1 pourable ratio for drips and glazes, and the method of resting the chocolate in hot cream before stirring." }),
      ref({ name: "Preppy Kitchen", title: "Chocolate Ganache Recipe", url: "https://preppykitchen.com/chocolate-ganache/", author: null, rating: 4.95, reviewCount: 73, whatWeTook: "A 1.5 : 1 middle ratio, which confirmed the spreadable middle ground between our coating and drip guidance." }),
    ],
  },

  /* ─────────────────────────── White chocolate ganache ─────────────────────────── */
  {
    id: "white-chocolate-ganache",
    name: "White chocolate ganache",
    type: "chocolate_ganache",
    tags: ["white chocolate ganache", "white chocolate", "ganache", "drip", "white"],
    diet: { eggless: true, vegan: false, glutenFree: true, dairyFree: false },
    batchGrams: 600,
    ingredients: [
      { group: "White chocolate ganache", name: "White chocolate (real cocoa butter)", grams: 450, ml: null, householdMeasure: "about 2 ¾ cups chopped", notes: "finely chopped; avoid 'white compound' or candy melts", role: "structure / sweetness", shoppingName: "white chocolate" },
      { group: "White chocolate ganache", name: "Heavy whipping cream (35%+ fat)", grams: null, ml: 150, householdMeasure: "½ cup + 2 tbsp", notes: "heated until just steaming", role: "liquid / emulsion", shoppingName: "whipping cream" },
    ],
    method: [
      { title: "Chop and warm gently", text: "Chop the white chocolate finely into a heatproof bowl.", why: "White chocolate scorches easily — small pieces need less heat." },
      { title: "Add hot cream", text: "Heat the cream until it just steams (about 80 °C, not boiling) and pour it over the chocolate. Leave for 3 minutes.", why: "White chocolate burns and seizes at lower temperatures than dark." },
      { title: "Stir smooth", text: "Stir slowly from the centre until glossy. If lumps remain, warm in 10-second microwave bursts at 50% power.", why: null },
      { title: "Colour and set", text: "Stir in oil-based or gel food colour if wanted. Use for drips at about 28–30 °C, or cool until thick for filling and coating.", why: "White chocolate sets softer than dark, which is why it needs so much less cream." },
    ],
    notes: "3 : 1 white chocolate to cream sets firm enough to coat and fill; for drips use about 2.5 : 1 and test on a chilled cake. White chocolate brands vary a lot in cocoa butter — if it stays too soft, melt in a little more chocolate.",
    climateNotes: "Softer than dark ganache in heat; in tropical climates chill the cake and avoid long outdoor display.",
    references: [
      ref({ name: "Chelsweets", title: "White Chocolate Ganache Macaron Filling", url: "https://chelsweets.com/white-chocolate-ganache-for-macarons/", author: null, rating: 4.94, reviewCount: 15, whatWeTook: "A roughly 2.6 : 1 white chocolate to cream firm-filling ratio; we go slightly firmer (3 : 1) for coating a whole cake." }),
      ref({ name: "Sally's Baking Recipes", title: "How to Make Chocolate Ganache", url: "https://sallysbakingaddiction.com/chocolate-ganache/", author: "Sally", rating: 4.7, reviewCount: 140, whatWeTook: "The guidance that white chocolate needs noticeably less cream than dark to set." }),
    ],
  },

  /* ─────────────────────────── Stabilised whipped cream ─────────────────────────── */
  {
    id: "stabilised-whipped-cream",
    name: "Stabilised whipped cream",
    type: "whipped_cream",
    tags: ["whipped cream", "fresh cream", "chantilly", "cream", "light frosting", "not too sweet", "black forest", "pineapple"],
    diet: { eggless: true, vegan: false, glutenFree: true, dairyFree: false },
    batchGrams: 690,
    ingredients: [
      { group: "Stabilised whipped cream", name: "Heavy whipping cream (35%+ fat)", grams: null, ml: 500, householdMeasure: "2 cups + 2 tbsp", notes: "very cold, straight from the fridge", role: "body / aeration", shoppingName: "whipping cream" },
      { group: "Stabilised whipped cream", name: "Mascarpone", grams: 125, ml: null, householdMeasure: "½ cup", notes: "cold — the stabiliser", role: "stabiliser", shoppingName: "mascarpone" },
      { group: "Stabilised whipped cream", name: "Icing (powdered) sugar", grams: 60, ml: null, householdMeasure: "½ cup", notes: "sifted; the cornstarch in it also helps stability", role: "sweetness", shoppingName: "icing sugar" },
      { group: "Stabilised whipped cream", name: "Pure vanilla extract", grams: null, ml: 5, householdMeasure: "1 tsp", notes: null, role: "flavour", shoppingName: "vanilla extract" },
    ],
    method: [
      { title: "Chill everything", text: "Chill the bowl and whisk in the freezer for 15–20 minutes. Keep the cream and mascarpone in the fridge until the moment you use them.", why: "Fat globules trap air only when cold; warm cream won't hold peaks." },
      { title: "Loosen the stabiliser", text: "Whisk the mascarpone, icing sugar and vanilla together on low for 20–30 seconds until smooth.", why: "Smoothing it first prevents tiny lumps of mascarpone in the finished cream." },
      { title: "Add cream gradually", text: "With the mixer on medium, pour in the cold cream in 3–4 additions down the side of the bowl.", why: null },
      { title: "Whip to firm peaks", text: "Increase to medium-high and whip until firm peaks form (usually 2–4 minutes). Stop as soon as the peaks hold and the cream looks smooth.", why: "Seconds past firm peaks it turns grainy and starts separating into butter." },
      { title: "Use cold", text: "Fill and frost immediately, then refrigerate the cake for at least 1 hour to firm up before slicing.", why: null },
    ],
    notes: "Alternative stabilisers: (1) Gelatin — bloom 1 tsp (3 g) powdered gelatin in 1 tbsp cold water, melt briefly, cool to lukewarm and stream it in at soft peaks (not vegetarian). (2) Milk powder — whisk 2 tbsp (15 g) milk powder with the sugar; gentler hold. Unstabilised cream weeps within hours. Lightest, least sweet option; ideal for fruit cakes, Black Forest and pineapple cakes. Not suited to tall stacked cakes or fondant.",
    climateNotes: "Whipped cream is the least heat-tolerant frosting. In Singapore or Indian summers, keep the cake in the fridge until serving, frost in an air-conditioned room, and avoid outdoor display — it can slump within 20–30 minutes at 30 °C+. If your local cream is 25% fat ('cooking cream'), it will not whip — buy whipping cream labelled 35% fat or more.",
    references: [
      ref({ name: "Chelsweets", title: "Whipped Cream Cheese Frosting", url: "https://chelsweets.com/whipped-cream-frosting-with-cream-cheese/", author: null, rating: 4.92, reviewCount: 226, whatWeTook: "Using a cold, cultured soft cheese as the stabiliser at about 1 part to 2.5 parts cream; we use mascarpone for a cleaner, less tangy flavour." }),
      ref({ name: "Sally's Baking Recipes", title: "Not-So-Sweet Whipped Frosting", url: "https://sallysbakingaddiction.com/whipped-frosting/", author: "Sally", rating: 4.6, reviewCount: 159, whatWeTook: "Smoothing the stabiliser with the sugar first, then streaming in very cold cream; low sugar level (about 12% of the cream)." }),
    ],
  },

  /* ─────────────────────────── Cream cheese frosting ─────────────────────────── */
  {
    id: "cream-cheese-frosting",
    name: "Cream cheese frosting",
    type: "cream_cheese",
    tags: ["cream cheese", "cream cheese frosting", "tangy", "red velvet", "carrot cake"],
    diet: { eggless: true, vegan: false, glutenFree: true, dairyFree: false },
    batchGrams: 705,
    ingredients: [
      { group: "Cream cheese frosting", name: "Full-fat block cream cheese", grams: 225, ml: null, householdMeasure: "8 oz (1 block)", notes: "cool room temperature — not tub or spreadable", role: "tang / body", shoppingName: "cream cheese" },
      { group: "Cream cheese frosting", name: "Unsalted butter", grams: 115, ml: null, householdMeasure: "½ cup", notes: "softened", role: "fat / stability", shoppingName: "unsalted butter" },
      { group: "Cream cheese frosting", name: "Icing (powdered) sugar", grams: 360, ml: null, householdMeasure: "3 cups", notes: "sifted", role: "sweetness / structure", shoppingName: "icing sugar" },
      { group: "Cream cheese frosting", name: "Pure vanilla extract", grams: null, ml: 5, householdMeasure: "1 tsp", notes: null, role: "flavour", shoppingName: "vanilla extract" },
      { group: "Cream cheese frosting", name: "Fine salt", grams: 0.5, ml: null, householdMeasure: "pinch", notes: null, role: "flavour balance", shoppingName: "salt" },
    ],
    method: [
      { title: "Cream butter first", text: "Beat the softened butter for 1–2 minutes until smooth and creamy.", why: null },
      { title: "Add the cream cheese", text: "Add the cream cheese and beat on medium just until combined and lump-free, about 30–60 seconds.", why: "Over-beating cream cheese breaks it down and makes the frosting runny." },
      { title: "Add sugar", text: "Add the icing sugar, vanilla and salt. Mix on low until incorporated, then beat on medium-high for 1 minute until fluffy.", why: null },
      { title: "Chill if soft", text: "If too soft to spread or pipe, refrigerate for 15–20 minutes and re-stir briefly before using.", why: "Cream cheese frosting firms considerably as the butter chills." },
    ],
    notes: "Softer than buttercream: great for filling and rustic coats, less suited to sharp edges or tall stacked cakes. For stiffer piping add up to 120 g more icing sugar. Must be refrigerated.",
    climateNotes: "Perishable and soft — in hot climates refrigerate the frosted cake and serve straight from the fridge; do not leave out for more than an hour.",
    references: [
      ref({ name: "Sally's Baking Recipes", title: "Favorite Cream Cheese Frosting", url: "https://sallysbakingaddiction.com/favorite-cream-cheese-frosting/", author: "Sally", rating: 4.7, reviewCount: 169, whatWeTook: "The 2 : 1 cream cheese to butter ratio with about 1.6 parts icing sugar to cream cheese, which we adopted directly." }),
      ref({ name: "Preppy Kitchen", title: "Cream Cheese Frosting Recipe", url: "https://preppykitchen.com/cream-cheese-frosting/", author: null, rating: 4.91, reviewCount: 103, whatWeTook: "The option of extra icing sugar (up to about 3 : 1 sugar to cheese) for a stiffer, pipeable frosting." }),
    ],
  },

  /* ─────────────────────────── Swiss meringue buttercream ─────────────────────────── */
  {
    id: "swiss-meringue-buttercream",
    name: "Swiss meringue buttercream",
    type: "swiss_meringue",
    tags: ["swiss meringue", "smbc", "meringue buttercream", "silky", "not too sweet", "wedding"],
    diet: { eggless: false, vegan: false, glutenFree: true, dairyFree: false },
    batchGrams: 760,
    ingredients: [
      { group: "Swiss meringue buttercream", name: "Egg whites", grams: 150, ml: null, householdMeasure: "about 5 large egg whites", notes: "completely free of yolk", role: "foam / structure", shoppingName: "eggs" },
      { group: "Swiss meringue buttercream", name: "Granulated sugar", grams: 225, ml: null, householdMeasure: "1 cup + 2 tbsp", notes: null, role: "sweetness / meringue stability", shoppingName: "caster sugar" },
      { group: "Swiss meringue buttercream", name: "Unsalted butter", grams: 375, ml: null, householdMeasure: "1 ⅔ cups", notes: "softened but cool (about 18–20 °C), cut into tablespoon pieces", role: "fat / body", shoppingName: "unsalted butter" },
      { group: "Swiss meringue buttercream", name: "Pure vanilla extract", grams: null, ml: 8, householdMeasure: "1 ½ tsp", notes: null, role: "flavour", shoppingName: "vanilla extract" },
      { group: "Swiss meringue buttercream", name: "Fine salt", grams: 1, ml: null, householdMeasure: "⅛ tsp", notes: null, role: "flavour balance", shoppingName: "salt" },
    ],
    method: [
      { title: "Degrease the bowl", text: "Wipe the mixer bowl and whisk with a paper towel dampened with lemon juice or vinegar.", why: "Any trace of fat or yolk stops egg whites from whipping." },
      { title: "Heat whites and sugar", text: "Whisk the egg whites and sugar in the bowl set over a pan of barely simmering water (bowl not touching the water). Whisk constantly until the sugar dissolves and it reaches 71 °C (160 °F) — rub a drop between your fingers: no grittiness.", why: "Heating to 71 °C dissolves the sugar and pasteurises the whites." },
      { title: "Whip the meringue", text: "Move the bowl to the mixer and whip on high for 8–12 minutes until stiff, glossy and the outside of the bowl feels cool (about 25 °C).", why: "Adding butter to warm meringue melts it into a soupy mess." },
      { title: "Add butter slowly", text: "Switch to the paddle. On medium, add the butter one piece at a time, letting each disappear before the next.", why: null },
      { title: "Beat through the curdle", text: "It will look curdled partway — keep beating. After 3–5 minutes it turns silky. Beat in vanilla and salt.", why: "The emulsion only forms once enough butter is in and the temperature is right." },
      { title: "Troubleshoot temperature", text: "Soupy? Chill the bowl 10–15 minutes, then beat again. Curdled and stiff? Warm the outside of the bowl briefly with a hair dryer or a warm towel while beating.", why: null },
      { title: "Smooth before use", text: "Beat on low with the paddle for 2 minutes to remove air bubbles before frosting.", why: "Low-speed beating gives the glassy, bubble-free finish SMBC is known for." },
    ],
    notes: "Silky, smooth and much less sweet than American buttercream; excellent for sharp edges and under fondant. Keeps a week refrigerated — bring to room temperature and re-beat before use. Ratio is about 1 : 1.5 : 2.5 whites : sugar : butter.",
    climateNotes: "All-butter — in hot, humid climates it softens quickly. Keep the cake refrigerated and serve soon after removing; avoid outdoor display above about 27 °C.",
    references: [
      ref({ name: "Sally's Baking Recipes", title: "Swiss Meringue Buttercream", url: "https://sallysbakingaddiction.com/swiss-meringue-buttercream/", author: "Sally", rating: 4.7, reviewCount: 503, whatWeTook: "Heating the whites and sugar to 71 °C and adding butter a piece at a time; her version is sweeter (about 1 : 2.2 : 1.9) — we use more butter and less sugar for a silkier, less sweet result." }),
      ref({ name: "Preppy Kitchen", title: "How to Make Italian Buttercream", url: "https://preppykitchen.com/how-to-make-italian-buttercream/", author: null, rating: 4.97, reviewCount: 791, whatWeTook: "The higher-butter meringue buttercream ratio (around 3.8 parts butter to 1 part whites), which informed our 2.5 : 1 butter level." }),
    ],
  },

  /* ─────────────────────────── Italian meringue buttercream ─────────────────────────── */
  {
    id: "italian-meringue-buttercream",
    name: "Italian meringue buttercream",
    type: "italian_meringue",
    tags: ["italian meringue", "imbc", "meringue buttercream", "wedding", "silky", "stable"],
    diet: { eggless: false, vegan: false, glutenFree: true, dairyFree: false },
    batchGrams: 700,
    ingredients: [
      { group: "Italian meringue buttercream", name: "Egg whites", grams: 120, ml: null, householdMeasure: "about 4 large egg whites", notes: "room temperature, completely free of yolk", role: "foam / structure", shoppingName: "eggs" },
      { group: "Italian meringue buttercream", name: "Granulated sugar (for the syrup)", grams: 135, ml: null, householdMeasure: "⅔ cup", notes: null, role: "syrup", shoppingName: "caster sugar" },
      { group: "Italian meringue buttercream", name: "Water", grams: null, ml: 50, householdMeasure: "3 ½ tbsp", notes: null, role: "syrup", shoppingName: "water" },
      { group: "Italian meringue buttercream", name: "Granulated sugar (for the whites)", grams: 30, ml: null, householdMeasure: "2 ½ tbsp", notes: null, role: "meringue stability", shoppingName: "caster sugar" },
      { group: "Italian meringue buttercream", name: "Cream of tartar", grams: 0.5, ml: null, householdMeasure: "⅛ tsp", notes: "optional", role: "foam stability", shoppingName: "cream of tartar" },
      { group: "Italian meringue buttercream", name: "Unsalted butter", grams: 360, ml: null, householdMeasure: "1 ½ cups + 1 tbsp", notes: "room temperature (about 20 °C), cut into pieces", role: "fat / body", shoppingName: "unsalted butter" },
      { group: "Italian meringue buttercream", name: "Pure vanilla extract", grams: null, ml: 5, householdMeasure: "1 tsp", notes: null, role: "flavour", shoppingName: "vanilla extract" },
      { group: "Italian meringue buttercream", name: "Fine salt", grams: 1, ml: null, householdMeasure: "⅛ tsp", notes: null, role: "flavour balance", shoppingName: "salt" },
    ],
    method: [
      { title: "Start the syrup", text: "In a small heavy pan, stir the 135 g sugar and water over medium heat until dissolved, then stop stirring and boil. Clip on a sugar thermometer.", why: "Stirring once it boils can make the syrup crystallise." },
      { title: "Whip the whites", text: "When the syrup reaches about 110 °C, start whipping the egg whites and cream of tartar on medium. At soft peaks, add the 30 g sugar gradually.", why: "Timing the whites to reach soft peaks just as the syrup is ready keeps both at their best." },
      { title: "Stream in hot syrup", text: "When the syrup hits 118–121 °C (soft ball), pour it in a thin stream down the side of the bowl with the mixer on medium-high, avoiding the whisk.", why: "Syrup that hits the whisk spins onto the bowl walls and sets as hard threads." },
      { title: "Whip until cool", text: "Keep whipping on high for 8–10 minutes until the meringue is glossy, stiff and has cooled to about 25 °C.", why: null },
      { title: "Add butter", text: "Switch to the paddle. Add butter one piece at a time on medium, then the vanilla and salt. Beat through any curdled stage until silky.", why: null },
      { title: "Adjust and smooth", text: "If soupy, chill 10 minutes and re-beat; if curdled and cold, gently warm the bowl while beating. Beat on low 2 minutes before using.", why: null },
    ],
    notes: "The most stable of the butter-based meringue frostings thanks to the hot syrup; pipes crisp details and holds sharp edges — a classic wedding-cake frosting. A thermometer is essential.",
    climateNotes: "Better heat tolerance than SMBC or American buttercream, but still butter-based — keep chilled in tropical heat and avoid long outdoor display.",
    references: [
      ref({ name: "Preppy Kitchen", title: "How to Make Italian Buttercream", url: "https://preppykitchen.com/how-to-make-italian-buttercream/", author: null, rating: 4.97, reviewCount: 791, whatWeTook: "The method of timing the meringue to soft peaks as the syrup reaches temperature, and a split of sugar between whites and syrup." }),
      ref({ name: "King Arthur Baking", title: "Italian Buttercream", url: "https://www.kingarthurbaking.com/recipes/italian-buttercream-recipe", author: "Susan Reid", rating: 4.4, reviewCount: 113, whatWeTook: "Cooling the meringue fully before adding room-temperature butter, and the high butter proportion for a stable, silky set." }),
    ],
  },

  /* ─────────────────────────── Vegan buttercream ─────────────────────────── */
  {
    id: "vegan-buttercream",
    name: "Vegan vanilla buttercream",
    type: "buttercream",
    tags: ["vegan buttercream", "vegan", "dairy-free", "eggless", "buttercream", "vanilla"],
    diet: { eggless: true, vegan: true, glutenFree: true, dairyFree: true },
    batchGrams: 735,
    ingredients: [
      { group: "Vegan vanilla buttercream", name: "Vegan butter block", grams: 200, ml: null, householdMeasure: "¾ cup + 2 tbsp", notes: "block style (not tub spread), softened to about 18 °C", role: "fat / body", shoppingName: "vegan butter block" },
      { group: "Vegan vanilla buttercream", name: "Vegetable shortening", grams: 50, ml: null, householdMeasure: "¼ cup", notes: "for stability; can be replaced by more vegan block", role: "heat stability", shoppingName: "vegetable shortening" },
      { group: "Vegan vanilla buttercream", name: "Icing (powdered) sugar", grams: 450, ml: null, householdMeasure: "3 ¾ cups", notes: "sifted; check it is vegan-certified if that matters to you", role: "sweetness / structure", shoppingName: "icing sugar" },
      { group: "Vegan vanilla buttercream", name: "Unsweetened soy milk or oat milk", grams: null, ml: 30, householdMeasure: "2 tbsp", notes: "add gradually", role: "consistency", shoppingName: "soy milk" },
      { group: "Vegan vanilla buttercream", name: "Pure vanilla extract", grams: null, ml: 5, householdMeasure: "1 tsp", notes: null, role: "flavour", shoppingName: "vanilla extract" },
      { group: "Vegan vanilla buttercream", name: "Fine salt", grams: 1, ml: null, householdMeasure: "⅛ tsp", notes: "skip if your vegan block is salted", role: "flavour balance", shoppingName: "salt" },
    ],
    method: [
      { title: "Beat the fats", text: "Beat the softened vegan block and shortening together on medium for 1–2 minutes until smooth.", why: "Vegan blocks contain more water than dairy butter and soften faster — keep the beating short and cool." },
      { title: "Add sugar", text: "Add the icing sugar a third at a time on low speed until combined.", why: null },
      { title: "Loosen and flavour", text: "Add the vanilla, salt and 1 tbsp plant milk. Beat on medium for 2–3 minutes until fluffy, adding more milk 1 tsp at a time only if needed.", why: null },
      { title: "Chill if soft", text: "If it feels greasy or slack, refrigerate 15 minutes and beat again briefly.", why: "Plant fats melt at lower temperatures; a short chill restores structure." },
    ],
    notes: "Use block-style vegan butter (higher fat, lower water) for the best texture. For chocolate, beat in 40 g sifted cocoa and an extra 1–2 tbsp plant milk.",
    climateNotes: "Plant fats soften faster than dairy butter. The shortening helps in hot climates; keep the cake chilled until serving in Singapore or Indian summers.",
    references: [
      ref({ name: "Loving It Vegan", title: "Vegan Buttercream Frosting", url: "https://lovingitvegan.com/vegan-buttercream-frosting/", author: null, rating: 4.91, reviewCount: 65, whatWeTook: "The vegan butter to icing sugar ratio of about 1 : 1.9, which we follow closely." }),
      ref({ name: "Nora Cooks", title: "Vegan Buttercream Frosting", url: "https://www.noracooks.com/vanilla-vegan-frosting/", author: null, rating: 4.82, reviewCount: 79, whatWeTook: "Loosening with a small amount of non-dairy milk added gradually; we add shortening for heat stability." }),
    ],
  },

  /* ─────────────────────────── Vegan chocolate ganache ─────────────────────────── */
  {
    id: "vegan-chocolate-ganache",
    name: "Vegan chocolate ganache",
    type: "chocolate_ganache",
    tags: ["vegan ganache", "vegan", "dairy-free", "chocolate ganache", "coconut", "chocolate"],
    diet: { eggless: true, vegan: true, glutenFree: true, dairyFree: true },
    batchGrams: 500,
    ingredients: [
      { group: "Vegan chocolate ganache", name: "Dairy-free dark chocolate (55–70% cocoa)", grams: 300, ml: null, householdMeasure: "about 1 ¾ cups chopped", notes: "finely chopped; check the label is dairy-free", role: "structure / flavour", shoppingName: "dairy-free dark chocolate" },
      { group: "Vegan chocolate ganache", name: "Full-fat coconut cream", grams: null, ml: 200, householdMeasure: "¾ cup + 1 tbsp", notes: "use the thick solid part from a chilled can", role: "liquid / emulsion", shoppingName: "coconut cream" },
      { group: "Vegan chocolate ganache", name: "Fine salt", grams: 0.5, ml: null, householdMeasure: "pinch", notes: null, role: "flavour", shoppingName: "salt" },
    ],
    method: [
      { title: "Separate the coconut cream", text: "Chill the can overnight, then scoop off the thick white cream, leaving the watery part behind.", why: "The water dilutes the ganache so it never sets properly." },
      { title: "Heat the coconut cream", text: "Warm the coconut cream until steaming and fully melted (about 85 °C).", why: null },
      { title: "Combine", text: "Pour over the chopped chocolate with the salt, leave 3 minutes, then stir gently from the centre until glossy.", why: null },
      { title: "Set to use", text: "Use warm as a glaze or drip, or cool at room temperature (or briefly in the fridge, stirring every 5 minutes) until spreadable for filling and coating.", why: "Coconut fat firms hard when cold — stir often while chilling so it sets evenly." },
    ],
    notes: "About 1.5 : 1 chocolate to coconut cream gives a spreadable set. For a firm coating go to 2 : 1; for a pourable glaze, 1 : 1. Has a light coconut note — pairs well with chocolate, banana and coffee cakes.",
    climateNotes: "Coconut fat is solid below about 24 °C and soft above it, so in tropical heat this ganache softens like buttercream — keep the cake chilled.",
    references: [
      ref({ name: "Loving It Vegan", title: "Vegan Chocolate Ganache", url: "https://lovingitvegan.com/vegan-chocolate-ganache/", author: null, rating: 5, reviewCount: 14, whatWeTook: "Using only the separated thick part of chilled canned coconut cream at roughly 1.1 : 1 chocolate to cream; we go thicker for a spreadable frosting." }),
      ref({ name: "Nora Cooks", title: "Vegan Chocolate Ganache", url: "https://www.noracooks.com/vegan-chocolate-ganache/", author: null, rating: 4.82, reviewCount: 11, whatWeTook: "Pouring hot coconut cream over vegan chocolate and resting before stirring." }),
    ],
  },
];

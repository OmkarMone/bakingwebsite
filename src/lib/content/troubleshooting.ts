/** "Something went wrong?" — common cake and frosting problems, causes and fixes. */

export type TroubleCategory = "cake" | "frosting" | "equipment";

export interface TroubleshootingItem {
  id: string;
  title: string;
  category: TroubleCategory;
  symptoms: string;
  likelyCauses: { cause: string; explanation: string }[];
  fixes: string[];
  prevention: string[];
}

export const TROUBLE_CATEGORY_LABELS: Record<TroubleCategory, string> = {
  cake: "Cake",
  frosting: "Frosting & ganache",
  equipment: "Oven & equipment",
};

export const TROUBLESHOOTING: TroubleshootingItem[] = [
  {
    id: "sank",
    title: "Cake sank in the middle",
    category: "cake",
    symptoms: "Rose well in the oven, then collapsed into a dip — often with a dense, damp band in the centre.",
    likelyCauses: [
      { cause: "Underbaked", explanation: "The crumb hadn't set, so the structure collapsed as the steam escaped." },
      { cause: "Too much leavening", explanation: "Excess baking powder/soda makes bubbles grow too big, then burst and fall before the crumb sets." },
      { cause: "Oven door opened early", explanation: "A rush of cool air in the first two-thirds of baking deflates an unset batter." },
      { cause: "Oven too cool", explanation: "Batter rises slowly and never sets firmly enough to hold its height." },
      { cause: "Too much sugar or fat", explanation: "Both weaken structure; heavy-handed measuring by volume is a common culprit." },
    ],
    fixes: [
      "Slice off the sunken part and level the cake — use it as a layer, or fill the dip with frosting/fruit.",
      "Turn a badly sunken cake into trifle or cake pops.",
    ],
    prevention: [
      "Weigh ingredients, especially flour, sugar and leaveners.",
      "Bake until a skewer comes out with only a few moist crumbs, or the centre reads ~96–99 °C.",
      "Don't open the oven before the cake looks set at the edges (about ⅔ of the bake time).",
      "Check your oven with an oven thermometer — many run 10–20 °C off.",
      "Use fresh baking powder (test: it should fizz in hot water).",
    ],
  },
  {
    id: "cracked",
    title: "Cake cracked on top",
    category: "cake",
    symptoms: "A split or dome with a crack running across the top.",
    likelyCauses: [
      { cause: "Oven too hot", explanation: "The outside sets before the centre finishes rising, so the centre bursts through the crust." },
      { cause: "Pan placed too high", explanation: "Heat from the top element crusts the surface early." },
      { cause: "Too much flour or overmixing", explanation: "A stiff, gluten-heavy batter can't expand evenly." },
      { cause: "Pan too small", explanation: "Deep batter takes longer to bake through, so the surface sets first." },
    ],
    fixes: ["Level the cake with a serrated knife and bake cut-side down when stacking.", "Cover with frosting — cracks are cosmetic."],
    prevention: [
      "Bake in the centre of the oven at the recipe's temperature; lower by 10 °C for large or deep pans.",
      "Use bake-even strips (or wet towel strips) around the pan.",
      "Mix only until the flour disappears.",
    ],
  },
  {
    id: "dry",
    title: "Cake is dry",
    category: "cake",
    symptoms: "Crumbly, dry mouthfeel; may be stale quickly.",
    likelyCauses: [
      { cause: "Overbaked", explanation: "Even 5 extra minutes drives off moisture, especially in small or thin layers." },
      { cause: "Too much flour", explanation: "Scooping flour with a cup can add 20–30% extra." },
      { cause: "Not enough fat or sugar", explanation: "Both hold moisture and tenderise; reduced-sugar versions often turn dry." },
      { cause: "Stored uncovered or in the fridge unwrapped", explanation: "Cold, dry air pulls moisture out and firms butter-based crumbs." },
    ],
    fixes: [
      "Brush layers with simple syrup (equal parts sugar and water, warmed) before frosting.",
      "Use a moist filling (ganache, curd, whipped cream) and serve at room temperature.",
    ],
    prevention: [
      "Weigh flour, or spoon-and-level if using cups.",
      "Start checking 5–10 minutes before the stated time.",
      "Oil-based cakes stay moister than butter cakes, especially when chilled.",
      "Wrap cooled layers in cling film.",
    ],
  },
  {
    id: "dense",
    title: "Cake is dense or heavy",
    category: "cake",
    symptoms: "Tight, compact crumb; doesn't feel light or springy.",
    likelyCauses: [
      { cause: "Under-creamed butter and sugar", explanation: "Creaming traps the air that leaveners expand. Cold butter can't hold air." },
      { cause: "Overmixing after adding flour", explanation: "Develops gluten and knocks out air." },
      { cause: "Old or insufficient leavening", explanation: "Not enough gas to lift the batter." },
      { cause: "Cold ingredients", explanation: "Cold eggs or milk make creamed butter seize and the emulsion break, losing air." },
      { cause: "Batter left standing", explanation: "Baking soda reacts as soon as it is wet; waiting lets the gas escape." },
    ],
    fixes: ["Use as a sturdy base for carved cakes, or cut into thin layers with a moist filling."],
    prevention: [
      "Cream softened (~20 °C) butter and sugar 3–5 minutes until pale and fluffy.",
      "Bring eggs, milk and yogurt to room temperature.",
      "Fold flour in gently and bake immediately.",
      "Replace baking powder every ~6 months.",
    ],
  },
  {
    id: "gummy",
    title: "Cake is gummy or wet inside",
    category: "cake",
    symptoms: "Sticky, rubbery or wet streaks — often near the bottom or centre.",
    likelyCauses: [
      { cause: "Underbaked centre", explanation: "The starches haven't fully set." },
      { cause: "Overmixing", explanation: "Excess gluten plus trapped moisture gives a rubbery, gummy texture." },
      { cause: "Too much liquid or sugar", explanation: "Excess syrup can't be absorbed by the starch." },
      { cause: "Cut while hot", explanation: "Steam is still setting the crumb; slicing compresses it." },
      { cause: "Eggless batter with too little leavening or acid", explanation: "Without egg structure, an under-risen eggless cake turns pasty." },
    ],
    fixes: ["If the outside isn't burnt, return the cake (covered with foil) to the oven for 5–10 minutes."],
    prevention: [
      "Bake until the centre springs back and a skewer comes out clean.",
      "Cool in the pan 10–15 minutes, then fully on a rack before cutting.",
      "Measure liquids precisely, and mix just until combined.",
    ],
  },
  {
    id: "no-rise",
    title: "Cake didn't rise",
    category: "cake",
    symptoms: "Flat, low cake that never domed in the oven.",
    likelyCauses: [
      { cause: "Expired baking powder or soda", explanation: "Leaveners lose strength with age and humidity." },
      { cause: "Baking soda without acid", explanation: "Soda needs an acidic ingredient (yogurt, buttermilk, natural cocoa, vinegar) to make CO₂." },
      { cause: "Forgotten or mis-measured leavening", explanation: "Teaspoons vs tablespoons mix-ups are common." },
      { cause: "Batter stood too long", explanation: "Gas escapes before the cake can set around it." },
      { cause: "Oven not preheated", explanation: "The batter needs immediate heat to expand and set." },
    ],
    fixes: ["Level and stack thin layers with extra filling, or make a sheet-style dessert."],
    prevention: [
      "Test leaveners: baking powder fizzes in hot water; baking soda fizzes in vinegar.",
      "Preheat for at least 20 minutes and bake immediately after mixing.",
      "If you swap Dutch cocoa for natural (or vice versa), adjust soda/powder accordingly.",
    ],
  },
  {
    id: "burned-top",
    title: "Burned or very dark on top",
    category: "cake",
    symptoms: "Top or edges dark brown/burnt while the centre may still be underdone.",
    likelyCauses: [
      { cause: "Too close to the top element", explanation: "Common in small OTGs and countertop ovens." },
      { cause: "Oven runs hot / fan oven not adjusted", explanation: "Fan ovens bake ~15–20 °C hotter than the dial suggests." },
      { cause: "High sugar or dark pan", explanation: "Sugar caramelises quickly; dark pans absorb more heat." },
    ],
    fixes: ["Trim the dark layer with a serrated knife once cool, then frost."],
    prevention: [
      "Bake on the middle rack; in an OTG use bottom heat only and tent with foil for the last third.",
      "Reduce temperature by 15–20 °C for fan/convection mode.",
      "Use light-coloured metal pans, or lower the temperature 10 °C for dark pans.",
    ],
  },
  {
    id: "stuck",
    title: "Cake stuck to the pan",
    category: "cake",
    symptoms: "Cake tears or leaves chunks behind when turned out.",
    likelyCauses: [
      { cause: "Pan not lined or greased properly", explanation: "Sugar caramelises and glues the crust to bare metal." },
      { cause: "Turned out too soon or too late", explanation: "Hot cake is fragile; fully cold cake can set to the pan as sugars harden." },
    ],
    fixes: [
      "Run a thin knife around the edge, warm the base briefly on a hob or hot towel, and try again.",
      "Patch tears with frosting — nobody will know.",
    ],
    prevention: [
      "Grease, line the base with baking paper, then grease and flour (or cocoa) the sides.",
      "Cool 10–15 minutes in the pan, then turn out onto a rack.",
    ],
  },
  {
    id: "domed",
    title: "Cake domed heavily",
    category: "cake",
    symptoms: "Tall peak in the middle with lower edges.",
    likelyCauses: [
      { cause: "Edges set before the centre", explanation: "The hot metal sets the edges first, so the centre keeps rising." },
      { cause: "Oven too hot", explanation: "Speeds up edge setting." },
      { cause: "Overmixed batter", explanation: "More gluten = more spring in the centre." },
    ],
    fixes: ["Level the top once completely cool (easier when chilled)."],
    prevention: [
      "Use bake-even strips around the pan.",
      "Lower the temperature by 10 °C and bake a little longer.",
      "Use a heating core or flower nail for pans 10\" and wider.",
    ],
  },
  {
    id: "tunnels",
    title: "Tunnels or large holes in the crumb",
    category: "cake",
    symptoms: "Long tunnels or big air pockets visible when sliced.",
    likelyCauses: [
      { cause: "Overmixing", explanation: "Excess gluten traps large gas pockets that stretch into tunnels." },
      { cause: "Unevenly mixed leavening", explanation: "Clumps of baking soda/powder make localised big bubbles (and sometimes bitter spots)." },
      { cause: "Air pockets when filling the pan", explanation: "Thick batter traps air if spooned in clumps." },
    ],
    fixes: ["Cosmetic only — fill and frost as normal."],
    prevention: [
      "Sift or whisk leaveners into the flour thoroughly.",
      "Mix gently once flour is added.",
      "Tap the filled pan on the counter and run a skewer through the batter.",
    ],
  },
  {
    id: "sticky-top-eggless",
    title: "Eggless cake has a sticky or wet top",
    category: "cake",
    symptoms: "Tacky surface that sticks to fingers or cling film, especially after storing.",
    likelyCauses: [
      { cause: "Slightly underbaked", explanation: "Eggless cakes look done before the surface is fully set." },
      { cause: "High sugar or condensed milk", explanation: "Sugar draws moisture from the air (hygroscopic), especially in humid climates." },
      { cause: "Wrapped while warm", explanation: "Trapped steam condenses on the surface." },
    ],
    fixes: ["Lightly trim or frost the top; leave unwrapped for 15 minutes to let the surface dry."],
    prevention: [
      "Bake 3–5 minutes longer until the top springs back.",
      "Cool completely, uncovered, before wrapping or frosting.",
      "In humid weather, store in an airtight container in a cool room.",
    ],
  },
  {
    id: "frosting-melted",
    title: "Frosting melted or slid off",
    category: "frosting",
    symptoms: "Frosting droops, layers slide, or the cake bulges at the sides.",
    likelyCauses: [
      { cause: "Cake was still warm", explanation: "Residual heat melts butter-based frostings." },
      { cause: "Hot or humid room", explanation: "Butter softens above ~24 °C; whipped cream collapses quickly." },
      { cause: "Too soft frosting or too much filling", explanation: "Weight squeezes soft fillings out." },
    ],
    fixes: [
      "Chill the cake 20–30 minutes, scrape off excess and re-coat.",
      "Push a few dowels/straws through the layers to stop sliding.",
    ],
    prevention: [
      "Cool layers completely (chill them for clean frosting).",
      "Pipe a stiff frosting dam around soft fillings.",
      "In hot climates choose ganache or a firmer buttercream, and keep the cake refrigerated until serving.",
    ],
  },
  {
    id: "buttercream-curdled",
    title: "Buttercream curdled or split",
    category: "frosting",
    symptoms: "Looks lumpy, cottage-cheese-like or soupy (common with meringue buttercreams).",
    likelyCauses: [
      { cause: "Too cold", explanation: "Butter hardens into lumps and won't emulsify — curdled look." },
      { cause: "Too warm", explanation: "Butter melts and the emulsion turns soupy." },
      { cause: "Liquid added too fast", explanation: "The fat can't absorb it all at once." },
    ],
    fixes: [
      "Curdled (cold): keep beating, and warm the bowl sides briefly with a hair dryer or warm towel.",
      "Soupy (warm): chill 10–15 minutes, then beat again.",
    ],
    prevention: ["Use butter at ~20 °C and add it gradually; add liquids a spoon at a time."],
  },
  {
    id: "ganache-runny",
    title: "Ganache too runny",
    category: "frosting",
    symptoms: "Won't set or thicken enough to spread or pipe.",
    likelyCauses: [
      { cause: "Not enough chocolate for the type", explanation: "Milk and white chocolate need 2.5–4× the cream to set; dark needs ~2:1 to coat firmly." },
      { cause: "Still warm", explanation: "Ganache needs several hours to crystallise at room temperature." },
      { cause: "Low-cocoa or compound chocolate", explanation: "Less cocoa butter means a softer set." },
    ],
    fixes: [
      "Let it rest longer at room temperature, or chill briefly and stir.",
      "Melt in more finely chopped chocolate (add 25–30% more) and let it set again.",
    ],
    prevention: ["Use 2:1 dark chocolate to cream for coating, 3:1 for milk or white chocolate (more in hot climates)."],
  },
  {
    id: "ganache-thick",
    title: "Ganache too thick or hard",
    category: "frosting",
    symptoms: "Too stiff to spread; cracks or tears the cake.",
    likelyCauses: [
      { cause: "Over-chilled", explanation: "Cocoa butter sets very firm in the fridge." },
      { cause: "Ratio too high in chocolate", explanation: "Extra chocolate sets harder." },
    ],
    fixes: [
      "Warm gently in 5–10 second microwave bursts, stirring, until spreadable.",
      "Stir in a little warm cream, a tablespoon at a time.",
    ],
    prevention: ["Let ganache set at room temperature, not in the fridge, unless your kitchen is very warm."],
  },
  {
    id: "ganache-split",
    title: "Ganache split or greasy",
    category: "frosting",
    symptoms: "Oily layer on top, grainy or broken texture.",
    likelyCauses: [
      { cause: "Cream too hot", explanation: "Boiling cream overheats the chocolate and the fat separates." },
      { cause: "Over-stirred or stirred too vigorously", explanation: "Breaks the emulsion." },
      { cause: "Fat too high relative to liquid", explanation: "Common with high-cocoa chocolate in 2:1+ ratios." },
    ],
    fixes: [
      "Whisk in 1–2 tbsp warm milk or warm cream, or blitz briefly with a stick blender to re-emulsify.",
    ],
    prevention: [
      "Heat cream until just simmering, pour over chopped chocolate, wait 3–5 minutes, then stir gently from the centre outward.",
    ],
  },
  {
    id: "cream-overwhipped",
    title: "Whipped cream over-whipped or grainy",
    category: "frosting",
    symptoms: "Lumpy, grainy, looks like it's turning to butter.",
    likelyCauses: [
      { cause: "Whipped too long", explanation: "Fat globules clump together and push out the liquid (the first stage of making butter)." },
      { cause: "Cream too warm", explanation: "Warm fat overwhips faster and holds air poorly." },
    ],
    fixes: ["Gently fold in a few tablespoons of cold liquid cream by hand until smooth again."],
    prevention: ["Use cream straight from the fridge, a chilled bowl, and stop at firm peaks — finish by hand."],
  },
  {
    id: "uneven-otg",
    title: "Uneven baking in OTG, air fryer or microwave",
    category: "equipment",
    symptoms: "One side higher or darker, raw centre with done edges, or burnt top.",
    likelyCauses: [
      { cause: "Hot spots near elements", explanation: "Small ovens have elements very close to the pan." },
      { cause: "Air fryer fan too strong", explanation: "Rapid air dries and browns the top before the inside sets." },
      { cause: "Microwave heats unevenly", explanation: "Centres can stay wet while edges overcook and toughen." },
    ],
    fixes: ["Rotate the pan 180° after the cake has set (about two-thirds through baking)."],
    prevention: [
      "OTG: preheat 15 minutes, middle rack, both elements, and tent with foil if the top browns.",
      "Air fryer: lower the temperature 10–20 °C vs the oven recipe, cover with foil, use a smaller pan.",
      "Microwave: use a microwave-safe ring pan, medium power, and check every minute.",
    ],
  },
];

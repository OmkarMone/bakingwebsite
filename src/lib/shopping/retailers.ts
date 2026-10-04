/**
 * Curated retailer knowledge per country: which chains exist and what *kind* of store they are.
 * This only tells us a store type (and therefore what it typically stocks) — never live stock or price.
 */
export type StoreType = "supermarket" | "premium_supermarket" | "hypermarket" | "convenience" | "baking_supply" | "online" | "craft";

export interface Retailer {
  name: string;
  type: StoreType;
  /** lower-case patterns matched against map place names */
  match: RegExp;
  website?: string;
}

export const RETAILERS: Record<string, Retailer[]> = {
  sg: [
    { name: "FairPrice", type: "supermarket", match: /fairprice|ntuc/i, website: "https://www.fairprice.com.sg" },
    { name: "FairPrice Finest", type: "premium_supermarket", match: /fairprice finest/i, website: "https://www.fairprice.com.sg" },
    { name: "FairPrice Xtra", type: "hypermarket", match: /fairprice xtra/i, website: "https://www.fairprice.com.sg" },
    { name: "Cold Storage", type: "premium_supermarket", match: /cold storage|cs fresh/i, website: "https://coldstorage.com.sg" },
    { name: "Sheng Siong", type: "supermarket", match: /sheng siong/i, website: "https://shengsiong.com.sg" },
    { name: "Giant", type: "hypermarket", match: /\bgiant\b/i, website: "https://giant.sg" },
    { name: "Mustafa Centre", type: "hypermarket", match: /mustafa/i, website: "https://www.mustafa.com.sg" },
    { name: "Don Don Donki", type: "supermarket", match: /donki|don don/i },
    { name: "Phoon Huat", type: "baking_supply", match: /phoon huat/i, website: "https://www.phoonhuat.com" },
    { name: "Bake King", type: "baking_supply", match: /bake king/i, website: "https://www.bakeking.com.sg" },
    { name: "Sun Lik Trading", type: "baking_supply", match: /sun lik/i },
    { name: "RedMart (Lazada)", type: "online", match: /redmart/i, website: "https://www.lazada.sg/shop/redmart" },
  ],
  in: [
    { name: "BigBasket", type: "online", match: /bigbasket/i, website: "https://www.bigbasket.com" },
    { name: "Blinkit", type: "online", match: /blinkit/i, website: "https://blinkit.com" },
    { name: "Zepto", type: "online", match: /zepto/i, website: "https://www.zeptonow.com" },
    { name: "DMart", type: "hypermarket", match: /d-?mart/i, website: "https://www.dmart.in" },
    { name: "Reliance Smart / Fresh", type: "supermarket", match: /reliance (smart|fresh)/i },
    { name: "Nature's Basket", type: "premium_supermarket", match: /nature'?s basket/i },
    { name: "Spencer's", type: "supermarket", match: /spencer/i },
    { name: "More", type: "supermarket", match: /\bmore (supermarket|megastore)\b/i },
    { name: "Star Bazaar", type: "hypermarket", match: /star bazaar/i },
  ],
  my: [
    { name: "Jaya Grocer", type: "premium_supermarket", match: /jaya grocer/i },
    { name: "Lotus's", type: "hypermarket", match: /lotus'?s|tesco/i },
    { name: "AEON", type: "hypermarket", match: /aeon/i },
    { name: "Giant", type: "hypermarket", match: /\bgiant\b/i },
    { name: "Village Grocer", type: "premium_supermarket", match: /village grocer/i },
    { name: "Bake With Yen", type: "baking_supply", match: /bake with yen/i, website: "https://www.bakewithyen.my" },
  ],
  us: [
    { name: "Walmart", type: "hypermarket", match: /walmart/i },
    { name: "Target", type: "supermarket", match: /target/i },
    { name: "Kroger", type: "supermarket", match: /kroger/i },
    { name: "Safeway", type: "supermarket", match: /safeway/i },
    { name: "Whole Foods Market", type: "premium_supermarket", match: /whole foods/i },
    { name: "Trader Joe's", type: "supermarket", match: /trader joe/i },
    { name: "Michaels", type: "craft", match: /michaels/i },
    { name: "Hobby Lobby", type: "craft", match: /hobby lobby/i },
  ],
  gb: [
    { name: "Tesco", type: "supermarket", match: /tesco/i },
    { name: "Sainsbury's", type: "supermarket", match: /sainsbury/i },
    { name: "Waitrose", type: "premium_supermarket", match: /waitrose/i },
    { name: "Asda", type: "hypermarket", match: /asda/i },
    { name: "Morrisons", type: "supermarket", match: /morrisons/i },
    { name: "Lakeland", type: "baking_supply", match: /lakeland/i },
    { name: "Hobbycraft", type: "craft", match: /hobbycraft/i },
  ],
  au: [
    { name: "Coles", type: "supermarket", match: /coles/i },
    { name: "Woolworths", type: "supermarket", match: /woolworths/i },
    { name: "ALDI", type: "supermarket", match: /aldi/i },
    { name: "Spotlight", type: "craft", match: /spotlight/i },
  ],
  ae: [
    { name: "Carrefour", type: "hypermarket", match: /carrefour/i },
    { name: "Lulu Hypermarket", type: "hypermarket", match: /lulu/i },
    { name: "Spinneys", type: "premium_supermarket", match: /spinneys/i },
    { name: "Waitrose", type: "premium_supermarket", match: /waitrose/i },
  ],
};

export function matchRetailer(countryCode: string | null | undefined, placeName: string): Retailer | undefined {
  const list = countryCode ? RETAILERS[countryCode] ?? [] : Object.values(RETAILERS).flat();
  // most specific (longest pattern) first: "FairPrice Finest" before "FairPrice"
  return [...list].sort((a, b) => b.match.source.length - a.match.source.length).find((r) => r.match.test(placeName));
}

export function onlineRetailers(countryCode: string | null | undefined): Retailer[] {
  return (countryCode ? RETAILERS[countryCode] ?? [] : []).filter((r) => r.type === "online" || r.type === "baking_supply");
}

export const STORE_TYPE_LABEL: Record<StoreType, string> = {
  supermarket: "Supermarket",
  premium_supermarket: "Premium supermarket",
  hypermarket: "Hypermarket",
  convenience: "Convenience store",
  baking_supply: "Baking supply store",
  online: "Online grocery",
  craft: "Craft & cake-decorating store",
};

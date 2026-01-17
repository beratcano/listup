import { Item } from "./types";
import { nanoid } from "nanoid";

export interface PresetPack {
  id: string;
  name: string;
  description: string;
  category: "food" | "entertainment" | "lifestyle" | "sports" | "misc";
  items: string[];
}

export const presetPacks: PresetPack[] = [
  // FOOD
  {
    id: "ice-cream",
    name: "Ice Cream Flavors",
    description: "Classic ice cream flavors",
    category: "food",
    items: [
      "Vanilla",
      "Chocolate",
      "Strawberry",
      "Mint Chocolate Chip",
      "Cookie Dough",
      "Cookies and Cream",
      "Rocky Road",
      "Pistachio",
      "Coffee",
      "Butter Pecan",
    ],
  },
  {
    id: "fast-food",
    name: "Fast Food Chains",
    description: "Popular fast food restaurants",
    category: "food",
    items: [
      "McDonald's",
      "Burger King",
      "Wendy's",
      "Taco Bell",
      "Chick-fil-A",
      "Subway",
      "KFC",
      "Pizza Hut",
      "Domino's",
      "Popeyes",
    ],
  },
  {
    id: "pizza-toppings",
    name: "Pizza Toppings",
    description: "Classic pizza toppings",
    category: "food",
    items: [
      "Pepperoni",
      "Mushrooms",
      "Sausage",
      "Onions",
      "Green Peppers",
      "Olives",
      "Bacon",
      "Pineapple",
      "Jalapeños",
      "Extra Cheese",
    ],
  },
  {
    id: "breakfast",
    name: "Breakfast Foods",
    description: "Morning meal favorites",
    category: "food",
    items: [
      "Pancakes",
      "Waffles",
      "Eggs Benedict",
      "French Toast",
      "Bacon",
      "Avocado Toast",
      "Cereal",
      "Oatmeal",
      "Bagel with Cream Cheese",
      "Breakfast Burrito",
    ],
  },
  {
    id: "candy",
    name: "Candy & Snacks",
    description: "Sweet treats and snacks",
    category: "food",
    items: [
      "Snickers",
      "Reese's",
      "M&Ms",
      "Skittles",
      "Kit Kat",
      "Twix",
      "Sour Patch Kids",
      "Gummy Bears",
      "Oreos",
      "Doritos",
    ],
  },
  {
    id: "drinks",
    name: "Beverages",
    description: "Popular drinks",
    category: "food",
    items: [
      "Coffee",
      "Tea",
      "Coca-Cola",
      "Orange Juice",
      "Lemonade",
      "Smoothie",
      "Iced Coffee",
      "Hot Chocolate",
      "Energy Drink",
      "Sparkling Water",
    ],
  },

  // ENTERTAINMENT
  {
    id: "social-media",
    name: "Social Media Apps",
    description: "Popular social platforms",
    category: "entertainment",
    items: [
      "Instagram",
      "TikTok",
      "Twitter/X",
      "Facebook",
      "Snapchat",
      "YouTube",
      "Reddit",
      "LinkedIn",
      "Discord",
      "BeReal",
    ],
  },
  {
    id: "movies-2000s",
    name: "2000s Movies",
    description: "Iconic films from the 2000s",
    category: "entertainment",
    items: [
      "The Dark Knight",
      "Avatar",
      "Gladiator",
      "The Lord of the Rings",
      "Finding Nemo",
      "Pirates of the Caribbean",
      "Shrek",
      "Mean Girls",
      "Superbad",
      "The Notebook",
    ],
  },
  {
    id: "tv-shows",
    name: "TV Shows",
    description: "Popular television series",
    category: "entertainment",
    items: [
      "Breaking Bad",
      "Game of Thrones",
      "The Office",
      "Friends",
      "Stranger Things",
      "The Simpsons",
      "Squid Game",
      "Ted Lasso",
      "Succession",
      "Wednesday",
    ],
  },
  {
    id: "video-games",
    name: "Video Games",
    description: "Popular video game titles",
    category: "entertainment",
    items: [
      "Minecraft",
      "Fortnite",
      "Grand Theft Auto V",
      "The Legend of Zelda",
      "Call of Duty",
      "Mario Kart",
      "FIFA/EA Sports FC",
      "Elden Ring",
      "Animal Crossing",
      "Roblox",
    ],
  },
  {
    id: "superheroes",
    name: "Superheroes",
    description: "Popular comic book heroes",
    category: "entertainment",
    items: [
      "Spider-Man",
      "Batman",
      "Superman",
      "Iron Man",
      "Wonder Woman",
      "Captain America",
      "Thor",
      "Wolverine",
      "The Flash",
      "Deadpool",
    ],
  },
  {
    id: "music-genres",
    name: "Music Genres",
    description: "Different styles of music",
    category: "entertainment",
    items: [
      "Pop",
      "Hip-Hop",
      "Rock",
      "R&B",
      "Country",
      "Electronic/EDM",
      "Jazz",
      "Classical",
      "Reggae",
      "Metal",
    ],
  },
  {
    id: "disney-pixar",
    name: "Disney/Pixar Movies",
    description: "Animated classics",
    category: "entertainment",
    items: [
      "The Lion King",
      "Toy Story",
      "Frozen",
      "Finding Nemo",
      "The Little Mermaid",
      "Up",
      "Moana",
      "Coco",
      "Inside Out",
      "Encanto",
    ],
  },

  // LIFESTYLE
  {
    id: "car-brands",
    name: "Car Brands",
    description: "Popular automobile manufacturers",
    category: "lifestyle",
    items: [
      "Toyota",
      "Honda",
      "Ford",
      "BMW",
      "Mercedes-Benz",
      "Tesla",
      "Audi",
      "Porsche",
      "Ferrari",
      "Lamborghini",
    ],
  },
  {
    id: "holidays",
    name: "Holidays",
    description: "Annual celebrations",
    category: "lifestyle",
    items: [
      "Christmas",
      "Halloween",
      "Thanksgiving",
      "New Year's Eve",
      "Valentine's Day",
      "Fourth of July",
      "Easter",
      "St. Patrick's Day",
      "Labor Day",
      "Memorial Day",
    ],
  },
  {
    id: "vacation-spots",
    name: "Vacation Destinations",
    description: "Dream travel locations",
    category: "lifestyle",
    items: [
      "Hawaii",
      "Paris",
      "New York City",
      "Tokyo",
      "Cancun",
      "London",
      "Las Vegas",
      "Bali",
      "Rome",
      "Maldives",
    ],
  },
  {
    id: "pets",
    name: "Pets",
    description: "Popular pet choices",
    category: "lifestyle",
    items: [
      "Dog",
      "Cat",
      "Fish",
      "Hamster",
      "Rabbit",
      "Bird",
      "Guinea Pig",
      "Turtle",
      "Snake",
      "Ferret",
    ],
  },

  // SPORTS
  {
    id: "sports",
    name: "Sports",
    description: "Popular sports",
    category: "sports",
    items: [
      "Football (American)",
      "Basketball",
      "Soccer",
      "Baseball",
      "Tennis",
      "Golf",
      "Hockey",
      "Swimming",
      "Boxing",
      "MMA",
    ],
  },
  {
    id: "nba-teams",
    name: "NBA Teams",
    description: "Basketball teams",
    category: "sports",
    items: [
      "Lakers",
      "Celtics",
      "Warriors",
      "Bulls",
      "Heat",
      "Nets",
      "Knicks",
      "Mavericks",
      "Bucks",
      "76ers",
    ],
  },
  {
    id: "nfl-teams",
    name: "NFL Teams",
    description: "Football teams",
    category: "sports",
    items: [
      "Cowboys",
      "Patriots",
      "49ers",
      "Packers",
      "Chiefs",
      "Eagles",
      "Raiders",
      "Steelers",
      "Bears",
      "Giants",
    ],
  },

  // MISC
  {
    id: "emojis",
    name: "Emojis",
    description: "Popular emojis",
    category: "misc",
    items: [
      "😂",
      "❤️",
      "🔥",
      "👍",
      "😭",
      "🥺",
      "✨",
      "😍",
      "🤔",
      "💀",
    ],
  },
  {
    id: "school-subjects",
    name: "School Subjects",
    description: "Academic subjects",
    category: "misc",
    items: [
      "Math",
      "English",
      "Science",
      "History",
      "Art",
      "Physical Education",
      "Music",
      "Foreign Language",
      "Computer Science",
      "Drama",
    ],
  },
  {
    id: "superpowers",
    name: "Superpowers",
    description: "If you could have any power...",
    category: "misc",
    items: [
      "Flying",
      "Invisibility",
      "Super Strength",
      "Teleportation",
      "Mind Reading",
      "Time Travel",
      "Super Speed",
      "Shapeshifting",
      "Telekinesis",
      "Immortality",
    ],
  },
];

export function packToItems(pack: PresetPack): Item[] {
  return pack.items.map((text) => ({
    id: nanoid(8),
    text,
  }));
}

export function textToItems(text: string): Item[] {
  return text
    .split(/[,\n]/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((text) => ({
      id: nanoid(8),
      text,
    }));
}

export function generateRoomCode(): string {
  // Generate a 6-character alphanumeric code (uppercase)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars like 0/O, 1/I
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Get packs by category
export function getPacksByCategory(category: PresetPack["category"]): PresetPack[] {
  return presetPacks.filter((pack) => pack.category === category);
}

// Get all unique categories
export function getCategories(): PresetPack["category"][] {
  return [...new Set(presetPacks.map((pack) => pack.category))];
}

// Shuffle array helper
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Get random subset of items from a pack
export function packToItemsSubset(pack: PresetPack, count: number): Item[] {
  const shuffled = shuffleArray(pack.items);
  const subset = shuffled.slice(0, Math.min(count, pack.items.length));
  return subset.map((text) => ({
    id: nanoid(8),
    text,
  }));
}

// Random mix from multiple packs
export function mixPacks(packs: PresetPack[], totalItems: number): Item[] {
  // Collect all items from selected packs
  const allItems = packs.flatMap((pack) => pack.items);
  // Shuffle and take subset
  const shuffled = shuffleArray(allItems);
  // Remove duplicates
  const unique = [...new Set(shuffled)];
  const subset = unique.slice(0, Math.min(totalItems, unique.length));
  return subset.map((text) => ({
    id: nanoid(8),
    text,
  }));
}

// Get random packs
export function getRandomPacks(count: number): PresetPack[] {
  const shuffled = shuffleArray(presetPacks);
  return shuffled.slice(0, Math.min(count, presetPacks.length));
}

// Category display names
export const categoryNames: Record<PresetPack["category"], string> = {
  food: "Food & Drink",
  entertainment: "Entertainment",
  lifestyle: "Lifestyle",
  sports: "Sports",
  misc: "Misc",
};

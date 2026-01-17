import { Item } from "./types";
import { nanoid } from "nanoid";

export interface PresetPack {
  id: string;
  name: string;
  description: string;
  items: string[];
}

export const presetPacks: PresetPack[] = [
  {
    id: "ice-cream",
    name: "Ice Cream Flavors",
    description: "Classic ice cream flavors",
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
    id: "social-media",
    name: "Social Media Apps",
    description: "Popular social platforms",
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
    id: "pizza-toppings",
    name: "Pizza Toppings",
    description: "Classic pizza toppings",
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
    id: "superheroes",
    name: "Superheroes",
    description: "Popular comic book heroes",
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
    id: "car-brands",
    name: "Car Brands",
    description: "Popular automobile manufacturers",
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
    id: "music-genres",
    name: "Music Genres",
    description: "Different styles of music",
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

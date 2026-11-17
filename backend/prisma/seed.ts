import { PrismaClient, Role, OrderStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const categoriesData = [
  { slug: "chocolates", name: "Chocolates", icon: "candy-bar" },
  { slug: "candies", name: "Candies", icon: "candy" },
  { slug: "chips", name: "Chips", icon: "popcorn" },
  { slug: "snacks", name: "Snacks", icon: "cookie" },
  { slug: "noodles", name: "Maggi & Noodles", icon: "soup" },
  { slug: "sandwiches", name: "Sandwiches", icon: "sandwich" },
  { slug: "burgers", name: "Burgers", icon: "beef" },
  { slug: "beverages", name: "Beverages", icon: "cup-soda" },
  { slug: "coffee", name: "Coffee", icon: "coffee" },
  { slug: "breakfast", name: "Breakfast", icon: "egg-fried" },
  { slug: "lunch", name: "Lunch", icon: "salad" },
  { slug: "dinner", name: "Dinner", icon: "utensils-crossed" },
  { slug: "meals", name: "Full Meals", icon: "chef-hat" },
];

const foodTemplates = [
  { slug: "milk-choc", name: "Milk Chocolate Bar", cat: "chocolates", isVeg: true, price: 40, prepTime: 1, desc: "Creamy milk chocolate, 50g bar." },
  { slug: "dark-choc", name: "Dark Chocolate 55%", cat: "chocolates", isVeg: true, price: 60, prepTime: 1, desc: "Rich, slightly bitter dark chocolate." },
  { slug: "wafer-choc", name: "Chocolate Wafer Bar", cat: "chocolates", isVeg: true, price: 30, prepTime: 1, desc: "Crispy wafer fingers coated in chocolate." },
  { slug: "toffee", name: "Fruit Toffees (5 pcs)", cat: "candies", isVeg: true, price: 10, prepTime: 1, desc: "Chewy assorted fruit toffees." },
  { slug: "mango-candy", name: "Mango Candy (10 pcs)", cat: "candies", isVeg: true, price: 10, prepTime: 1, desc: "Tangy raw-mango hard candies." },
  { slug: "gummies", name: "Gummy Bears Pack", cat: "candies", isVeg: true, price: 25, prepTime: 1, desc: "Soft fruity gummies, small pack." },
  { slug: "salted-chips", name: "Classic Salted Chips", cat: "chips", isVeg: true, price: 20, prepTime: 1, desc: "Thin, crisp, lightly salted." },
  { slug: "masala-chips", name: "Masala Chips", cat: "chips", isVeg: true, price: 20, prepTime: 1, desc: "Spicy desi masala potato chips." },
  { slug: "nachos", name: "Nachos with Salsa", cat: "chips", isVeg: true, price: 60, prepTime: 5, desc: "Corn tortilla chips with tomato salsa and cheese dip." },
  { slug: "samosa", name: "Samosa (2 pcs)", cat: "snacks", isVeg: true, price: 24, prepTime: 3, desc: "Crispy pastry with spiced potato, green chutney.", popular: true },
  { slug: "vada-pav", name: "Vada Pav", cat: "snacks", isVeg: true, price: 25, prepTime: 4, desc: "Mumbai-style potato fritter in a soft pav.", popular: true },
  { slug: "paneer-pakora", name: "Paneer Pakora", cat: "snacks", isVeg: true, price: 50, prepTime: 8, desc: "Gram-flour battered paneer, fried golden." },
  { slug: "chicken-momos", name: "Chicken Momos (8 pcs)", cat: "snacks", isVeg: false, price: 80, prepTime: 10, desc: "Steamed dumplings with spicy red chutney.", popular: true },
  { slug: "veg-puff", name: "Veg Puff", cat: "snacks", isVeg: true, price: 25, prepTime: 2, desc: "Flaky puff pastry with mixed veg filling." },
  { slug: "plain-maggi", name: "Plain Maggi", cat: "noodles", isVeg: true, price: 30, prepTime: 6, desc: "The classic 2-minute hostel favourite.", popular: true },
  { slug: "cheese-maggi", name: "Masala Cheese Maggi", cat: "noodles", isVeg: true, price: 50, prepTime: 7, desc: "Extra masala, loaded with melted cheese.", popular: true },
  { slug: "veg-maggi", name: "Veg Masala Maggi", cat: "noodles", isVeg: true, price: 45, prepTime: 7, desc: "Tossed with peas, onion, tomato and capsicum." },
  { slug: "egg-maggi", name: "Egg Maggi", cat: "noodles", isVeg: false, price: 55, prepTime: 8, desc: "Maggi with scrambled egg and green chilli." },
  { slug: "hakka", name: "Veg Hakka Noodles", cat: "noodles", isVeg: true, price: 70, prepTime: 10, desc: "Indo-Chinese wok-tossed noodles." },
  { slug: "veg-grill", name: "Veg Grilled Sandwich", cat: "sandwiches", isVeg: true, price: 50, prepTime: 7, desc: "Grilled with veggies and mint chutney." },
  { slug: "cheese-corn", name: "Cheese Corn Sandwich", cat: "sandwiches", isVeg: true, price: 60, prepTime: 7, desc: "Sweet corn and mozzarella, toasted.", popular: true },
  { slug: "bombay", name: "Bombay Masala Sandwich", cat: "sandwiches", isVeg: true, price: 55, prepTime: 8, desc: "Potato masala, beetroot, cucumber, chutney." },
  { slug: "chicken-club", name: "Chicken Club Sandwich", cat: "sandwiches", isVeg: false, price: 95, prepTime: 10, desc: "Triple-decker with chicken, egg and mayo." },
  { slug: "aloo-tikki-burger", name: "Aloo Tikki Burger", cat: "burgers", isVeg: true, price: 45, prepTime: 7, desc: "Spiced potato patty, onions, tangy sauce." },
  { slug: "veg-cheese-burger", name: "Veg Cheese Burger", cat: "burgers", isVeg: true, price: 65, prepTime: 8, desc: "Veg patty with a slice of cheese." },
  { slug: "paneer-zinger", name: "Paneer Zinger Burger", cat: "burgers", isVeg: true, price: 85, prepTime: 10, desc: "Crispy coated paneer with peri-peri mayo.", popular: true },
  { slug: "chicken-burger", name: "Crispy Chicken Burger", cat: "burgers", isVeg: false, price: 99, prepTime: 10, desc: "Crunchy fried chicken, lettuce, mayo." },
  { slug: "chai", name: "Masala Chai", cat: "beverages", isVeg: true, price: 15, prepTime: 3, desc: "Kadak ginger-cardamom tea.", popular: true },
  { slug: "lime-soda", name: "Fresh Lime Soda", cat: "beverages", isVeg: true, price: 35, prepTime: 3, desc: "Sweet, salted or mixed." },
  { slug: "lassi", name: "Mango Lassi", cat: "beverages", isVeg: true, price: 50, prepTime: 4, desc: "Thick yoghurt shake with mango pulp." },
  { slug: "cold-drink", name: "Cold Drink (300 ml)", cat: "beverages", isVeg: true, price: 25, prepTime: 1, desc: "Chilled soft drink, assorted flavours." },
  { slug: "hot-coffee", name: "Hot Coffee", cat: "coffee", isVeg: true, price: 25, prepTime: 3, desc: "Frothy milk coffee." },
  { slug: "cappuccino", name: "Cappuccino", cat: "coffee", isVeg: true, price: 60, prepTime: 4, desc: "Espresso with steamed milk foam." },
  { slug: "cold-coffee", name: "Cold Coffee", cat: "coffee", isVeg: true, price: 60, prepTime: 4, desc: "Blended iced coffee with cream.", popular: true },
  { slug: "iced-mocha", name: "Iced Mocha", cat: "coffee", isVeg: true, price: 80, prepTime: 5, desc: "Chocolate, espresso and chilled milk." },
  { slug: "filter-coffee", name: "Filter Coffee", cat: "coffee", isVeg: true, price: 25, prepTime: 3, desc: "South Indian decoction coffee in a davara.", popular: true },
  { slug: "poha", name: "Poha", cat: "breakfast", isVeg: true, price: 30, prepTime: 5, desc: "Flattened rice with peanuts and lemon." },
  { slug: "aloo-paratha", name: "Aloo Paratha with Curd", cat: "breakfast", isVeg: true, price: 50, prepTime: 10, desc: "Two stuffed parathas, butter, curd, pickle.", popular: true },
  { slug: "masala-dosa", name: "Masala Dosa", cat: "breakfast", isVeg: true, price: 55, prepTime: 9, desc: "Crisp dosa, potato masala, sambar, chutney.", popular: true },
  { slug: "idli", name: "Idli Sambar (3 pcs)", cat: "breakfast", isVeg: true, price: 40, prepTime: 5, desc: "Steamed rice cakes with sambar and chutney." },
  { slug: "bread-omelette", name: "Bread Omelette", cat: "breakfast", isVeg: false, price: 40, prepTime: 6, desc: "Masala omelette sandwiched in toasted bread." },
  { slug: "rajma-chawal", name: "Rajma Chawal", cat: "lunch", isVeg: true, price: 70, prepTime: 8, desc: "Kidney bean curry with jeera rice.", popular: true },
  { slug: "chole-bhature", name: "Chole Bhature", cat: "lunch", isVeg: true, price: 70, prepTime: 10, desc: "Spicy chickpeas with two fluffy bhature.", popular: true },
  { slug: "fried-rice", name: "Veg Fried Rice", cat: "lunch", isVeg: true, price: 70, prepTime: 10, desc: "Wok-tossed rice with vegetables." },
  { slug: "egg-curry-rice", name: "Egg Curry Rice", cat: "lunch", isVeg: false, price: 80, prepTime: 8, desc: "Two-egg curry served with steamed rice." },
  { slug: "paneer-butter", name: "Paneer Butter Masala + 2 Roti", cat: "dinner", isVeg: true, price: 110, prepTime: 12, desc: "Creamy tomato gravy with soft paneer." },
  { slug: "chicken-biryani", name: "Chicken Biryani", cat: "dinner", isVeg: false, price: 140, prepTime: 15, desc: "Dum-style biryani with raita.", popular: true },
  { slug: "veg-biryani", name: "Veg Biryani", cat: "dinner", isVeg: true, price: 100, prepTime: 12, desc: "Fragrant basmati with mixed vegetables." },
  { slug: "butter-chicken", name: "Butter Chicken + 2 Roti", cat: "dinner", isVeg: false, price: 150, prepTime: 15, desc: "Smoky chicken in buttery makhani gravy.", popular: true },
  { slug: "veg-thali", name: "Veg Thali", cat: "meals", isVeg: true, price: 90, prepTime: 8, desc: "Dal, sabzi, rice, 3 roti, salad, sweet.", popular: true },
  { slug: "special-thali", name: "Special Thali", cat: "meals", isVeg: true, price: 130, prepTime: 10, desc: "Paneer, dal makhani, pulao, roti, raita, sweet." },
  { slug: "nonveg-thali", name: "Non-Veg Thali", cat: "meals", isVeg: false, price: 150, prepTime: 12, desc: "Chicken curry, dal, rice, roti, salad." },
  { slug: "south-meals", name: "South Indian Meals", cat: "meals", isVeg: true, price: 100, prepTime: 8, desc: "Rice, sambar, rasam, poriyal, curd, papad." },
];

const hostelCategories = ["noodles", "snacks", "sandwiches", "beverages", "coffee", "chips", "chocolates", "candies", "breakfast"];

const canteenSpecs = [
  {
    code: "nescafe",
    name: "Nescafe",
    tagline: "Coffee, cold brews and quick bites",
    description: "The campus coffee kiosk for between-lecture caffeine, cold coffee and grilled sandwiches. Demo outlet with placeholder menu and timings.",
    cuisine: ["Coffee", "Beverages", "Sandwiches"],
    location: "Near Central Library",
    image: "/src/assets/canteen-2.jpg",
    rating: 4.6,
    ratingCount: 512,
    prepTime: 6,
    isOpen: true,
    acceptingOrders: true,
    featured: true,
    phone: "+91 98765 43201",
    openingTime: "08:00",
    closingTime: "23:00",
    cats: ["coffee", "beverages", "sandwiches", "noodles", "snacks", "chocolates", "chips"],
  },
  {
    code: "annapurna",
    name: "Annapurna Canteen",
    tagline: "Home-style North Indian meals",
    description: "Hearty thalis, rajma chawal and paratha breakfasts — the main mess-style canteen. Demo outlet with placeholder menu and timings.",
    cuisine: ["North Indian", "Thali", "Breakfast"],
    location: "Academic Block, Gate 2",
    image: "/src/assets/canteen-1.jpg",
    rating: 4.4,
    ratingCount: 864,
    prepTime: 12,
    isOpen: true,
    acceptingOrders: true,
    featured: true,
    phone: "+91 98765 43202",
    openingTime: "07:30",
    closingTime: "22:00",
    cats: ["breakfast", "lunch", "dinner", "meals", "beverages", "snacks"],
  },
  {
    code: "hostel-a",
    name: "Hostel A Canteen",
    tagline: "Late-night Maggi, chai and quick bites",
    description: "The go-to night canteen for Hostel A residents — Maggi, sandwiches, chai and snacks until late. Demo outlet.",
    cuisine: ["Maggi", "Snacks", "Chai"],
    location: "Ground floor, Hostel A",
    image: "/src/assets/canteen-1.jpg",
    rating: 4.5,
    ratingCount: 120,
    prepTime: 8,
    isOpen: true,
    acceptingOrders: true,
    featured: true,
    phone: "+91 98765 43210",
    openingTime: "18:00",
    closingTime: "02:00",
    cats: hostelCategories,
  },
  {
    code: "hostel-c",
    name: "Hostel C Canteen",
    tagline: "Late-night snacks & midnight fuel",
    description: "Hostel C nighttime canteen with fresh parathas, toast and cold beverages. Demo outlet.",
    cuisine: ["Maggi", "Snacks", "Chai"],
    location: "Ground floor, Hostel C",
    image: "/src/assets/canteen-2.jpg",
    rating: 4.2,
    ratingCount: 95,
    prepTime: 10,
    isOpen: true,
    acceptingOrders: true,
    featured: false,
    phone: "+91 98765 43211",
    openingTime: "18:00",
    closingTime: "02:00",
    cats: hostelCategories,
  },
  {
    code: "hostel-e",
    name: "Hostel E Canteen",
    tagline: "Fresh rolls, Maggi & juices",
    description: "Popular with engineers working late into the night. Demo outlet.",
    cuisine: ["Maggi", "Snacks", "Juices"],
    location: "Ground floor, Hostel E",
    image: "/src/assets/canteen-3.jpg",
    rating: 4.3,
    ratingCount: 110,
    prepTime: 8,
    isOpen: true,
    acceptingOrders: true,
    featured: false,
    phone: "+91 98765 43212",
    openingTime: "18:00",
    closingTime: "02:00",
    cats: hostelCategories,
  },
  {
    code: "hostel-f",
    name: "Hostel F Canteen",
    tagline: "Burgers, hot chai and fries",
    description: "Hostel F outlet featuring loaded burgers and quick evening snacks. Demo outlet.",
    cuisine: ["Burgers", "Snacks", "Chai"],
    location: "Ground floor, Hostel F",
    image: "/src/assets/canteen-1.jpg",
    rating: 4.1,
    ratingCount: 88,
    prepTime: 10,
    isOpen: true,
    acceptingOrders: true,
    featured: false,
    phone: "+91 98765 43213",
    openingTime: "18:00",
    closingTime: "02:00",
    cats: [...hostelCategories, "burgers"],
  },
  {
    code: "hostel-g",
    name: "Hostel G Canteen",
    tagline: "Evening snacks & student hangout",
    description: "Cozy spot for tea and conversation. Demo outlet.",
    cuisine: ["Snacks", "Maggi", "Tea"],
    location: "Ground floor, Hostel G",
    image: "/src/assets/canteen-2.jpg",
    rating: 4.0,
    ratingCount: 75,
    prepTime: 8,
    isOpen: true,
    acceptingOrders: true,
    featured: false,
    phone: "+91 98765 43214",
    openingTime: "18:00",
    closingTime: "02:00",
    cats: hostelCategories,
  },
  {
    code: "hostel-h",
    name: "Hostel H Canteen",
    tagline: "Midnight cafe & sandwiches",
    description: "Quiet evening canteen. Currently closed for demo maintenance. Demo outlet.",
    cuisine: ["Sandwiches", "Beverages"],
    location: "Ground floor, Hostel H",
    image: "/src/assets/canteen-3.jpg",
    rating: 4.2,
    ratingCount: 64,
    prepTime: 12,
    isOpen: false,
    acceptingOrders: false,
    featured: false,
    phone: "+91 98765 43215",
    openingTime: "18:00",
    closingTime: "02:00",
    cats: hostelCategories,
  },
  {
    code: "hostel-i",
    name: "Hostel I Canteen",
    tagline: "Fast bites and hot tea",
    description: "Friendly service and warm snacks throughout the night. Demo outlet.",
    cuisine: ["Maggi", "Snacks"],
    location: "Ground floor, Hostel I",
    image: "/src/assets/canteen-1.jpg",
    rating: 4.3,
    ratingCount: 92,
    prepTime: 8,
    isOpen: true,
    acceptingOrders: true,
    featured: false,
    phone: "+91 98765 43216",
    openingTime: "18:00",
    closingTime: "02:00",
    cats: hostelCategories,
  },
  {
    code: "hostel-j",
    name: "Hostel J Canteen",
    tagline: "Lunch trays, rolls and evening tea",
    description: "Extended hours canteen serving day lunch and late-night supper. Demo outlet.",
    cuisine: ["Lunch", "Maggi", "Snacks"],
    location: "Ground floor, Hostel J",
    image: "/src/assets/canteen-2.jpg",
    rating: 4.4,
    ratingCount: 140,
    prepTime: 10,
    isOpen: true,
    acceptingOrders: true,
    featured: false,
    phone: "+91 98765 43217",
    openingTime: "12:00",
    closingTime: "02:00",
    cats: [...hostelCategories, "lunch"],
  },
  {
    code: "hostel-k",
    name: "Hostel K Canteen",
    tagline: "Hostel K student mess & cafe",
    description: "Currently undergoing kitchen renovation in this demo. Demo outlet.",
    cuisine: ["Snacks", "Tea"],
    location: "Ground floor, Hostel K",
    image: "/src/assets/canteen-3.jpg",
    rating: 3.9,
    ratingCount: 50,
    prepTime: 12,
    isOpen: false,
    acceptingOrders: false,
    featured: false,
    phone: "+91 98765 43218",
    openingTime: "18:00",
    closingTime: "02:00",
    cats: hostelCategories,
  },
  {
    code: "amba",
    name: "Amba",
    tagline: "Biryani, thalis and dinner specials",
    description: "Known for biryani nights and generous non-veg thalis. Demo outlet with placeholder menu and timings.",
    cuisine: ["Biryani", "Mughlai", "Thali"],
    location: "Near Sports Complex",
    image: "/src/assets/canteen-3.jpg",
    rating: 4.5,
    ratingCount: 640,
    prepTime: 15,
    isOpen: true,
    acceptingOrders: true,
    featured: true,
    phone: "+91 98765 43203",
    openingTime: "11:30",
    closingTime: "23:00",
    cats: ["lunch", "dinner", "meals", "beverages"],
  },
  {
    code: "lhc",
    name: "LHC Canteen",
    tagline: "Grab-and-go between lectures",
    description: "Right next to the Lecture Hall Complex — burgers, sandwiches and chai for the 10-minute break. Demo outlet.",
    cuisine: ["Fast food", "Burgers", "Chai"],
    location: "Lecture Hall Complex",
    image: "/src/assets/canteen-1.jpg",
    rating: 4.2,
    ratingCount: 455,
    prepTime: 7,
    isOpen: true,
    acceptingOrders: true,
    featured: true,
    phone: "+91 98765 43204",
    openingTime: "08:00",
    closingTime: "18:00",
    cats: ["burgers", "sandwiches", "snacks", "beverages", "coffee", "chips", "chocolates", "candies"],
  },
  {
    code: "surya",
    name: "Surya",
    tagline: "South Indian tiffin and meals",
    description: "Crispy dosas, idli, filter coffee and banana-leaf style meals. Demo outlet with placeholder menu and timings.",
    cuisine: ["South Indian", "Tiffin", "Filter coffee"],
    location: "Opposite Main Auditorium",
    image: "/src/assets/canteen-3.jpg",
    rating: 4.7,
    ratingCount: 702,
    prepTime: 10,
    isOpen: true,
    acceptingOrders: true,
    featured: true,
    phone: "+91 98765 43205",
    openingTime: "07:00",
    closingTime: "21:30",
    cats: ["breakfast", "meals", "coffee", "beverages", "lunch"],
  },
];

async function main() {
  console.log("🌱 Starting Canteeno production database seed...");

  // 1. Platform Settings
  await prisma.platformSettings.deleteMany();
  await prisma.platformSettings.create({
    data: {
      platformName: "Canteeno",
      campusName: "Campus Central",
      orderingEnabled: true,
      maxActiveOrders: 3,
      pickupHoldMinutes: 20,
      supportEmail: "canteen-support@campus.edu",
      allowUpi: false,
    },
  });
  console.log("✅ Platform settings seeded");

  // 2. Clean existing database records
  await prisma.notification.deleteMany();
  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.foodItem.deleteMany();
  await prisma.canteen.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  console.log("🧹 Previous records cleared");

  // 3. Seed Categories
  const categoryMap = new Map<string, string>();
  for (const cat of categoriesData) {
    const created = await prisma.category.create({
      data: {
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        active: true,
      },
    });
    categoryMap.set(cat.slug, created.id);
  }
  console.log(`✅ Seeded ${categoriesData.length} categories`);

  // 4. Seed Canteens
  const canteenMap = new Map<string, any>();
  for (const spec of canteenSpecs) {
    const hours = [
      { day: "Mon", open: spec.openingTime, close: spec.closingTime, closed: false },
      { day: "Tue", open: spec.openingTime, close: spec.closingTime, closed: false },
      { day: "Wed", open: spec.openingTime, close: spec.closingTime, closed: false },
      { day: "Thu", open: spec.openingTime, close: spec.closingTime, closed: false },
      { day: "Fri", open: spec.openingTime, close: spec.closingTime, closed: false },
      { day: "Sat", open: spec.openingTime, close: spec.closingTime, closed: false },
      { day: "Sun", open: spec.openingTime, close: spec.closingTime, closed: false },
    ];

    const canteen = await prisma.canteen.create({
      data: {
        code: spec.code,
        name: spec.name,
        tagline: spec.tagline,
        description: spec.description,
        cuisine: spec.cuisine,
        location: spec.location,
        image: spec.image,
        openingTime: spec.openingTime,
        closingTime: spec.closingTime,
        openingHours: hours,
        isOpen: spec.isOpen,
        acceptingOrders: spec.acceptingOrders,
        featured: spec.featured,
        phone: spec.phone,
        prepTime: spec.prepTime,
        rating: spec.rating,
        ratingCount: spec.ratingCount,
        isDemo: true,
      },
    });
    canteenMap.set(spec.code, canteen);
  }
  console.log(`✅ Seeded ${canteenSpecs.length} campus canteens`);

  // 5. Seed Food Items
  let totalFoods = 0;
  for (const spec of canteenSpecs) {
    const canteen = canteenMap.get(spec.code);
    const availableTemplates = foodTemplates.filter((t) => spec.cats.includes(t.cat));

    for (const t of availableTemplates) {
      const categoryId = categoryMap.get(t.cat);
      await prisma.foodItem.create({
        data: {
          name: t.name,
          description: t.desc,
          price: t.price,
          isVeg: t.isVeg,
          preparationTime: t.prepTime,
          inStock: true,
          isAvailable: true,
          popular: Boolean(t.popular),
          recommended: t.price >= 50 && t.price <= 100,
          rating: 4.2 + (Math.floor(Math.random() * 8) / 10),
          canteenId: canteen.id,
          categoryId: categoryId || null,
          image: `/src/assets/food-${t.cat}.jpg`,
        },
      });
      totalFoods++;
    }
  }
  console.log(`✅ Seeded ${totalFoods} food items across canteens`);

  // 6. Seed Users
  const studentHash = await bcrypt.hash("demo1234", 10);
  const staffHash = await bcrypt.hash("staff1234", 10);
  const adminHash = await bcrypt.hash("admin1234", 10);

  const nescafe = canteenMap.get("nescafe");
  const annapurna = canteenMap.get("annapurna");
  const amba = canteenMap.get("amba");
  const surya = canteenMap.get("surya");

  const aarav = await prisma.user.create({
    data: {
      name: "Aarav Sharma",
      email: "aarav@campus.edu",
      passwordHash: studentHash,
      role: Role.STUDENT,
      rollNo: "22CS1042",
      phone: "+91 98765 01042",
      hostel: "Hostel A",
      favouriteCanteens: [nescafe.id, annapurna.id],
    },
  });

  const diya = await prisma.user.create({
    data: {
      name: "Diya Patel",
      email: "diya@campus.edu",
      passwordHash: studentHash,
      role: Role.STUDENT,
      rollNo: "23EE2015",
      phone: "+91 98765 02015",
      hostel: "Hostel C",
    },
  });

  const staffNescafe = await prisma.user.create({
    data: {
      name: "Nescafe Manager",
      email: "staff.nescafe@campus.edu",
      passwordHash: staffHash,
      role: Role.CANTEEN_STAFF,
      canteenId: nescafe.id,
      phone: "+91 98765 43201",
    },
  });

  const staffAnnapurna = await prisma.user.create({
    data: {
      name: "Annapurna Manager",
      email: "staff.annapurna@campus.edu",
      passwordHash: staffHash,
      role: Role.CANTEEN_STAFF,
      canteenId: annapurna.id,
      phone: "+91 98765 43202",
    },
  });

  const staffAmba = await prisma.user.create({
    data: {
      name: "Amba Manager",
      email: "staff.amba@campus.edu",
      passwordHash: staffHash,
      role: Role.CANTEEN_STAFF,
      canteenId: amba.id,
      phone: "+91 98765 43203",
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: "Campus Dining Admin",
      email: "admin@campus.edu",
      passwordHash: adminHash,
      role: Role.ADMIN,
      phone: "+91 98765 99999",
    },
  });
  console.log("✅ Seeded test accounts (student, staff, admin)");

  // 7. Seed Sample Orders for Aarav
  const nescafeFoods = await prisma.foodItem.findMany({ where: { canteenId: nescafe.id }, take: 4 });
  const annaFoods = await prisma.foodItem.findMany({ where: { canteenId: annapurna.id }, take: 4 });

  if (nescafeFoods.length >= 2) {
    const f1 = nescafeFoods[0];
    const f2 = nescafeFoods[1];
    const order1 = await prisma.order.create({
      data: {
        orderNumber: "CN-NC-4821",
        studentId: aarav.id,
        studentName: aarav.name,
        canteenId: nescafe.id,
        status: OrderStatus.READY_FOR_PICKUP,
        subtotal: f1.price + f2.price * 2,
        totalAmount: f1.price + f2.price * 2,
        estimatedPreparationTime: 8,
        pickupSlot: "asap",
        note: "Extra napkins please",
        paymentMethod: "counter",
        history: [
          { status: "placed", at: new Date(Date.now() - 25 * 60000).toISOString() },
          { status: "accepted", at: new Date(Date.now() - 20 * 60000).toISOString() },
          { status: "preparing", at: new Date(Date.now() - 15 * 60000).toISOString() },
          { status: "ready", at: new Date(Date.now() - 2 * 60000).toISOString() },
        ],
        items: {
          create: [
            { foodItemId: f1.id, itemName: f1.name, quantity: 1, unitPrice: f1.price, subtotal: f1.price, isVeg: f1.isVeg },
            { foodItemId: f2.id, itemName: f2.name, quantity: 2, unitPrice: f2.price, subtotal: f2.price * 2, isVeg: f2.isVeg },
          ],
        },
      },
    });

    await prisma.notification.create({
      data: {
        userId: aarav.id,
        orderId: order1.id,
        title: "Ready for pickup!",
        message: "CN-NC-4821 is ready at the Nescafe counter. Show your pickup code.",
        kind: "order",
      },
    });
  }

  if (annaFoods.length >= 2) {
    const af1 = annaFoods[0];
    const af2 = annaFoods[1];
    await prisma.order.create({
      data: {
        orderNumber: "CN-AN-1092",
        studentId: aarav.id,
        studentName: aarav.name,
        canteenId: annapurna.id,
        status: OrderStatus.COLLECTED,
        subtotal: af1.price + af2.price,
        totalAmount: af1.price + af2.price,
        estimatedPreparationTime: 12,
        pickupSlot: "asap",
        note: "",
        paymentMethod: "counter",
        reviewed: true,
        history: [
          { status: "placed", at: new Date(Date.now() - 120 * 60000).toISOString() },
          { status: "accepted", at: new Date(Date.now() - 110 * 60000).toISOString() },
          { status: "preparing", at: new Date(Date.now() - 95 * 60000).toISOString() },
          { status: "ready", at: new Date(Date.now() - 75 * 60000).toISOString() },
          { status: "collected", at: new Date(Date.now() - 60 * 60000).toISOString() },
        ],
        items: {
          create: [
            { foodItemId: af1.id, itemName: af1.name, quantity: 1, unitPrice: af1.price, subtotal: af1.price, isVeg: af1.isVeg },
            { foodItemId: af2.id, itemName: af2.name, quantity: 1, unitPrice: af2.price, subtotal: af2.price, isVeg: af2.isVeg },
          ],
        },
      },
    });
  }

  // 8. Seed Reviews
  await prisma.review.create({
    data: {
      studentId: aarav.id,
      studentName: aarav.name,
      canteenId: nescafe.id,
      rating: 5,
      comment: "Best cold coffee on campus, quick pickup even between classes!",
      status: "published",
    },
  });

  await prisma.review.create({
    data: {
      studentId: diya.id,
      studentName: diya.name,
      canteenId: annapurna.id,
      rating: 4,
      comment: "Generous thalis and authentic taste. Always fresh.",
      status: "published",
    },
  });

  console.log("🎉 Canteeno database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

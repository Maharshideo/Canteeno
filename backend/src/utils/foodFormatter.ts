export const formatFoodItem = (food: any) => {
  if (!food) return food;
  return {
    id: food.id,
    canteenId: food.canteenId,
    name: food.name,
    description: food.description || "",
    price: food.price,
    categoryId: food.categoryId || food.category,
    category: food.category || food.categoryRel?.slug || "",
    categoryRel: food.categoryRel,
    isVeg: Boolean(food.isVeg),
    image: food.image || "",
    prepTime: food.preparationTime ?? 10,
    preparationTime: food.preparationTime ?? 10,
    inStock: food.inStock !== false,
    available: food.isAvailable !== false,
    isAvailable: food.isAvailable !== false,
    popular: Boolean(food.popular),
    recommended: Boolean(food.recommended),
    rating: food.rating ?? 4.5,
    canteen: food.canteen,
    createdAt: food.createdAt,
    updatedAt: food.updatedAt,
  };
};

"use strict";
// Seeds the foods catalogue: every existing recipe from the static demo
// (index.html), ported as-is, plus two new evidence-backed functional
// drinks. Safe to re-run: each food is upserted by its stable slug.

const db = require("./db");

// Meals: ported from index.html's RECIPES array, field-for-field.
const MEALS = [
  { slug: "moong-dal-chilla", name: "Moong Dal Chilla", slot: "breakfast", region: "north", wide: true, hasMeatFish: false, hasEgg: false, vegan: true, jainSafe: false,
    tags: ["high_protein", "low_gi", "weight_loss_friendly"], calories: 220, protein: 12, carbs: 28, fat: 6, prep: "20 min",
    ingredients: ["1 cup split yellow moong dal, soaked 3 hrs", "1 green chilli", "1/2 inch ginger", "1/4 tsp cumin seeds", "2 tbsp chopped onion", "Salt to taste", "1 tsp oil for cooking"],
    steps: ["Grind soaked moong dal with ginger, green chilli, and a little water into a smooth, pourable batter.", "Stir in cumin seeds, chopped onion, and salt.", "Heat a tawa, pour a ladle of batter and spread thin like a dosa.", "Drizzle a little oil on the edges, cook both sides until golden, and serve hot."] },
  { slug: "ragi-dosa", name: "Ragi Dosa", slot: "breakfast", region: "south", wide: true, hasMeatFish: false, hasEgg: false, vegan: true, jainSafe: true,
    tags: ["low_gi", "iron_rich", "high_fiber"], calories: 190, protein: 6, carbs: 32, fat: 4, prep: "15 min (batter made ahead)",
    ingredients: ["1 cup ragi (finger millet) flour", "1/2 cup rice flour", "2 tbsp water or curd", "1/4 tsp cumin seeds", "1 green chilli, chopped", "Salt to taste", "Oil for the tawa"],
    steps: ["Whisk ragi flour, rice flour, cumin, chilli, and salt with water into a thin, lump-free batter.", "Rest the batter for 10 minutes.", "Heat a tawa, pour the batter in a thin circular motion from the edge inward.", "Drizzle oil, cook until crisp and lightly browned, then serve."] },
  { slug: "poha-with-peanuts", name: "Poha with Peanuts", slot: "breakfast", region: "west", wide: true, hasMeatFish: false, hasEgg: false, vegan: true, jainSafe: false,
    tags: ["iron_rich", "weight_loss_friendly"], calories: 240, protein: 6, carbs: 38, fat: 8, prep: "15 min",
    ingredients: ["1.5 cups thick poha", "2 tbsp peanuts", "1 small potato, diced", "1/2 tsp mustard seeds", "1 small onion, chopped", "A pinch of turmeric", "Juice of 1/2 lemon", "Coriander leaves"],
    steps: ["Rinse poha in a colander until soft; drain well.", "Heat oil, splutter mustard seeds, fry peanuts and diced potato until golden.", "Add onion, turmeric, and salt; sauté until softened.", "Fold in the poha, cook 2 minutes, finish with lemon juice and coriander."] },
  { slug: "egg-bhurji-multigrain-roti", name: "Egg Bhurji with Multigrain Roti", slot: "breakfast", region: "north", wide: true, hasMeatFish: false, hasEgg: true, vegan: false, jainSafe: false,
    tags: ["high_protein", "vitd_rich"], calories: 260, protein: 16, carbs: 24, fat: 12, prep: "15 min",
    ingredients: ["2 eggs", "1 small onion, chopped", "1 small tomato, chopped", "1 green chilli", "1/4 tsp turmeric", "2 multigrain rotis", "Coriander leaves"],
    steps: ["Heat oil, sauté onion, chilli, and tomato until soft.", "Add turmeric and salt, then pour in beaten eggs.", "Scramble on medium heat until just set.", "Garnish with coriander and serve with warm rotis."] },
  { slug: "sattu-paratha", name: "Sattu Paratha", slot: "breakfast", region: "east", wide: false, hasMeatFish: false, hasEgg: false, vegan: false, jainSafe: true,
    tags: ["high_protein", "high_fiber", "iron_rich"], calories: 280, protein: 11, carbs: 34, fat: 10, prep: "30 min",
    ingredients: ["1 cup roasted chana sattu", "2 cups whole wheat flour, for dough", "1 tsp mustard oil + ajwain", "1/2 inch ginger, grated", "1 green chilli, chopped", "A squeeze of lemon", "Ghee for roasting"],
    steps: ["Mix sattu with mustard oil, ajwain, ginger, chilli, lemon juice, and a little water into a thick paste.", "Make wheat dough into balls and stuff each with the sattu filling.", "Roll gently into parathas without letting the filling spill.", "Roast on a hot tawa with ghee until golden on both sides."] },
  { slug: "idli-with-sambar", name: "Idli with Sambar", slot: "breakfast", region: "south", wide: false, hasMeatFish: false, hasEgg: false, vegan: true, jainSafe: true,
    tags: ["low_gi", "low_fat", "high_fiber"], calories: 210, protein: 8, carbs: 40, fat: 2, prep: "20 min (batter fermented ahead)",
    ingredients: ["4 steamed idlis", "1/2 cup toor dal, cooked", "Mixed vegetables: drumstick, pumpkin, carrot", "1 tsp sambar powder", "A pinch of asafoetida", "Tamarind pulp", "Curry leaves and mustard seeds"],
    steps: ["Simmer cooked toor dal with vegetables, tamarind pulp, and sambar powder until tender.", "Temper with mustard seeds, curry leaves, and asafoetida; stir in.", "Steam the idlis until fluffy.", "Serve idlis hot with a generous ladle of sambar."] },
  { slug: "handvo", name: "Handvo", slot: "breakfast", region: "west", wide: false, hasMeatFish: false, hasEgg: false, vegan: false, jainSafe: false,
    tags: ["high_protein", "high_fiber"], calories: 250, protein: 9, carbs: 30, fat: 10, prep: "40 min (batter fermented ahead)",
    ingredients: ["1 cup mixed lentil-rice batter", "1/4 cup grated bottle gourd", "1/4 cup grated carrot", "2 tbsp curd", "1/2 tsp eno fruit salt", "Mustard seeds, sesame seeds, curry leaves"],
    steps: ["Mix the fermented batter with grated vegetables and curd.", "Just before baking, stir in eno and pour into a greased pan.", "Temper mustard seeds, sesame, and curry leaves in oil and pour over the batter.", "Bake or steam until a skewer comes out clean, then cut into squares."] },
  { slug: "methi-thepla", name: "Methi Thepla", slot: "breakfast", region: "west", wide: false, hasMeatFish: false, hasEgg: false, vegan: true, jainSafe: true,
    tags: ["high_fiber", "low_fat"], calories: 200, protein: 6, carbs: 30, fat: 6, prep: "20 min",
    ingredients: ["1 cup whole wheat flour", "1/2 cup fresh fenugreek (methi) leaves, chopped", "2 tbsp besan", "1/4 tsp turmeric, 1/2 tsp red chilli powder", "1 tsp oil, plus more for roasting", "Salt to taste"],
    steps: ["Mix wheat flour, besan, chopped methi leaves, turmeric, chilli powder, and salt.", "Add oil and enough water to knead into a soft dough.", "Roll into thin rounds and roast on a hot tawa with a little oil until golden spots appear on both sides.", "Serve warm, plain or with curd and pickle."] },
  { slug: "khakhra-peanut-chutney", name: "Khakhra with Peanut Chutney", slot: "breakfast", region: "west", wide: true, hasMeatFish: false, hasEgg: false, vegan: true, jainSafe: true,
    tags: ["low_fat", "weight_loss_friendly"], calories: 180, protein: 5, carbs: 30, fat: 4, prep: "10 min",
    ingredients: ["3 whole wheat khakhras (thin roasted crackers)", "2 tbsp roasted peanut-sesame chutney powder", "A drizzle of oil, optional"],
    steps: ["Dry roast the khakhras lightly if not already crisp.", "Blend roasted peanuts, sesame seeds, dried red chilli, and salt into a coarse chutney.", "Serve the khakhras with the chutney on the side or spread thin over each piece.", "Eat immediately for the best crunch."] },
  { slug: "sabudana-khichdi", name: "Sabudana Khichdi", slot: "breakfast", region: "west", wide: true, hasMeatFish: false, hasEgg: false, vegan: true, jainSafe: true,
    tags: ["high_fiber"], calories: 280, protein: 6, carbs: 42, fat: 10, prep: "15 min (sabudana soaked overnight)",
    ingredients: ["1.5 cups sabudana (tapioca pearls), soaked overnight", "2 tbsp roasted peanuts, coarsely crushed", "1 tsp cumin seeds", "1 green chilli, chopped", "Juice of 1/2 lemon", "Coriander leaves"],
    steps: ["Drain the soaked sabudana well so the pearls stay separate.", "Heat oil, splutter cumin seeds and green chilli.", "Add the sabudana and crushed peanuts, tossing gently on low heat until the pearls turn translucent.", "Finish with lemon juice, salt, and coriander; serve warm."] },

  { slug: "rajma-chawal", name: "Rajma Chawal", slot: "lunch", region: "north", wide: true, hasMeatFish: false, hasEgg: false, vegan: true, jainSafe: false,
    tags: ["high_protein", "high_fiber", "muscle_gain_friendly"], calories: 380, protein: 15, carbs: 60, fat: 8, prep: "40 min (soaked overnight)",
    ingredients: ["1 cup rajma, soaked overnight", "1 onion, 2 tomatoes, pureed", "1 tbsp ginger-garlic paste", "1 tsp rajma masala", "1 cup steamed rice", "Coriander leaves"],
    steps: ["Pressure-cook soaked rajma until soft, about 5-6 whistles.", "Sauté onion until golden, add ginger-garlic paste and tomato puree, cook until oil separates.", "Add rajma masala and the cooked rajma with its stock; simmer 15 minutes.", "Serve hot over steamed rice, garnished with coriander."] },
  { slug: "sambar-rice-vegetables", name: "Sambar Rice with Vegetables", slot: "lunch", region: "south", wide: false, hasMeatFish: false, hasEgg: false, vegan: true, jainSafe: true,
    tags: ["low_gi", "high_fiber"], calories: 340, protein: 10, carbs: 58, fat: 6, prep: "30 min",
    ingredients: ["1 cup cooked rice", "1/2 cup toor dal, cooked", "Mixed vegetables: drumstick, brinjal, pumpkin", "1.5 tbsp sambar powder", "Tamarind pulp", "Mustard seeds, curry leaves, asafoetida"],
    steps: ["Cook vegetables with tamarind pulp and sambar powder until tender.", "Mash in the cooked dal and simmer to a thick, pourable consistency.", "Temper with mustard seeds, curry leaves, and asafoetida; pour over the sambar.", "Mix with steamed rice and serve hot."] },
  { slug: "chettinad-chicken-brown-rice", name: "Chettinad Chicken with Brown Rice", slot: "lunch", region: "south", wide: false, hasMeatFish: true, hasEgg: false, vegan: false, jainSafe: false,
    tags: ["high_protein", "muscle_gain_friendly"], calories: 420, protein: 34, carbs: 38, fat: 14, prep: "45 min",
    ingredients: ["300g chicken, curry cut", "2 tbsp Chettinad masala", "1 onion, sliced", "2 tomatoes, chopped", "1 cup cooked brown rice", "Curry leaves"],
    steps: ["Marinate chicken with a little turmeric and salt.", "Sauté onion until deep golden, add ginger-garlic paste and Chettinad masala, cook until fragrant.", "Add tomatoes and chicken; cook covered until tender and the gravy thickens.", "Serve hot with brown rice."] },
  { slug: "macher-jhol-rice", name: "Macher Jhol with Rice", slot: "lunch", region: "east", wide: false, hasMeatFish: true, hasEgg: false, vegan: false, jainSafe: false,
    tags: ["high_protein", "vitd_rich", "low_fat"], calories: 360, protein: 28, carbs: 40, fat: 10, prep: "35 min",
    ingredients: ["2 pieces rohu or katla fish", "1 potato, cut into wedges", "1 tsp panch phoron", "1/2 tsp turmeric", "1 tbsp mustard oil", "1 cup steamed rice"],
    steps: ["Shallow-fry the fish lightly in mustard oil and set aside.", "Temper panch phoron in the same oil, add potato wedges and turmeric, and sauté briefly.", "Add water for a thin gravy, simmer until the potato is cooked.", "Slide the fish back in, simmer 5 minutes, and serve over rice."] },
  { slug: "undhiyu-bajra-roti", name: "Undhiyu with Bajra Roti", slot: "lunch", region: "west", wide: false, hasMeatFish: false, hasEgg: false, vegan: true, jainSafe: false,
    tags: ["high_fiber", "low_fat"], calories: 310, protein: 9, carbs: 45, fat: 9, prep: "50 min",
    ingredients: ["Surti papdi (flat beans)", "Purple yam and sweet potato", "Brinjal, chopped", "1/4 cup green garlic-coriander-peanut masala", "2 bajra rotis"],
    steps: ["Toss all the vegetables with the green masala and a little oil.", "Layer them in a heavy pot and cook covered on low heat, stirring occasionally, until tender.", "Adjust salt and finish with a squeeze of lemon.", "Serve warm with bajra roti."] },
  { slug: "lauki-chana-dal", name: "Lauki Chana Dal", slot: "lunch", region: "north", wide: true, hasMeatFish: false, hasEgg: false, vegan: true, jainSafe: true,
    tags: ["low_gi", "high_fiber", "weight_loss_friendly"], calories: 260, protein: 12, carbs: 34, fat: 6, prep: "30 min",
    ingredients: ["1 cup bottle gourd, diced", "1/2 cup chana dal, soaked", "1/2 tsp cumin seeds", "1/4 tsp turmeric", "1 green chilli", "Coriander leaves"],
    steps: ["Pressure-cook chana dal with turmeric until soft but holding shape.", "Temper cumin seeds and chilli in oil, add diced lauki, and sauté briefly.", "Add the cooked dal and a little water; simmer until the lauki is tender.", "Finish with coriander and serve with roti or rice."] },
  { slug: "curd-rice-pomegranate", name: "Curd Rice with Pomegranate", slot: "lunch", region: "south", wide: true, hasMeatFish: false, hasEgg: false, vegan: false, jainSafe: true,
    tags: ["low_fat", "low_gi"], calories: 280, protein: 8, carbs: 42, fat: 8, prep: "15 min",
    ingredients: ["1 cup cooked rice, cooled", "1 cup fresh curd", "2 tbsp pomegranate seeds", "1/2 tsp mustard seeds", "1 dried red chilli, curry leaves", "A pinch of grated ginger"],
    steps: ["Mash the cooked rice slightly and mix in the curd until creamy.", "Temper mustard seeds, dried red chilli, and curry leaves in a little oil.", "Stir the tempering and grated ginger into the curd rice.", "Top with pomegranate seeds before serving."] },
  { slug: "tandoori-chicken-mint-chutney", name: "Tandoori Chicken with Mint Chutney", slot: "lunch", region: "north", wide: false, hasMeatFish: true, hasEgg: false, vegan: false, jainSafe: false,
    tags: ["high_protein", "low_fat", "muscle_gain_friendly"], calories: 300, protein: 34, carbs: 6, fat: 12, prep: "30 min (plus 2 hr marinade)",
    ingredients: ["300g chicken, on the bone or breast", "1/2 cup thick curd, for the marinade", "1 tbsp tandoori masala", "1 tsp ginger-garlic paste", "1 tsp lemon juice", "Mint-coriander chutney, to serve"],
    steps: ["Marinate the chicken in curd, tandoori masala, ginger-garlic paste, and lemon juice for at least 2 hours.", "Skewer or arrange the chicken and roast in a hot oven or tandoor until charred at the edges.", "Baste once with a little oil halfway through for extra colour.", "Rest a few minutes, then serve hot with mint-coriander chutney."] },
  { slug: "chicken-curry-rice", name: "Chicken Curry with Rice", slot: "lunch", region: "north", wide: true, hasMeatFish: true, hasEgg: false, vegan: false, jainSafe: false,
    tags: ["high_protein", "muscle_gain_friendly"], calories: 400, protein: 30, carbs: 42, fat: 16, prep: "40 min",
    ingredients: ["300g chicken, curry cut", "1 onion, 2 tomatoes, pureed", "1 tbsp ginger-garlic paste", "1 tsp garam masala, 1/2 tsp turmeric", "1 cup steamed rice"],
    steps: ["Sauté onion until golden, add ginger-garlic paste and cook until fragrant.", "Add tomato puree, turmeric, and garam masala; cook until the oil separates.", "Add chicken and a little water, cover and simmer until the chicken is cooked through.", "Serve hot over steamed rice."] },
  { slug: "kadhi-chawal", name: "Kadhi Chawal", slot: "lunch", region: "west", wide: true, hasMeatFish: false, hasEgg: false, vegan: false, jainSafe: true,
    tags: ["low_fat", "weight_loss_friendly"], calories: 250, protein: 7, carbs: 34, fat: 8, prep: "25 min",
    ingredients: ["1 cup curd, whisked", "3 tbsp besan (gram flour)", "1/2 tsp cumin seeds, a pinch of asafoetida", "1/4 tsp turmeric", "1 cup steamed rice", "Curry leaves, optional"],
    steps: ["Whisk curd with besan and a little water until smooth and lump-free.", "Bring to a gentle simmer, stirring continuously so it does not split, until it thickens slightly.", "Temper cumin seeds and asafoetida in a little oil and stir into the kadhi.", "Serve hot over steamed rice."] },
  { slug: "gujarati-dal-rice", name: "Gujarati Dal with Rice", slot: "lunch", region: "west", wide: false, hasMeatFish: false, hasEgg: false, vegan: true, jainSafe: true,
    tags: ["high_fiber", "low_gi"], calories: 260, protein: 10, carbs: 38, fat: 6, prep: "30 min",
    ingredients: ["1/2 cup toor dal, cooked soft", "1 tsp jaggery, a small piece of kokum or a squeeze of lemon", "1/4 tsp turmeric", "Cumin and mustard seeds, curry leaves, and a pinch of hing for tempering", "1 cup steamed rice"],
    steps: ["Mash the cooked dal and thin it with water to a pourable consistency.", "Add turmeric, jaggery, and kokum (or lemon juice at the end) and simmer 10 minutes.", "Temper mustard seeds, cumin, curry leaves, and hing in a little oil and stir in.", "Serve hot over steamed rice."] },
  { slug: "dimer-jhol-rice", name: "Dimer Jhol (Bengali Egg Curry) with Rice", slot: "lunch", region: "east", wide: false, hasMeatFish: false, hasEgg: true, vegan: false, jainSafe: false,
    tags: ["high_protein", "vitd_rich"], calories: 280, protein: 14, carbs: 30, fat: 12, prep: "30 min",
    ingredients: ["4 eggs, boiled", "1 potato, halved and lightly fried", "1 onion, pureed", "1 tsp panch phoron", "1/2 tsp turmeric", "1 cup steamed rice"],
    steps: ["Lightly fry the boiled eggs and potato until golden; set aside.", "Temper panch phoron in oil, add pureed onion, and cook until soft.", "Add turmeric and a little water to form a thin gravy; simmer until fragrant.", "Slide in the eggs and potato, simmer 5 minutes, and serve over rice."] },

  { slug: "roasted-makhana", name: "Roasted Makhana", slot: "snack", region: "north", wide: true, hasMeatFish: false, hasEgg: false, vegan: true, jainSafe: true,
    tags: ["low_gi", "low_fat", "weight_loss_friendly"], calories: 110, protein: 4, carbs: 16, fat: 4, prep: "10 min",
    ingredients: ["1.5 cups makhana (fox nuts)", "1 tsp ghee or oil", "1/4 tsp roasted cumin powder", "A pinch of black salt"],
    steps: ["Dry roast makhana on low heat until crisp, about 6-8 minutes.", "Drizzle with ghee and toss to coat lightly.", "Sprinkle roasted cumin powder and black salt.", "Cool slightly for extra crunch before serving."] },
  { slug: "sprouts-chaat", name: "Sprouts Chaat", slot: "snack", region: "west", wide: true, hasMeatFish: false, hasEgg: false, vegan: true, jainSafe: false,
    tags: ["high_protein", "high_fiber", "iron_rich"], calories: 160, protein: 9, carbs: 22, fat: 3, prep: "15 min",
    ingredients: ["1.5 cups mixed sprouts, steamed", "1 small onion, chopped", "1 tomato, chopped", "1/2 tsp chaat masala", "Juice of 1/2 lemon", "Coriander leaves"],
    steps: ["Steam the sprouts lightly until just tender, not mushy.", "Toss with chopped onion, tomato, and coriander.", "Sprinkle chaat masala and lemon juice.", "Mix well and serve immediately for the best crunch."] },
  { slug: "sundal", name: "Sundal", slot: "snack", region: "south", wide: false, hasMeatFish: false, hasEgg: false, vegan: true, jainSafe: true,
    tags: ["high_protein", "high_fiber"], calories: 150, protein: 8, carbs: 20, fat: 4, prep: "15 min (chana pre-soaked)",
    ingredients: ["1.5 cups boiled kala chana or white chana", "2 tbsp grated coconut", "1/2 tsp mustard seeds", "1 dried red chilli, curry leaves", "A pinch of asafoetida"],
    steps: ["Temper mustard seeds, dried red chilli, curry leaves, and asafoetida in oil.", "Add the boiled chana and toss to coat.", "Stir in grated coconut and a little salt.", "Serve warm as is."] },
  { slug: "dhokla", name: "Dhokla", slot: "snack", region: "west", wide: false, hasMeatFish: false, hasEgg: false, vegan: true, jainSafe: true,
    tags: ["low_fat", "high_protein"], calories: 140, protein: 6, carbs: 22, fat: 3, prep: "25 min",
    ingredients: ["1 cup besan", "1/2 tsp eno fruit salt", "1/4 tsp turmeric", "1 tsp lemon juice", "Mustard seeds, sesame seeds, curry leaves, green chilli"],
    steps: ["Whisk besan with turmeric, lemon juice, salt, and water into a smooth, thick batter.", "Stir in eno just before steaming; pour into a greased plate and steam 15 minutes.", "Cool slightly, then cut into squares.", "Temper mustard seeds, sesame, curry leaves, and chilli in oil, and pour over."] },
  { slug: "masala-chaas-roasted-chana", name: "Masala Chaas with Roasted Chana", slot: "snack", region: "north", wide: true, hasMeatFish: false, hasEgg: false, vegan: false, jainSafe: true,
    tags: ["low_gi"], calories: 120, protein: 6, carbs: 14, fat: 3, prep: "10 min",
    ingredients: ["1 cup curd, whisked with water", "1/4 tsp roasted cumin powder", "Mint and coriander leaves", "A pinch of black salt", "2 tbsp roasted chana"],
    steps: ["Whisk curd with chilled water until smooth and frothy.", "Stir in roasted cumin powder, black salt, and chopped mint and coriander.", "Pour into a glass and chill briefly.", "Serve with a small bowl of roasted chana on the side."] },
  { slug: "til-gud-ladoo", name: "Til-Gud Ladoo", slot: "snack", region: "west", wide: true, hasMeatFish: false, hasEgg: false, vegan: true, jainSafe: true,
    tags: ["iron_rich"], calories: 130, protein: 3, carbs: 18, fat: 6, prep: "20 min",
    ingredients: ["1/2 cup sesame seeds", "1/4 cup jaggery, grated", "1 tsp oil", "A pinch of cardamom powder"],
    steps: ["Dry roast sesame seeds until light golden and fragrant.", "Melt jaggery with oil on low heat until it forms a soft ball when dropped in water.", "Mix in the roasted sesame and cardamom powder, off the heat.", "While still warm, shape into small ladoos and let them cool."] },
  { slug: "amla-murabba-bowl", name: "Amla Murabba Bowl", slot: "snack", region: "north", wide: false, hasMeatFish: false, hasEgg: false, vegan: true, jainSafe: true,
    tags: ["high_fiber"], calories: 90, protein: 1, carbs: 22, fat: 0, prep: "10 min",
    ingredients: ["3-4 pieces amla murabba", "A few soaked almonds", "A pinch of saunf (fennel seeds)"],
    steps: ["Serve chilled amla murabba pieces in a small bowl.", "Add a few soaked, peeled almonds alongside.", "Finish with a pinch of saunf.", "Enjoy as a light mid-meal snack."] },
  { slug: "jhal-muri", name: "Jhal Muri", slot: "snack", region: "east", wide: false, hasMeatFish: false, hasEgg: false, vegan: true, jainSafe: false,
    tags: ["low_fat", "weight_loss_friendly"], calories: 170, protein: 5, carbs: 28, fat: 5, prep: "10 min",
    ingredients: ["3 cups puffed rice (muri)", "2 tbsp boiled chana", "1 tbsp peanuts", "1 small onion, finely chopped", "1 green chilli, chopped", "1 tsp mustard oil", "Juice of 1/2 lemon"],
    steps: ["Combine puffed rice, boiled chana, and peanuts in a large bowl.", "Add chopped onion and green chilli.", "Drizzle mustard oil and lemon juice over the mix.", "Toss everything together quickly and serve immediately while the puffed rice is still crisp."] },

  { slug: "palak-paneer-jowar-roti", name: "Palak Paneer with Jowar Roti", slot: "dinner", region: "north", wide: true, hasMeatFish: false, hasEgg: false, vegan: false, jainSafe: true,
    tags: ["iron_rich", "high_protein", "low_gi"], calories: 320, protein: 16, carbs: 26, fat: 16, prep: "30 min",
    ingredients: ["2 cups spinach, blanched and pureed", "150g paneer, cubed", "1/2 inch ginger, 1 green chilli", "1/4 tsp garam masala", "2 jowar rotis"],
    steps: ["Blend blanched spinach with ginger and chilli into a smooth puree.", "Heat a little oil, add the puree, and simmer 5 minutes.", "Add paneer cubes and garam masala; simmer 3-4 minutes more.", "Serve hot with jowar rotis."] },
  { slug: "vegetable-khichdi", name: "Vegetable Khichdi", slot: "dinner", region: "north", wide: true, hasMeatFish: false, hasEgg: false, vegan: true, jainSafe: true,
    tags: ["low_gi", "low_fat"], calories: 290, protein: 11, carbs: 48, fat: 5, prep: "30 min",
    ingredients: ["1/2 cup rice", "1/2 cup split moong dal", "Mixed vegetables: peas, beans, carrot", "1/2 tsp turmeric", "1 tsp cumin seeds", "1 tbsp oil"],
    steps: ["Wash rice and dal together; pressure-cook with vegetables, turmeric, and salt until soft.", "Temper cumin seeds in oil.", "Pour the tempering over the khichdi and mix well.", "Serve hot, loosening with a little water if needed."] },
  { slug: "bhindi-sabzi-missi-roti", name: "Bhindi Sabzi with Missi Roti", slot: "dinner", region: "north", wide: false, hasMeatFish: false, hasEgg: false, vegan: true, jainSafe: true,
    tags: ["high_fiber", "low_gi"], calories: 270, protein: 9, carbs: 36, fat: 8, prep: "25 min",
    ingredients: ["250g bhindi, sliced", "1/2 tsp cumin seeds", "1/4 tsp turmeric, 1/2 tsp amchur", "2 missi rotis"],
    steps: ["Heat oil, add cumin seeds, then the sliced bhindi.", "Cook uncovered on medium heat, stirring occasionally, until no longer sticky.", "Add turmeric, salt, and amchur; cook 2 more minutes.", "Serve hot with missi roti."] },
  { slug: "meen-kuzhambu-red-rice", name: "Meen Kuzhambu with Red Rice", slot: "dinner", region: "south", wide: false, hasMeatFish: true, hasEgg: false, vegan: false, jainSafe: false,
    tags: ["high_protein", "vitd_rich", "muscle_gain_friendly"], calories: 380, protein: 30, carbs: 36, fat: 12, prep: "35 min",
    ingredients: ["2 pieces seer fish or sardine", "2 tbsp kuzhambu masala", "Tamarind pulp", "1 tomato, chopped", "1 cup cooked red rice"],
    steps: ["Simmer tamarind pulp, tomato, and kuzhambu masala in oil until fragrant.", "Add water to form a gravy and simmer 10 minutes.", "Slide in the fish and simmer gently until just cooked through.", "Serve with red rice."] },
  { slug: "litti-chokha", name: "Litti Chokha", slot: "dinner", region: "east", wide: false, hasMeatFish: false, hasEgg: false, vegan: false, jainSafe: false,
    tags: ["high_protein", "high_fiber", "iron_rich"], calories: 340, protein: 12, carbs: 44, fat: 12, prep: "50 min",
    ingredients: ["1 cup sattu, spiced with ajwain and mustard oil", "Whole wheat dough balls", "Brinjal and potato, roasted and mashed", "Garlic, green chilli, mustard oil"],
    steps: ["Stuff the dough balls with the spiced sattu filling and seal well.", "Roast or bake the litti, turning occasionally, until firm and lightly charred.", "Mash roasted brinjal and potato with garlic, chilli, and mustard oil for the chokha.", "Dunk the litti in ghee if desired and serve with the chokha."] },
  { slug: "paneer-bhurji-multigrain-roti", name: "Paneer Bhurji with Multigrain Roti", slot: "dinner", region: "north", wide: true, hasMeatFish: false, hasEgg: false, vegan: false, jainSafe: true,
    tags: ["high_protein", "muscle_gain_friendly"], calories: 300, protein: 18, carbs: 22, fat: 14, prep: "20 min",
    ingredients: ["200g paneer, crumbled", "1 tomato, chopped", "1/4 tsp turmeric, 1/2 tsp garam masala", "2 multigrain rotis", "Coriander leaves"],
    steps: ["Heat oil, sauté tomato until soft.", "Add turmeric and garam masala, then the crumbled paneer.", "Cook 3-4 minutes on medium heat, stirring gently.", "Garnish with coriander and serve with rotis."] },
  { slug: "moringa-sambar-ragi-mudde", name: "Moringa Sambar with Ragi Mudde", slot: "dinner", region: "south", wide: false, hasMeatFish: false, hasEgg: false, vegan: true, jainSafe: true,
    tags: ["iron_rich", "high_fiber", "low_gi"], calories: 260, protein: 9, carbs: 40, fat: 5, prep: "30 min",
    ingredients: ["1/2 cup toor dal, cooked", "2 drumsticks, cut into pieces", "1.5 tbsp sambar powder", "Tamarind pulp", "1 cup ragi mudde"],
    steps: ["Simmer drumstick pieces with tamarind pulp and sambar powder until tender.", "Mash in the cooked dal and simmer to a thick consistency.", "Temper with mustard seeds and curry leaves.", "Serve hot alongside a ragi mudde."] },
  { slug: "mushroom-palak", name: "Mushroom Palak", slot: "dinner", region: "north", wide: false, hasMeatFish: false, hasEgg: false, vegan: true, jainSafe: false,
    tags: ["vitd_rich", "iron_rich"], calories: 230, protein: 10, carbs: 18, fat: 12, prep: "25 min",
    ingredients: ["200g button mushrooms, halved", "2 cups spinach, pureed", "1/2 inch ginger, 1 green chilli", "1/4 tsp garam masala", "1 tsp oil"],
    steps: ["Sauté mushrooms in oil until they release their water and turn golden.", "Blend spinach with ginger and chilli into a smooth puree; add to the pan.", "Simmer 5 minutes, season with garam masala and salt.", "Serve hot with roti or rice."] },
  { slug: "dal-dhokli", name: "Dal Dhokli", slot: "dinner", region: "west", wide: false, hasMeatFish: false, hasEgg: false, vegan: true, jainSafe: true,
    tags: ["high_protein", "high_fiber"], calories: 300, protein: 12, carbs: 46, fat: 7, prep: "40 min",
    ingredients: ["1 cup toor dal, cooked", "1 cup whole wheat flour, kneaded into a stiff dough", "1/2 tsp turmeric, 1 tsp jaggery", "Tamarind pulp, curry leaves", "Mustard seeds and cumin for tempering"],
    steps: ["Roll the wheat dough thin and cut into small diamond-shaped dhoklis.", "Simmer the cooked dal with turmeric, jaggery, and tamarind pulp until well flavoured.", "Drop the dhoklis into the simmering dal and cook until they soften and thicken it.", "Temper mustard seeds, cumin, and curry leaves in oil and pour over before serving."] },
  { slug: "tawa-chicken", name: "Tawa Chicken", slot: "dinner", region: "north", wide: false, hasMeatFish: true, hasEgg: false, vegan: false, jainSafe: false,
    tags: ["high_protein", "low_fat", "muscle_gain_friendly"], calories: 280, protein: 32, carbs: 8, fat: 12, prep: "30 min",
    ingredients: ["300g boneless chicken, thin-sliced", "1 tsp ginger-garlic paste", "1/2 tsp turmeric, 1 tsp garam masala", "1 tsp oil", "1 onion and 1 capsicum, sliced", "Lemon wedges, to serve"],
    steps: ["Marinate the chicken slices with ginger-garlic paste, turmeric, and garam masala for 20 minutes.", "Heat a tawa or flat pan with just a teaspoon of oil.", "Cook the chicken with sliced onion and capsicum on high heat, tossing often, until charred and cooked through.", "Finish with a squeeze of lemon and serve hot."] },
  { slug: "egg-curry-rice", name: "Egg Curry with Rice", slot: "dinner", region: "north", wide: true, hasMeatFish: false, hasEgg: true, vegan: false, jainSafe: false,
    tags: ["high_protein", "vitd_rich"], calories: 320, protein: 18, carbs: 34, fat: 14, prep: "30 min",
    ingredients: ["4 eggs, boiled and halved", "1 onion, 2 tomatoes, pureed", "1 tsp ginger-garlic paste", "1/2 tsp turmeric, 1 tsp garam masala", "1 cup steamed rice"],
    steps: ["Sauté onion until golden, add ginger-garlic paste, then tomato puree, turmeric, and garam masala.", "Cook the masala until the oil separates.", "Add a little water to form a gravy, then slide in the boiled eggs and simmer 5 minutes.", "Serve hot over steamed rice."] },
  { slug: "chana-masala-rice", name: "Chana Masala with Rice", slot: "dinner", region: "north", wide: true, hasMeatFish: false, hasEgg: false, vegan: true, jainSafe: false,
    tags: ["high_protein", "high_fiber", "weight_loss_friendly"], calories: 320, protein: 13, carbs: 48, fat: 8, prep: "35 min",
    ingredients: ["1.5 cups boiled chickpeas (chana)", "1 onion, 2 tomatoes, pureed", "1 tbsp chana masala powder", "1 tsp ginger-garlic paste", "1 cup steamed rice or 2 rotis"],
    steps: ["Sauté onion until golden, add ginger-garlic paste and cook until fragrant.", "Add tomato puree and chana masala powder; cook until the oil separates.", "Add the boiled chickpeas and a little water; simmer 10-12 minutes until the gravy thickens.", "Serve hot with rice or roti."] },
  { slug: "moong-dal-palak", name: "Moong Dal Palak", slot: "dinner", region: "north", wide: true, hasMeatFish: false, hasEgg: false, vegan: true, jainSafe: false,
    tags: ["iron_rich", "high_protein", "low_gi"], calories: 240, protein: 12, carbs: 28, fat: 6, prep: "25 min",
    ingredients: ["1/2 cup moong dal, cooked soft", "1.5 cups spinach, chopped", "1/2 tsp cumin seeds", "1/4 tsp turmeric", "1 tomato, chopped", "1 tsp oil, for tempering"],
    steps: ["Cook the chopped spinach into the soft dal and simmer 5 minutes.", "Temper cumin seeds in oil, add chopped tomato, and cook until soft.", "Pour the tempering over the dal and stir well.", "Simmer 2-3 minutes and serve hot with rice or roti."] },
];

// Drinks: new, and strictly limited to what the research actually supports
// (see the agent research pass in-conversation). Each evidence_note names
// what's real vs. commonly overclaimed, so the app never states a stronger
// claim than the evidence backs.
const DRINKS = [
  { slug: "oats-beta-glucan-drink", name: "Oats & Milk Beta-Glucan Drink", slot: "drink", category: "drink", region: "any", wide: true,
    hasMeatFish: false, hasEgg: false, vegan: false, jainSafe: true,
    tags: ["low_fat"], calories: 180, protein: 7, carbs: 28, fat: 5, prep: "10 min",
    evidence_note: "A 28-trial meta-analysis links ≥3g/day oat beta-glucan to a modest LDL and total-cholesterol reduction (~0.25 mmol/L). Delivery format matters — beta-glucan in a drink has tested positive; the same amount baked into bread has not. Offered for the heart-health goal / elevated LDL, not as a general cure-all.",
    ingredients: ["1/3 cup rolled oats", "1 cup milk (or water)", "A pinch of cinnamon, optional"],
    steps: ["Soak the oats in milk or water for 10 minutes.", "Simmer gently for 5 minutes, stirring, until it thickens slightly.", "Blend briefly if you prefer it smooth, or leave it textured.", "Serve warm or chilled with a pinch of cinnamon."] },
  { slug: "post-workout-milk", name: "Post-Workout Milk", slot: "drink", category: "drink", region: "any", wide: true,
    hasMeatFish: false, hasEgg: false, vegan: false, jainSafe: true,
    tags: ["high_protein", "muscle_gain_friendly"], calories: 150, protein: 8, carbs: 12, fat: 8, prep: "2 min",
    evidence_note: "A small RCT found resistance-trained men who drank milk post-workout gained more muscle over 10 weeks than an equal-protein soy drink — but later research suggests this is mostly about total protein dose, not something unique to milk. Treat the real, well-supported lever as hitting your protein target each day; this is simply one convenient way to do that.",
    ingredients: ["1 glass (250ml) milk", "A pinch of cardamom, optional"],
    steps: ["Chill or warm the milk, whichever you prefer after a workout.", "Stir in a pinch of cardamom if you like.", "Drink within an hour or so of training."] },
];

const FOODS = [...MEALS.map((m) => ({ ...m, category: "meal", region: m.region, evidence_note: null })), ...DRINKS];

async function seed() {
  for (const food of FOODS) {
    const existing = await db.get("SELECT id FROM foods WHERE slug = ?", [food.slug]);
    let foodId;
    if (existing) {
      foodId = existing.id;
      await db.run(
        `UPDATE foods SET name=?, slot=?, category=?, region=?, wide=?, has_meat_fish=?, has_egg=?, is_vegan=?, is_jain_safe=?,
         calories=?, protein_g=?, carbs_g=?, fat_g=?, prep_time=?, evidence_note=?, updated_at=datetime('now') WHERE id=?`,
        [food.name, food.slot, food.category, food.region, food.wide ? 1 : 0, food.hasMeatFish ? 1 : 0, food.hasEgg ? 1 : 0,
         food.vegan ? 1 : 0, food.jainSafe ? 1 : 0, food.calories, food.protein, food.carbs, food.fat, food.prep,
         food.evidence_note || null, foodId]
      );
      await db.run("DELETE FROM food_tags WHERE food_id = ?", [foodId]);
      await db.run("DELETE FROM food_ingredients WHERE food_id = ?", [foodId]);
      await db.run("DELETE FROM food_steps WHERE food_id = ?", [foodId]);
    } else {
      const res = await db.run(
        `INSERT INTO foods (slug, name, slot, category, region, wide, has_meat_fish, has_egg, is_vegan, is_jain_safe,
         calories, protein_g, carbs_g, fat_g, prep_time, evidence_note)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [food.slug, food.name, food.slot, food.category, food.region, food.wide ? 1 : 0, food.hasMeatFish ? 1 : 0,
         food.hasEgg ? 1 : 0, food.vegan ? 1 : 0, food.jainSafe ? 1 : 0, food.calories, food.protein, food.carbs,
         food.fat, food.prep, food.evidence_note || null]
      );
      foodId = res.lastInsertRowid;
    }

    for (const tag of food.tags) {
      await db.run("INSERT INTO food_tags (food_id, tag) VALUES (?, ?)", [foodId, tag]);
    }
    for (let i = 0; i < food.ingredients.length; i++) {
      await db.run("INSERT INTO food_ingredients (food_id, position, ingredient) VALUES (?, ?, ?)", [foodId, i, food.ingredients[i]]);
    }
    for (let i = 0; i < food.steps.length; i++) {
      await db.run("INSERT INTO food_steps (food_id, position, step) VALUES (?, ?, ?)", [foodId, i, food.steps[i]]);
    }
  }
  console.log(`Seeded ${FOODS.length} foods (${MEALS.length} meals, ${DRINKS.length} drinks).`);
  await db.close();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

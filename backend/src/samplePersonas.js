"use strict";
// The 6 demo personas from the original no-login prototype, ported as-is
// (same ids, bios, diets, regions, goals) so the sample-profile experience
// here produces the same kind of result as the original static demo --
// just generated through the real server-side rule engine instead of a
// duplicated client-side copy of it.

const PERSONAS = [
  { id: "anjali", name: "Anjali", age: 34, gender: "female", city: "Bengaluru", diet: "vegetarian", region: "south", goal: "blood_sugar",
    bio: { hba1c: 6.1, ldl: 98, vitd: 32, tsh: 2.1, iron: 45 } },
  { id: "rohan", name: "Rohan", age: 41, gender: "male", city: "Delhi", diet: "non_vegetarian", region: "north", goal: "heart_health",
    bio: { hba1c: 5.4, ldl: 162, vitd: 34, tsh: 2.8, iron: 60 } },
  { id: "meera", name: "Meera", age: 29, gender: "female", city: "Mumbai", diet: "vegan", region: "west", goal: "wellness",
    bio: { hba1c: 5.2, ldl: 90, vitd: 14, tsh: 2.0, iron: 18 } },
  { id: "suresh", name: "Suresh", age: 52, gender: "male", city: "Kolkata", diet: "eggetarian", region: "east", goal: "weight_loss",
    bio: { hba1c: 5.6, ldl: 110, vitd: 31, tsh: 6.8, iron: 50 } },
  { id: "priya", name: "Priya", age: 26, gender: "female", city: "Ahmedabad", diet: "jain", region: "west", goal: "hormonal_balance",
    bio: { hba1c: 5.8, ldl: 105, vitd: 33, tsh: 3.0, iron: 40 } },
  { id: "karthik", name: "Karthik", age: 31, gender: "male", city: "Chennai", diet: "non_vegetarian", region: "south", goal: "muscle_gain",
    bio: { hba1c: 5.1, ldl: 85, vitd: 42, tsh: 1.8, iron: 70 } },
];

function findPersona(id) {
  return PERSONAS.find((p) => p.id === id) || null;
}

module.exports = { PERSONAS, findPersona };

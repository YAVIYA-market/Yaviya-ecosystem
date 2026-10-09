export const sellerPlans = [
  {
    id: "free",
    name: "Free",
    monthly: 0,
    annual: 0,
    limit: 5,
    commission: 10,
    description: "Pour commencer à vendre",
    features: [
      "5 produits",
      "Gestion du catalogue et des commandes",
      "Vérification de l’identité",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    monthly: 35000,
    annual: 350000,
    limit: 30,
    commission: 8,
    description: "Pour développer votre boutique",
    features: [
      "30 produits",
      "Statistiques de la boutique",
      "Promotions et coupons prévus",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    monthly: 75000,
    annual: 750000,
    limit: null,
    commission: 7,
    description: "Pour les magasins professionnels",
    features: [
      "Produits illimités",
      "Statistiques avancées",
      "Campagnes sélectionnées prévues",
    ],
  },
  {
    id: "business",
    name: "Business",
    monthly: 275000,
    annual: 2750000,
    limit: null,
    commission: 5,
    description: "Pour les commerçants professionnels et PME",
    features: [
      "Produits illimités",
      "Gestion multi-boutiques prévue",
      "Accompagnement dédié prévu",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthly: null,
    annual: null,
    limit: null,
    commission: null,
    description: "Pour les marques, importateurs et distributeurs",
    features: [
      "Offre sur mesure",
      "Tarification négociée",
      "Services et accompagnement sur accord",
    ],
  },
];
export function demoRating(product) {
  const ratings = [4.6, 4.3, 4.8, 4.2, 4.9, 4.4, 4.7, 4.1, 4.5, 3.9];
  return (
    product.demoRating ??
    ratings[
      Math.max(0, (product.originProduct || product.id) - 1) % ratings.length
    ]
  );
}

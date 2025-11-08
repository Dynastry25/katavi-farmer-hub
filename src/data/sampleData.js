// Sample data for the application
export const sampleCrops = [
  {
    id: 1,
    name: "Mahindi Bora",
    price: 1200,
    quantity: 500,
    location: "Mpanda",
    description: "Mahindi bora yaliyolimwa kwa mbolea asilia, yaliyokua vizuri na bila madawa ya wadudu.",
    image: "🌽",
    farmer: "Juma Mwinyi",
    category: "cereals",
    date: "2023-10-20",
    rating: 4.8
  },
  {
    id: 2,
    name: "Mpunga Super",
    price: 1500,
    quantity: 300,
    location: "Mlele",
    description: "Mpunga wa aina ya Super, wakulima wengi hupenda. Tayari kwa usindikaji na matumizi.",
    image: "🍚",
    farmer: "Asha Rajabu",
    category: "cereals",
    date: "2023-10-19",
    rating: 4.9
  },
  {
    id: 3,
    name: "Alizeti Fresh",
    price: 2800,
    quantity: 200,
    location: "Nsimbo",
    description: "Alizeti bora yenye mafuta mengi, inayofaa kwa kutengenezea mafuta ya kupikia.",
    image: "🌻",
    farmer: "Mohamed Kipanga",
    category: "oilseeds",
    date: "2023-10-18",
    rating: 4.7
  },
  {
    id: 4,
    name: "Maharage Kunde",
    price: 2500,
    quantity: 150,
    location: "Mpanda",
    description: "Maharage ya aina ya kunde, tamu na yenye virutubisho vingi vya mwili.",
    image: "🫘",
    farmer: "Anna Mrosso",
    category: "legumes",
    date: "2023-10-17",
    rating: 4.6
  },
  {
    id: 5,
    name: "Viazi Mviringo",
    price: 800,
    quantity: 1000,
    location: "Mlele",
    description: "Viazi vitamu vilivyokua vizuri, vinavyofaa kwa kupikia na kukaanga.",
    image: "🥔",
    farmer: "Rajab Simba",
    category: "tubers",
    date: "2023-10-16",
    rating: 4.5
  },
  {
    id: 6,
    name: "Mahindi ya Kuchoma",
    price: 500,
    quantity: 800,
    location: "Nsimbo",
    description: "Mahindi madogo ya kuchoma, yaliyokomaa na yanayotoka kwenye shamba jipya.",
    image: "🔥",
    farmer: "Grace Michael",
    category: "cereals",
    date: "2023-10-15",
    rating: 4.8
  }
];

export const newsArticles = [
  {
    id: 1,
    title: 'Mbinu Mpya za Kilimo cha Mahindi',
    date: 'Oktoba 20, 2023',
    content: 'Jifunze mbinu za kisasa za kilimo cha mahindi ili kuboresha mazao yako na kupunguza gharama za uzalishaji.',
    image: '🌽',
    category: 'Kilimo',
    readTime: '5 min'
  },
  {
    id: 2,
    title: 'Kukabiliana na Mdudu wa Mimea',
    date: 'Oktoba 18, 2023',
    content: 'Njia bora za kudhibiti na kuzuia madhara ya wadudu kwenye mimea yako bila kuhitaji dawa ghali.',
    image: '🐛',
    category: 'Udhibiti wa Wadudu',
    readTime: '4 min'
  },
  {
    id: 3,
    title: 'Mafunzo ya Ufundi wa Kilimo',
    date: 'Oktoba 15, 2023',
    content: 'Serikali ya Mkoa inapanga mafunzo ya kilimo kwa vijana na wanawake katika wilaya zote za Katavi.',
    image: '👨‍🌾',
    category: 'Mafunzo',
    readTime: '3 min'
  }
];

export const weatherData = {
  Mpanda: {
    temperature: 25,
    condition: 'Mawingu',
    humidity: 65,
    rainfall: '2.5 mm',
    wind: '12 km/h'
  },
  Mlele: {
    temperature: 27,
    condition: 'Jua',
    humidity: 58,
    rainfall: '0 mm',
    wind: '10 km/h'
  },
  Nsimbo: {
    temperature: 26,
    condition: 'Mvua Nyeupe',
    humidity: 72,
    rainfall: '5.0 mm',
    wind: '8 km/h'
  }
};

export const priceData = [
  { crop: 'Mahindi (kg)', price: 'TZS 1,200', trend: 'up' },
  { crop: 'Mpunga (kg)', price: 'TZS 1,500', trend: 'stable' },
  { crop: 'Alizeti (kg)', price: 'TZS 2,800', trend: 'down' },
  { crop: 'Maharage (kg)', price: 'TZS 2,500', trend: 'up' },
  { crop: 'Viazi (kg)', price: 'TZS 800', trend: 'stable' }
];
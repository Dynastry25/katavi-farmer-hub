const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Crop = require('./models/Crop');
const NewsArticle = require('./models/NewsArticle');
const Supplier = require('./models/Supplier');
const Loan = require('./models/Loan');
const LoanApplication = require('./models/LoanApplication');
const Order = require('./models/Order');
const FarmerGroup = require('./models/FarmerGroup');
const AdviceArticle = require('./models/AdviceArticle');
const Video = require('./models/Video');
const Expert = require('./models/Expert');
const Announcement = require('./models/Announcement');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');
const MarketPrice = require('./models/MarketPrice');
const Notification = require('./models/Notification');
const Rating = require('./models/Rating');
const WeatherConfig = require('./models/WeatherConfig');
const WeatherZone = require('./models/WeatherZone');
const PlatformSetting = require('./models/PlatformSetting');
const LandGuidance = require('./models/LandGuidance');
const CropCycle = require('./models/CropCycle');
const CropDisease = require('./models/CropDisease');

dotenv.config();

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB imeunganishwa kwa ajili ya seed...');

    // Clear existing data
    await User.deleteMany({});
    await Crop.deleteMany({});
    await NewsArticle.deleteMany({});
    await Supplier.deleteMany({});
    await Loan.deleteMany({});
    await LoanApplication.deleteMany({});
    await Order.deleteMany({});
    await FarmerGroup.deleteMany({});
    await AdviceArticle.deleteMany({});
    await Video.deleteMany({});
    await Expert.deleteMany({});
    await Announcement.deleteMany({});
    await Conversation.deleteMany({});
    await Message.deleteMany({});
    await MarketPrice.deleteMany({});
    await Notification.deleteMany({});
    await Rating.deleteMany({});
    await WeatherConfig.deleteMany({});
    await WeatherZone.deleteMany({});
    await PlatformSetting.deleteMany({});
    await LandGuidance.deleteMany({});
    await CropCycle.deleteMany({});
    await CropDisease.deleteMany({});

    // Create users
    const users = await User.create([
      {
        name: 'Juma Mwinyi',
        email: 'juma@example.com',
        phone: '+255 789 123 456',
        password: 'password123',
        role: 'farmer',
        location: 'Mpanda',
        district: 'Mpanda',
        ward: 'Mpanda Mjini',
        village: 'Kijiji cha Msingi',
        farmSize: 'Ekari 5',
        farmLocation: 'Mpanda',
        crops: ['Mahindi', 'Mpunga'],
        rating: 4.8,
      },
      {
        name: 'Asha Hassan',
        email: 'asha@example.com',
        phone: '+255 789 654 321',
        password: 'password123',
        role: 'buyer',
        location: 'Mlele',
        district: 'Mlele',
        ward: 'Mlele Mjini',
        village: 'Kijiji cha Pili',
        businessType: 'Duka la Rejareja',
        businessLocation: 'Mlele',
        rating: 4.9,
      },
      {
        name: 'Dr. Mohamed Ali',
        email: 'mohamed@example.com',
        phone: '+255 789 987 654',
        password: 'password123',
        role: 'expert',
        location: 'Nsimbo',
        district: 'Nsimbo',
        ward: 'Sitalike',
        village: 'Kijiji cha Tatu',
        expertise: 'Utaalamu wa Udongo',
        experience: '10',
        rating: 4.7,
      },
      {
        name: 'Admin Katavi',
        email: 'admin@katavi.co.tz',
        phone: '+255 789 111 222',
        password: 'Admin@1234',
        role: 'admin',
        location: 'Mpanda',
        district: 'Mpanda',
        ward: 'Mpanda Mjini',
      },
    ]);

    console.log(`Watumiaji ${users.length} wameundwa`);

    // Create crops
    const crops = await Crop.create([
      {
        name: 'Mahindi',
        category: 'cereals',
        price: 1200,
        quantity: '500',
        unit: 'kg',
        location: 'Mpanda',
        farmer: users[0]._id,
        farmerName: 'Juma Mwinyi',
        description: 'Mahindi mweupe wa hali ya juu, mazao mazuri na nafaka nzuri.',
        fallback: '🌽',
        rating: 4.5,
        reviews: 24,
      },
      {
        name: 'Mchele',
        category: 'cereals',
        price: 2500,
        quantity: '300',
        unit: 'kg',
        location: 'Mlele',
        farmer: users[0]._id,
        farmerName: 'Juma Mwinyi',
        description: 'Mchele mzuri wa aina ya Super, mwenye ubora wa hali ya juu.',
        fallback: '🍚',
        rating: 4.8,
        reviews: 31,
      },
      {
        name: 'Maharage',
        category: 'legumes',
        price: 3000,
        quantity: '200',
        unit: 'kg',
        location: 'Nsimbo',
        farmer: users[0]._id,
        farmerName: 'Juma Mwinyi',
        description: 'Maharage mekundu ya aina ya Yawe, yenye virutubisho vingi.',
        fallback: '🫘',
        rating: 4.3,
        reviews: 18,
      },
      {
        name: 'Viazi',
        category: 'tubers',
        price: 800,
        quantity: '600',
        unit: 'kg',
        location: 'Mpanda',
        farmer: users[0]._id,
        farmerName: 'Juma Mwinyi',
        description: 'Viazi vitamu vya aina mbalimbali, fresh kutoka shambani.',
        fallback: '🥔',
        rating: 4.6,
        reviews: 42,
      },
      {
        name: 'Alizeti',
        category: 'oilseeds',
        price: 1800,
        quantity: '150',
        unit: 'kg',
        location: 'Mpanda',
        farmer: users[0]._id,
        farmerName: 'Juma Mwinyi',
        description: 'Mbegu za alizeti za hali ya juu kwa utengenezaji wa mafuta.',
        fallback: '🌻',
        rating: 4.2,
        reviews: 16,
      },
      {
        name: 'Machungwa',
        category: 'fruits',
        price: 500,
        quantity: '400',
        unit: 'kg',
        location: 'Mlele',
        farmer: users[0]._id,
        farmerName: 'Juma Mwinyi',
        description: 'Michungwa mizuri yenye vitamini C nyingi, tamu na fresh.',
        fallback: '🍊',
        rating: 4.7,
        reviews: 29,
      },
    ]);

    console.log(`Mazao ${crops.length} yameundwa`);

    // Create news articles
    await NewsArticle.create([
      {
        title: 'Mbinu Mpya za Kilimo cha Mahindi Katika Mkoa wa Katavi',
        excerpt: 'Wataalamu wa kilimo wamegundua mbinu bora za kupanda na kuvuna mahindi kwa mazao bora na mengi zaidi.',
        category: 'farming',
        author: 'Dk. Anna Mrosso',
        date: 'Novemba 15, 2024',
        readTime: '5 min',
        featured: true,
      },
      {
        title: 'Bei za Mpunga Zinapanda Kwenye Soko la Kimataifa',
        excerpt: 'Upatikanaji mdogo wa mpunga umepelekea kupanda kwa bei hadi asilimia 15 katika soko la kimataifa.',
        category: 'market',
        author: 'Bw. Juma Hassan',
        date: 'Novemba 14, 2024',
        readTime: '4 min',
      },
      {
        title: 'Msimu wa Mvua Unatarajiwa Kuanza Mapema Mwaka Huu',
        excerpt: 'Taasisi ya hali ya hewa imetangaza kuanza kwa mapema kwa msimu wa mvua katika Mkoa wa Katavi.',
        category: 'weather',
        author: 'Mtaalamu wa Hali ya Hewa',
        date: 'Novemba 13, 2024',
        readTime: '3 min',
        featured: true,
      },
      {
        title: 'Teknolojia ya Umwagiliaji wa Umande Inaleta Mageuzi Katika Kilimo',
        excerpt: 'Wakulima wanaotumia mifumo ya kisasa ya umwagiliaji wanaongeza mazao kwa asilimia 40.',
        category: 'technology',
        author: 'Bi. Sarah William',
        date: 'Novemba 12, 2024',
        readTime: '6 min',
      },
      {
        title: 'Semina ya Kilimo Endelevu Iandaliwa Mpanda',
        excerpt: 'Watendaji wa kilimo wakutana kujadili mbinu za kilimo endelevu na jinsi ya kukabiliana na mabadiliko ya tabianchi.',
        category: 'events',
        author: 'Mwandishi Wetu',
        date: 'Novemba 11, 2024',
        readTime: '4 min',
      },
    ]);

    console.log('Habari zimeundwa');

    // Create suppliers
    await Supplier.create([
      {
        name: 'Agro Supplies Ltd',
        category: 'fertilizers',
        location: 'Mpanda Mjini',
        rating: 4.7,
        products: ['CAN', 'UREA', 'NPK'],
        contact: '+255 789 123 456',
        email: 'info@agrosupplies.co.tz',
        description: 'Wauzaji wakuu wa mbolea za kisasa kwa wakulima',
        delivery: true,
        verified: true,
      },
      {
        name: 'SeedCo Tanzania',
        category: 'seeds',
        location: 'Mlele',
        rating: 4.8,
        products: ['Mahindi DK90', 'Mpunga SARO', 'Maharage'],
        contact: '+255 789 654 321',
        email: 'sales@seedco.tz',
        description: 'Mbegu bora za kilimo zenye uhakika wa mazao',
        delivery: true,
        verified: true,
      },
      {
        name: 'Farm Tools Tanzania',
        category: 'tools',
        location: 'Nsimbo',
        rating: 4.6,
        products: ['Jembe', 'Panga', 'Teko'],
        contact: '+255 789 321 654',
        email: 'tools@farmtools.tz',
        description: 'Vifaa vyote vya kilimo kwa bei nafuu',
        delivery: true,
        verified: true,
      },
    ]);

    console.log('Wauzaji wameundwa');

    // Create loans
    const loans = await Loan.create([
      {
        name: 'Mkopo wa Kilimo',
        provider: 'NMB Bank',
        amount: 'Hadi TZS 50,000,000',
        interest: '12% kwa mwaka',
        duration: 'Hadi miezi 36',
        requirements: ['Kitambulisho cha taifa', 'Hati miliki ya ardhi', 'Mpango wa kilimo'],
        description: 'Mkopo maalum kwa wakulima wa mazao na mifugo',
        category: 'agriculture',
      },
      {
        name: 'Mkopo wa Biashara',
        provider: 'CRDB Bank',
        amount: 'Hadi TZS 100,000,000',
        interest: '15% kwa mwaka',
        duration: 'Hadi miezi 48',
        requirements: ['Leseni ya biashara', 'Taarifa za benki za miezi 6', 'Dhamana'],
        description: 'Mkopo kwa wafanyabiashara wa mazao na pembejeo',
        category: 'business',
      },
      {
        name: 'Mkopo wa Vifaa',
        provider: 'Akiba Commercial Bank',
        amount: 'Hadi TZS 20,000,000',
        interest: '10% kwa mwaka',
        duration: 'Hadi miezi 24',
        requirements: ['Kitambulisho', 'Makubaliano ya ununuzi', 'Kiasi kidogo cha awali'],
        description: 'Mkopo maalum wa kununua vifaa vya kilimo',
        category: 'equipment',
      },
    ]);

    console.log('Mikopo imeundwa');

    // Create loan applications
    await LoanApplication.create([
      {
        user: users[0]._id,
        loan: loans[0]._id,
        loanName: loans[0].name,
        amount: 'TZS 2,000,000',
        status: 'approved',
        repaymentStatus: 'partial',
        remaining: 'TZS 800,000',
        nextPayment: '2026-10-01',
        repayments: [
          { amount: 'TZS 600,000', date: '2026-06-05', method: 'Tigo Pesa', note: 'Malipo ya kwanza' },
          { amount: 'TZS 600,000', date: '2026-08-01', method: 'M-Pesa', note: 'Malipo ya pili' },
        ],
      },
      {
        user: users[0]._id,
        loan: loans[1]._id,
        loanName: loans[1].name,
        amount: 'TZS 5,000,000',
        status: 'pending',
        repaymentStatus: 'none',
        remaining: '',
        nextPayment: '',
        repayments: [],
      },
      {
        user: users[0]._id,
        loan: loans[2]._id,
        loanName: loans[2].name,
        amount: 'TZS 1,200,000',
        status: 'approved',
        repaymentStatus: 'paid',
        remaining: 'TZS 0',
        nextPayment: '',
        repayments: [
          { amount: 'TZS 400,000', date: '2026-03-10', method: 'Bank', note: 'Malipo ya kwanza' },
          { amount: 'TZS 400,000', date: '2026-04-10', method: 'M-Pesa', note: 'Malipo ya pili' },
          { amount: 'TZS 400,000', date: '2026-05-10', method: 'M-Pesa', note: 'Malipo ya mwisho' },
        ],
      },
    ]);

    console.log('Maombi ya mikopo yameundwa');

    // Create orders (including disputes)
    await Order.create([
      {
        crop: crops[0]._id,
        cropName: 'Mahindi',
        buyer: users[1]._id,
        buyerName: 'Asha Hassan',
        farmer: users[0]._id,
        farmerName: 'Juma Mwinyi',
        quantity: '500',
        price: '1200',
        status: 'disputed',
        resolution: '',
      },
      {
        crop: crops[1]._id,
        cropName: 'Mchele',
        buyer: users[1]._id,
        buyerName: 'Asha Hassan',
        farmer: users[0]._id,
        farmerName: 'Juma Mwinyi',
        quantity: '300',
        price: '2500',
        status: 'cancelled',
        resolution: 'Mnunuzi alikatisha agizo baada ya mgogoro wa uwasilishaji',
      },
    ]);

    console.log('Agizo/migogoro yameundwa');

    // Create farmer groups
    await FarmerGroup.create([
      {
        name: 'Wakulima wa Mpanda',
        description: 'Kikundi cha wakulima wa eneo la Mpanda kinacholima mazao mbalimbali',
        location: 'Mpanda',
        cropType: 'Mimea Mbalimbali',
        members: [users[0]._id],
        maxMembers: 50,
        createdBy: users[0]._id,
        creatorName: 'Juma Mwinyi',
      },
      {
        name: 'Wakulima wa Mahindi Mlele',
        description: 'Kikundi maalum cha wakulima wa mahindi katika eneo la Mlele',
        location: 'Mlele',
        cropType: 'Mahindi',
        members: [users[1]._id],
        maxMembers: 30,
        createdBy: users[1]._id,
        creatorName: 'Asha Hassan',
      },
    ]);

    console.log('Vikundi vimeundwa');

    // Create advice articles
    await AdviceArticle.create([
      {
        title: 'Mbinu Bora za Kupanda Mahindi',
        excerpt: 'Jifunze mbinu za kisasa za kupanda na kuvuna mahindi kwa mazao bora na mengi.',
        category: 'Kilimo cha Nafaka',
        readTime: '5 min',
        date: 'Okt 20, 2023',
      },
      {
        title: 'Kudhibiti Wadudu bila Kemikali',
        excerpt: 'Njia za asili na salama za kudhibiti wadudu kwenye mimea yako.',
        category: 'Udhibiti wa Wadudu',
        readTime: '4 min',
        date: 'Okt 18, 2023',
      },
      {
        title: 'Kilimo cha Umwagiliaji wa Umande',
        excerpt: 'Jinsi ya kutumia mfumo wa umwagiliaji wa umande kuokoa maji na kuongeza mazao.',
        category: 'Umwagiliaji',
        readTime: '6 min',
        date: 'Okt 15, 2023',
      },
      {
        title: 'Uhifadhi wa Mazao baada ya Mavuno',
        excerpt: 'Mbinu bora za kuhifadhi mazao yako kwa muda mrefu bila kupoteza ubora.',
        category: 'Uhifadhi wa Mazao',
        readTime: '4 min',
        date: 'Okt 12, 2023',
      },
    ]);

    console.log('Makala za ushauri zimeundwa');

    // Create videos
    await Video.create([
      {
        title: 'Kutengeneza Mbolea Asilia',
        duration: '5:30',
        views: '1.2K',
        category: 'Mbolea',
      },
      {
        title: 'Upandaji wa Mbegu za Mpunga',
        duration: '7:15',
        views: '2.1K',
        category: 'Upandaji',
      },
      {
        title: 'Matumizi ya Dawa za Wadudu',
        duration: '6:45',
        views: '1.8K',
        category: 'Udhibiti wa Wadudu',
      },
      {
        title: 'Mfumo wa Umwagiliaji wa Kisasa',
        duration: '8:20',
        views: '3.2K',
        category: 'Umwagiliaji',
      },
    ]);

    console.log('Video zimeundwa');

    // Create experts
    await Expert.create([
      {
        user: users[2]._id,
        name: 'Dk. Anna Mrosso',
        specialization: 'Utaalamu wa Mbolea na Udongo',
        experience: 'Miaka 15',
        available: true,
      },
      {
        name: 'Bw. Juma Hassan',
        specialization: 'Uvunaji na Uhifadhi wa Mazao',
        experience: 'Miaka 12',
        available: true,
      },
      {
        name: 'Dk. Robert Kipanga',
        specialization: 'Dawa za Wadudu na Magonjwa',
        experience: 'Miaka 18',
        available: false,
      },
    ]);

    console.log('Wataalamu wameundwa');

    // Create announcements
    await Announcement.create([
      { title: 'Mafunzo ya Kilimo cha Kisasa', date: 'Nov 25, 2024', location: 'Mpanda', type: 'training' },
      { title: 'Msururu wa Mvua Unatarajiwa', date: 'Nov 30, 2024', location: 'Mkoa Mzima', type: 'weather' },
      { title: 'Msaada wa Mbolea Rasimu Mpya', date: 'Dec 5, 2024', location: 'Ofisi za Wilaya', type: 'support' },
      { title: 'Sherehe ya Wakulima Wa Tanzania', date: 'Dec 8, 2024', location: 'Mpanda Mjini', type: 'event' },
    ]);

    console.log('Matangazo yameundwa');

    // Create sample conversations
    const conversations = await Conversation.create([
      {
        participants: [users[0]._id, users[1]._id],
        participantNames: ['Juma Mwinyi', 'Asha Hassan'],
        type: 'farmer',
        name: 'Juma Mwinyi',
        lastMessage: 'Nina mahindi ya bei nafuu',
        lastTime: '10:30 AM',
        unread: 2,
        online: true,
        avatar: '👨‍🌾',
      },
    ]);

    // Create sample messages for first conversation
    await Message.create([
      { conversation: conversations[0]._id, sender: users[1]._id, senderName: 'Asha Hassan', text: 'Habari, nina nia ya kununua mahindi yako', time: '10:25 AM', read: true },
      { conversation: conversations[0]._id, sender: users[0]._id, senderName: 'Juma Mwinyi', text: 'Habari! Nina mahindi mazuri ya kilo 500', time: '10:26 AM', read: true },
      { conversation: conversations[0]._id, sender: users[1]._id, senderName: 'Asha Hassan', text: 'Bei yake ni ngapi kwa kilo?', time: '10:27 AM', read: true },
      { conversation: conversations[0]._id, sender: users[0]._id, senderName: 'Juma Mwinyi', text: 'TZS 1,500 kwa kilo. Nipo Mpanda', time: '10:28 AM', read: true },
      { conversation: conversations[0]._id, sender: users[1]._id, senderName: 'Asha Hassan', text: 'Naweza kupata picha ya mahindi?', time: '10:30 AM', read: false },
    ]);

    console.log('Mazungumzo yameundwa');

    // Create market prices
    await MarketPrice.create([
      { cropName: 'Mahindi', category: 'cereals', region: 'Katavi', district: 'Mpanda', pricePerUnit: 1200, unit: 'kg', dateRecorded: new Date(), recordedBy: users[3]._id },
      { cropName: 'Mpunga', category: 'cereals', region: 'Katavi', district: 'Mpanda', pricePerUnit: 2500, unit: 'kg', dateRecorded: new Date(), recordedBy: users[3]._id },
      { cropName: 'Maharage', category: 'legumes', region: 'Katavi', district: 'Mlele', pricePerUnit: 3000, unit: 'kg', dateRecorded: new Date(), recordedBy: users[3]._id },
      { cropName: 'Viazi', category: 'tubers', region: 'Katavi', district: 'Mpanda', pricePerUnit: 800, unit: 'kg', dateRecorded: new Date(), recordedBy: users[3]._id },
      { cropName: 'Alizeti', category: 'oilseeds', region: 'Katavi', district: 'Mlele', pricePerUnit: 1800, unit: 'kg', dateRecorded: new Date(), recordedBy: users[3]._id },
    ]);

    console.log('Bei za soko zimeundwa');

    // Create notifications
    await Notification.create([
      { user: users[3]._id, title: 'Karibu Katavi E-Kilimo', message: 'Karibu kwenye jukwaa letu la wakulima. Kuanza sasa!', type: 'system', read: false },
      { user: users[0]._id, title: 'Bei za Mahindi Zimepanda', message: 'Bei za mahindi zimepanda hadi TZS 1,500 kwa kilo kwenye soko la Mpanda.', type: 'price', read: false },
    ]);

    console.log('Arifa zimeundwa');

    // Create ratings
    await Rating.create([
      { rater: users[1]._id, raterName: 'Asha Hassan', ratedUser: users[0]._id, rating: 5, comment: 'Mkulima mwaminifu, mazao mazuri!' },
      { rater: users[0]._id, raterName: 'Juma Mwinyi', ratedUser: users[1]._id, rating: 4, comment: 'Mnunuzi mwema na wa haraka.' },
    ]);

    console.log('Ukadiriaji umeundwa');

    // Create weather config + zones
    await WeatherConfig.create({ key: 'config', source: 'open-meteo', baseUrl: '', apiKey: '', cacheMinutes: 60, updatedBy: users[3]._id });

    await WeatherZone.create([
      { name: 'Mpanda', district: 'Mpanda', ward: 'Mpanda Mjini', lat: -6.346, lon: 31.072, active: true, alertEnabled: true, alertRainMm: 30, alertTempC: 35, createdBy: users[3]._id },
      { name: 'Mlele', district: 'Mlele', ward: 'Mlele Mjini', lat: -6.9, lon: 31.6, active: true, alertEnabled: true, alertRainMm: 30, alertTempC: 35, createdBy: users[3]._id },
      { name: 'Nsimbo', district: 'Nsimbo', ward: 'Sitalike', lat: -6.5, lon: 31.1, active: true, alertEnabled: true, alertRainMm: 40, alertTempC: 33, createdBy: users[3]._id },
      { name: 'Karema', district: 'Mpanda', ward: 'Karema', lat: -6.817, lon: 30.44, active: true, alertEnabled: true, alertRainMm: 25, alertTempC: 32, createdBy: users[3]._id },
    ]);

    console.log('Mipangilio na maeneo ya hali ya hewa yameundwa');

    // Create platform settings
    await PlatformSetting.create({
      key: 'platform',
      commissionRate: 5,
      featuredListingsEnabled: true,
      bannerMessage: 'Karibu Katavi E-Kilimo! Nunua na uuze mazao kwa bei bora na upate bei za soko za wakati halisi.',
      bannerActive: true,
      updatedBy: users[3]._id,
    });

    console.log('Mipangilio ya mfumo yameundwa');

    // Shamba Assistant: land/soil suitability for Katavi wards
    await LandGuidance.create([
      { district: 'Mpanda', ward: 'Mpanda Mjini', soilType: 'Sandy Loam', suitableCrops: ['Mahindi', 'Maharage', 'Kunde'], notes: 'Ufikikaji mzuri wa maji; ninchi inayofaa mazao ya msimu.' },
      { district: 'Mpanda', ward: 'Kasokola', soilType: 'Clay Loam', suitableCrops: ['Mpunga', 'Mahindi'], notes: 'Ina uwezo mkubwa wa kuhifadhi maji; inafaa kwa mpunga.' },
      { district: 'Mpanda', ward: 'Senga', soilType: 'Loamy Sand', suitableCrops: ['Mahindi', 'Alizeti', 'Maharage'], notes: 'Udongo wa wastani, ufikikaji mzuri wa hewa.' },
      { district: 'Mlele', ward: 'Mlele', soilType: 'Clay', suitableCrops: ['Mpunga', 'Mahindi', 'Muhogo'], notes: 'Udongo mzito unaohifadhi maji; fanya kazi ya umwagiliaji.' },
      { district: 'Mlele', ward: 'Sumbawanga', soilType: 'Red Loam', suitableCrops: ['Mahindi', 'Maharage', 'Kunde', 'Kitunguu'], notes: 'Udongo mzuri kwa mboga na mazao ya mmea.' },
      { district: 'Tanganyika', ward: 'Katae', soilType: 'Sandy', suitableCrops: ['Mahindi', 'Mtama', 'Alizeti'], notes: 'Udongo mwepesi, inahitaji umwagiliaji wa ziada.' },
      { district: 'Tanganyika', ward: 'Nsimbo', soilType: 'Silty Loam', suitableCrops: ['Mahindi', 'Maharage', 'Mihogo', 'Kunde'], notes: 'Udongo wenye virutubisho vingi kwa mazao mbalimbali.' },
      { district: 'Mpanda', ward: 'Usevya', soilType: 'Sandy Loam', suitableCrops: ['Mahindi', 'Alizeti', 'Maharage'], notes: 'Udongo wa ufikikaji mzuri, fanya mzunguko wa mazao.' },
    ]);
    console.log('Data ya LandGuidance imeundwa');

    // Shamba Assistant: crop cycle trackers for common Katavi crops
    await CropCycle.create([
      { cropName: 'Mahindi', stages: [
        { key: 'prep', label: 'Utayarishaji wa shamba', icon: 'fas fa-shovel', dayStart: 0, dayEnd: 14, tips: 'Ondoa magugu, piga shamba kwa kina cm 15-20, chandarua udongo.', alert: '' },
        { key: 'planting', label: 'Upandaji', icon: 'fas fa-seedling', dayStart: 15, dayEnd: 21, tips: 'Panda mbegu kwa kina cm 5-7, umbali wa mstari cm 75-90.', alert: '' },
        { key: 'weeding', label: 'Palizi & Kumwagilia', icon: 'fas fa-hand-holding-droplet', dayStart: 22, dayEnd: 49, tips: 'Fanya palizi ya kwanza siku 21 baada ya kupanda, pili siku 42.', alert: 'Angalia ukame kati ya wiki 3-6; ni hatari kubwa.' },
        { key: 'disease_watch', label: 'Ufuatiliaji wa magonjwa', icon: 'fas fa-bug', dayStart: 50, dayEnd: 89, tips: 'Angalia dalili za magonjwa kama shina la kuvunjika na kunyauka. Tumia dawa endapo inahitajika.', alert: 'Tumia AI Crop Detection ikiwa unaona dalili za kushangaza.' },
        { key: 'harvest', label: 'Uvunaji', icon: 'fas fa-tractor', dayStart: 90, dayEnd: 115, tips: 'Vuna pale majani yanapokuwa manjano na mizeeri ngumu. Kausha vizuri kabla ya kuhifadhi.', alert: '' },
        { key: 'post_harvest', label: 'Uhifadhi', icon: 'fas fa-warehouse', dayStart: 116, dayEnd: 145, tips: 'Weka kwenye migu/chumba kavu. Dhibiti wadudu wa kuhifadhi.', alert: '' },
        { key: 'marketing', label: 'Uuzaji', icon: 'fas fa-store', dayStart: 146, dayEnd: 200, tips: 'Angalia bei ya soko; fikiria kuuza pale bei inapofika juu.', alert: '' },
      ]},
      { cropName: 'Mpunga', stages: [
        { key: 'prep', label: 'Kutayarisha shamba la mpunga', icon: 'fas fa-shovel', dayStart: 0, dayEnd: 21, tips: 'Tayarisha udongo ulio na maji ya kutosha; panga mifereji.', alert: '' },
        { key: 'planting', label: 'Kupanda', icon: 'fas fa-seedling', dayStart: 22, dayEnd: 30, tips: 'Tumia miche iliyokomaa; pandisha kwa kina kidogo.', alert: '' },
        { key: 'vegetative', label: 'Ukuaji wa Majani', icon: 'fas fa-leaf', dayStart: 31, dayEnd: 60, tips: 'Hakikisha kuna maji ya kutosha; ongeza mbolea kidogo.', alert: '' },
        { key: 'flowering', label: 'Kuchanua', icon: 'fas fa-utensils', dayStart: 61, dayEnd: 75, tips: 'Epuka kuongeza mbolea ya nitrojeni; dhibiti wadudu.', alert: 'Angalia uhaba wa maji; unaweza kuhatarisha mavuno.' },
        { key: 'grain_fill', label: 'Kujaa Kwa Mchele', icon: 'fas fa-seedling', dayStart: 76, dayEnd: 90, tips: 'Endelea na maji ya kutosha; ukame wa siku chache unaweza kuua.', alert: '' },
        { key: 'harvest', label: 'Kuvuna', icon: 'fas fa-tractor', dayStart: 91, dayEnd: 120, tips: 'Vuna pale 80% ya mchele umekauka. Kausha kabla ya kusaga.', alert: '' },
      ]},
      { cropName: 'Maharage', stages: [
        { key: 'prep', label: 'Utayarishaji', icon: 'fas fa-shovel', dayStart: 0, dayEnd: 10, tips: 'Piga shamba vizuri; ongeza mbolea ya asili.', alert: '' },
        { key: 'planting', label: 'Upandaji', icon: 'fas fa-seedling', dayStart: 11, dayEnd: 17, tips: 'Panda mbegu kwa kina cm 3-5; umbali wa mstari cm 45-60.', alert: '' },
        { key: 'weeding', label: 'Palizi', icon: 'fas fa-hand-holding-droplet', dayStart: 18, dayEnd: 38, tips: 'Fanya palizi kabla ya magugu kushika; mara 2 ni ya kutosha.', alert: '' },
        { key: 'flowering', label: 'Kuchanua', icon: 'fas fa-utensils', dayStart: 39, dayEnd: 55, tips: 'Ongeza mbolea kidogo; epuka dawa wakati wa kuchanua.', alert: '' },
        { key: 'harvest', label: 'Uvunaji', icon: 'fas fa-tractor', dayStart: 56, dayEnd: 90, tips: 'Vuna pale majani yanapokuwa manjano na zuli zinapoanza kukauka.', alert: '' },
      ]},
    ]);
    console.log('Data ya CropCycle imeundwa');

    // Shamba Assistant: disease library
    await CropDisease.create([
      { cropName: 'Mahindi', name: 'Northern Leaf Blight', symptoms: 'Mashaka ya mstatili kwenye majani, rangi ya kahawia', prevention: 'Tumia mbegu zilizostahimili; mzunguko wa mazao.', treatment: 'Ondoa majani yaliyoathirika; tumia dawa ya kuvu iliyoidhinishwa.' },
      { cropName: 'Mahindi', name: 'Gray Leaf Spot', symptoms: 'Mashaka ya mviringo kwenye majani, mwisho wa majani kukauka', prevention: 'Epuka kupanda mahindi kwenye udongo wenye maji mengi jioni.', treatment: 'Tumia dawa ya kuvu; fanya mzunguko wa mazao.' },
      { cropName: 'Mahindi', name: 'Maize Streak Virus', symptoms: 'Mistari ya manjano kwenye majani, ukuaji hafifishwa', prevention: 'Tumia mbegu zilizostahimili; dhibiti virobalti.', treatment: 'Hakuna tiba; ondoa mimea iliyoambukizwa.' },
      { cropName: 'Mpunga', name: 'Rice Blast', symptoms: 'Mashaka ya kahawia yenye kitambaa cheupe kwenye majani na shina', prevention: 'Dhibiti uwiano wa maji; punguza mbolea ya nitrojeni.', treatment: 'Tumia dawa ya kuvu; chagua aina zinazostahimili.' },
      { cropName: 'Mpunga', name: 'Brown Spot', symptoms: 'Mashaka madogo ya kahawia kwenye majani', prevention: 'Hakikisha mbolea ya kutosha; epuka ukame.', treatment: 'Ondoa majani yaliyoathirika; tumia dawa.' },
      { cropName: 'Maharage', name: 'Bean Rust', symptoms: 'Vito vya kahawia kwenye majani, kuanguka kwa majani', prevention: 'Tumia aina zinazostahimili; panga mzunguko wa mazao.', treatment: 'Tumia dawa ya kuvu; ondoa mimea iliyoathirika sana.' },
      { cropName: 'Maharage', name: 'Angular Leaf Spot', symptoms: 'Mashaka ya pembe yenye kuta nzito kwenye majani', prevention: 'Tumia mbegu safi; epuka kunyunyizia jioni.', treatment: 'Ondoa majani yaliyoathirika; tumia dawa.' },
    ]);
    console.log('Data ya CropDisease imeundwa');

    console.log('\n✅ Seed imekamilika! Database imejazwa na data ya mfano.');
    console.log('\nAkaunti za majaribio:');
    console.log('  Farmer: juma@example.com / password123');
    console.log('  Buyer:  asha@example.com / password123');
    console.log('  Expert: mohamed@example.com / password123');
    console.log('  Admin:  admin@katavi.co.tz / Admin@1234');
    
    process.exit(0);
  } catch (error) {
    console.error('Hitilafu wakati wa seed:', error);
    process.exit(1);
  }
};

seedDB();

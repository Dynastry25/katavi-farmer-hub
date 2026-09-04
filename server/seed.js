const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Crop = require('./models/Crop');
const NewsArticle = require('./models/NewsArticle');
const Supplier = require('./models/Supplier');
const Loan = require('./models/Loan');
const FarmerGroup = require('./models/FarmerGroup');
const AdviceArticle = require('./models/AdviceArticle');
const Video = require('./models/Video');
const Expert = require('./models/Expert');
const Announcement = require('./models/Announcement');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');

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
    await FarmerGroup.deleteMany({});
    await AdviceArticle.deleteMany({});
    await Video.deleteMany({});
    await Expert.deleteMany({});
    await Announcement.deleteMany({});
    await Conversation.deleteMany({});
    await Message.deleteMany({});

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
    await Loan.create([
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

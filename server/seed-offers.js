// Idempotent offers seed: adds/updates the default home-screen offers without
// touching any other collection (safe to run on a live database).
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

const Offer = require('./models/Offer');
const defaultOffers = require('./data/offers');

const seedOffers = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI haipo kwenye .env');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB imeunganishwa kwa ajili ya seed ya ofa...');

    let created = 0;
    let updated = 0;
    for (const offer of defaultOffers) {
      const existing = await Offer.findOne({ title: offer.title });
      if (existing) {
        await Offer.updateOne({ _id: existing._id }, { $set: offer });
        updated += 1;
      } else {
        await Offer.create(offer);
        created += 1;
      }
    }

    console.log(`Ofa ${created} zimeongezwa, ${updated} zimesasishwa.`);
    process.exit(0);
  } catch (error) {
    console.error('Hitilafu wakati wa seed ya ofa:', error.message);
    process.exit(1);
  }
};

seedOffers();

// Idempotent crop type seed: adds the default home categories without
// overwriting a photo an admin has already uploaded.
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

const CropType = require('./models/CropType');
const defaults = require('./data/cropTypes');

const seedCropTypes = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI haipo kwenye .env');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB imeunganishwa kwa ajili ya seed ya aina za mazao...');

    let created = 0;
    let updated = 0;
    for (const item of defaults) {
      const existing = await CropType.findOne({ slug: item.slug });
      if (existing) {
        existing.name = item.name;
        existing.nameEn = item.nameEn;
        existing.icon = item.icon;
        existing.order = item.order;
        if (!existing.image) existing.image = item.image;
        await existing.save();
        updated += 1;
      } else {
        await CropType.create(item);
        created += 1;
      }
    }

    console.log(`Aina za mazao ${created} zimeongezwa, ${updated} zimesasishwa.`);
    process.exit(0);
  } catch (error) {
    console.error('Hitilafu wakati wa seed ya aina za mazao:', error.message);
    process.exit(1);
  }
};

seedCropTypes();

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

// Safely create (or update) the admin user WITHOUT wiping any existing data.
const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB imeunganishwa...');

    const admins = [
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
    ];

    for (const a of admins) {
      const existing = await User.findOne({ email: a.email });
      if (existing) {
        if (existing.role !== 'admin') {
          existing.role = 'admin';
          await existing.save();
          console.log(`Jukumu la ${a.email} limebadilishwa kuwa admin`);
        } else {
          console.log(`${a.email} tayari ni admin (haikubadilishwa nenosiri)`);
        }
      } else {
        await User.create(a);
        console.log(`Admin wengine wameundwa: ${a.email}`);
      }
    }

    console.log('\nAkaunti ya Admin:');
    console.log('  Email: admin@katavi.co.tz');
    console.log('  Nenosiri: Admin@1234');
    process.exit(0);
  } catch (error) {
    console.error('Hitilafu:', error);
    process.exit(1);
  }
};

seedAdmin();

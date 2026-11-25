const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Organization = require('../models/Organization');
const Farm = require('../models/Farm');
const Crop = require('../models/Crop');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { STAFF_ROLES } = require('../middleware/roleCheck');
const { auditRoute } = require('../services/audit.service');
const { sendNotification } = require('../services/notification.service');
const {
  ORG_TYPES,
  slugify,
  withSuffix,
  memberRole,
  canManageMembers,
  canAssignRole,
  canRemoveMember,
  roleCounts,
} = require('../services/organization.service');

const notify = async (userId, payload) => {
  if (!userId) return;
  try {
    await sendNotification(userId, { type: 'system', ...payload });
  } catch (e) { /* best effort */ }
};

const loadOrganization = async (req, res) => {
  const organization = mongoose.isValidObjectId(req.params.id)
    ? await Organization.findById(req.params.id)
    : null;
  if (!organization) {
    res.status(404).json({ message: 'Taasisi haipatikani' });
    return null;
  }
  return organization;
};

const uniqueSlug = async (name) => {
  const base = slugify(name) || 'taasisi';
  for (let attempt = 1; attempt <= 50; attempt += 1) {
    const candidate = withSuffix(base, attempt);
    if (!(await Organization.exists({ slug: candidate }))) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
};

const publicOrganization = (organization, userId) => ({
  ...organization.toObject(),
  myRole: memberRole(organization, userId),
  roleCounts: roleCounts(organization.members),
});

// GET /api/v1/organizations/my — organizations the caller belongs to
router.get('/my', auth, async (req, res) => {
  try {
    const organizations = await Organization.find({ 'members.user': req.user._id })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(organizations.map((organization) => publicOrganization(organization, req.user._id)));
  } catch (error) {
    console.error('My organizations error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/organizations — verified accounts open an institutional account
router.post('/', auth, auditRoute({
  action: 'create_organization',
  category: 'organization',
  targetType: 'Organization',
}), async (req, res) => {
  try {
    const verified = req.user.phoneVerified || req.user.isVerified || STAFF_ROLES.includes(req.user.role);
    if (!verified) {
      return res.status(403).json({ message: 'Thibitisha namba yako ya simu kabla ya kufungua taasisi' });
    }
    const name = String(req.body.name || '').trim();
    if (name.length < 3) {
      return res.status(400).json({ message: 'Jina la taasisi linahitajika' });
    }
    const type = ORG_TYPES.includes(req.body.type) ? req.body.type : 'cooperative';

    const organization = await Organization.create({
      name: name.slice(0, 160),
      slug: await uniqueSlug(name),
      type,
      description: String(req.body.description || '').slice(0, 1000),
      district: String(req.body.district || req.user.district || 'Katavi'),
      ward: String(req.body.ward || req.user.ward || ''),
      contactPhone: String(req.body.contactPhone || req.user.phone || '').slice(0, 30),
      email: String(req.body.email || req.user.email || '').slice(0, 160),
      members: [{ user: req.user._id, role: 'owner', title: 'Mmiliki', joinedAt: new Date() }],
    });

    res.status(201).json(publicOrganization(organization, req.user._id));
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Taarifa za taasisi si sahihi' });
    }
    console.error('Create organization error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/organizations/:id — members and staff only
router.get('/:id', auth, async (req, res) => {
  try {
    const organization = await loadOrganization(req, res);
    if (!organization) return;

    const isStaff = STAFF_ROLES.includes(req.user.role);
    if (!isStaff && !memberRole(organization, req.user._id)) {
      return res.status(403).json({ message: 'Wewe si member wa taasisi hii' });
    }

    const userIds = organization.members.map((member) => member.user);
    const users = await User.find({ _id: { $in: userIds } })
      .select('name phone district ward role phoneVerified isVerified').lean();
    const byId = new Map(users.map((user) => [String(user._id), user]));

    res.json({
      ...publicOrganization(organization, req.user._id),
      members: organization.members.map((member) => ({
        ...member.toObject(),
        profile: byId.get(String(member.user)) || null,
      })),
    });
  } catch (error) {
    console.error('Organization detail error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/v1/organizations/:id — owners and managers edit the profile
router.put('/:id', auth, auditRoute({
  action: 'update_organization',
  category: 'organization',
  targetType: 'Organization',
}), async (req, res) => {
  try {
    const organization = await loadOrganization(req, res);
    if (!organization) return;
    const role = memberRole(organization, req.user._id);
    if (!canManageMembers(role)) {
      return res.status(403).json({ message: 'Huna ruhusa kubadilisha taasisi hii' });
    }

    const body = req.body || {};
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (name.length < 3) return res.status(400).json({ message: 'Jina la taasisi linahitajika' });
      organization.name = name.slice(0, 160);
    }
    if (body.type !== undefined && ORG_TYPES.includes(body.type)) organization.type = body.type;
    if (body.description !== undefined) organization.description = String(body.description).slice(0, 1000);
    if (body.district !== undefined) organization.district = String(body.district);
    if (body.ward !== undefined) organization.ward = String(body.ward);
    if (body.contactPhone !== undefined) organization.contactPhone = String(body.contactPhone).slice(0, 30);
    if (body.email !== undefined) organization.email = String(body.email).slice(0, 160);

    await organization.save();
    res.json(publicOrganization(organization, req.user._id));
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Taarifa za taasisi si sahihi' });
    }
    console.error('Update organization error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/organizations/:id/members — add a member by id, email or phone
router.post('/:id/members', auth, auditRoute({
  action: 'add_organization_member',
  category: 'organization',
  targetType: 'Organization',
}), async (req, res) => {
  try {
    const organization = await loadOrganization(req, res);
    if (!organization) return;
    const actorRole = memberRole(organization, req.user._id);
    if (!canManageMembers(actorRole)) {
      return res.status(403).json({ message: 'Huna ruhusa kuongeza wanachama' });
    }

    const role = req.body.role === 'manager' ? 'manager' : 'member';
    if (!canAssignRole(actorRole, role)) {
      return res.status(403).json({ message: 'Wasimamizi wanaweza kuongeza wanachama wa kawaida pekee' });
    }

    const query = [];
    if (req.body.userId && mongoose.isValidObjectId(req.body.userId)) query.push({ _id: req.body.userId });
    if (req.body.email) query.push({ email: String(req.body.email).toLowerCase().trim() });
    if (req.body.phone) query.push({ phone: String(req.body.phone).trim() });
    if (!query.length) {
      return res.status(400).json({ message: 'Taja barua pepe, namba ya simu au kitambulisho' });
    }

    const user = await User.findOne({ $or: query }).select('name email phone').lean();
    if (!user) return res.status(404).json({ message: 'Mtumiaji huyo hapatikani' });
    if (memberRole(organization, user._id)) {
      return res.status(409).json({ message: 'Mtumiaji tayari ni member wa taasisi hii' });
    }

    organization.members.push({
      user: user._id,
      role,
      title: String(req.body.title || '').slice(0, 80),
      joinedAt: new Date(),
    });
    await organization.save();

    await notify(user._id, {
      title: 'Umeongezwa kwenye Taasisi',
      message: `Umeongezwa kwenye "${organization.name}" kama ${role === 'manager' ? 'meneja' : 'member'}.`,
      link: '/organizations',
      metadata: { organizationId: organization._id, role },
    });

    res.status(201).json(publicOrganization(organization, req.user._id));
  } catch (error) {
    console.error('Add organization member error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PATCH /api/v1/organizations/:id/members/:userId — owner changes roles
router.patch('/:id/members/:userId', auth, auditRoute({
  action: 'update_organization_member',
  category: 'organization',
  targetType: 'Organization',
}), async (req, res) => {
  try {
    const organization = await loadOrganization(req, res);
    if (!organization) return;
    if (memberRole(organization, req.user._id) !== 'owner') {
      return res.status(403).json({ message: 'Mmiliki pekee anaweza kubadili nafasi za wanachama' });
    }
    const target = organization.members.find((row) => String(row.user) === String(req.params.userId));
    if (!target) return res.status(404).json({ message: 'Member huyo hapatikani' });
    if (target.role === 'owner') {
      return res.status(400).json({ message: 'Nafasi ya mmiliki haiwezi kubadilishwa' });
    }

    const role = String(req.body.role || '');
    if (!['manager', 'member'].includes(role)) {
      return res.status(400).json({ message: 'Nafasi si sahihi' });
    }
    target.role = role;
    if (req.body.title !== undefined) target.title = String(req.body.title).slice(0, 80);
    await organization.save();

    await notify(target.user, {
      title: 'Nafasi Yako Imebadilika',
      message: `Nafasi yako katika "${organization.name}" sasa ni ${role === 'manager' ? 'meneja' : 'member'}.`,
      link: '/organizations',
      metadata: { organizationId: organization._id, role },
    });

    res.json(publicOrganization(organization, req.user._id));
  } catch (error) {
    console.error('Update organization member error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// DELETE /api/v1/organizations/:id/members/:userId — remove a member, or leave
router.delete('/:id/members/:userId', auth, auditRoute({
  action: 'remove_organization_member',
  category: 'organization',
  targetType: 'Organization',
}), async (req, res) => {
  try {
    const organization = await loadOrganization(req, res);
    if (!organization) return;

    const target = organization.members.find((row) => String(row.user) === String(req.params.userId));
    if (!target) return res.status(404).json({ message: 'Member huyo hapatikani' });
    if (target.role === 'owner') {
      return res.status(400).json({ message: 'Mmiliki hawezi kuondolewa kwenye taasisi' });
    }

    const isSelf = String(target.user) === String(req.user._id);
    const actorRole = memberRole(organization, req.user._id);
    if (!isSelf && !canRemoveMember(actorRole, target.role)) {
      return res.status(403).json({ message: 'Huna ruhusa kumuondoa member huyu' });
    }

    organization.members = organization.members.filter(
      (row) => String(row.user) !== String(target.user),
    );
    await organization.save();

    if (!isSelf) {
      await notify(target.user, {
        title: 'Umeondolewa kwenye Taasisi',
        message: `Umeondolewa kwenye "${organization.name}".`,
        link: '/organizations',
        metadata: { organizationId: organization._id },
      });
    }

    res.json(publicOrganization(organization, req.user._id));
  } catch (error) {
    console.error('Remove organization member error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/organizations/:id/dashboard — tenant-scoped member activity
router.get('/:id/dashboard', auth, async (req, res) => {
  try {
    const organization = await loadOrganization(req, res);
    if (!organization) return;
    const isStaff = STAFF_ROLES.includes(req.user.role);
    if (!isStaff && !memberRole(organization, req.user._id)) {
      return res.status(403).json({ message: 'Wewe si member wa taasisi hii' });
    }

    const memberIds = organization.members.map((member) => member.user);
    const [farms, listings] = await Promise.all([
      Farm.countDocuments({ user: { $in: memberIds }, isActive: true }),
      Crop.countDocuments({ farmer: { $in: memberIds }, status: 'available' }),
    ]);

    const recent = [...organization.members]
      .sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt))
      .slice(0, 5)
      .map((member) => ({ user: member.user, role: member.role, joinedAt: member.joinedAt }));

    const users = await User.find({
      _id: { $in: recent.map((row) => row.user) },
    }).select('name').lean();
    const names = new Map(users.map((user) => [String(user._id), user.name]));

    res.json({
      organization: {
        id: organization._id,
        name: organization.name,
        slug: organization.slug,
        type: organization.type,
      },
      myRole: memberRole(organization, req.user._id),
      members: roleCounts(organization.members),
      farms,
      listings,
      recentMembers: recent.map((row) => ({ ...row, name: names.get(String(row.user)) || '' })),
    });
  } catch (error) {
    console.error('Organization dashboard error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;

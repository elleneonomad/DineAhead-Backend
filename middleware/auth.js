const { admin, db } = require('../config/firebase');

// Verifies Firebase ID token from Authorization: Bearer <idToken>
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify Firebase ID token
    const decoded = await admin.auth().verifyIdToken(token);

    const uid = decoded.uid;
    const email = decoded.email || null;

    // Ensure profile exists in Firestore at users/{uid}
    const userDocRef = db.collection('users').doc(uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return res.status(403).json({ error: 'User profile not found' });
    }

    const profile = userDoc.data();

    req.user = {
      userId: uid,
      email,
      role: profile.role,
      ...profile
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid or expired Firebase ID token' });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.role;
    if (!roles.includes(userRole)) {
      return res.status(403).json({ error: `Access denied. Required roles: ${roles.join(', ')}` });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole
};

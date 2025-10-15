const axios = require('axios');
const { admin, db } = require('../config/firebase');

// Helper to hit Firebase Auth REST API
const getApiKey = () => process.env.FIREBASE_WEB_API_KEY;

const register = async (req, res, next) => {
  try {
    const { email, password, role, firstName, lastName, phone } = req.body;

    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`.trim(),
      // phoneNumber: phone && phone.startsWith('+') ? phone : undefined // optional if valid E.164
    });

    const uid = userRecord.uid;

    // Create Firestore profile (no password stored)
    const profile = {
      email,
      role,
      firstName,
      lastName,
      phone: phone || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
      ...(role === 'merchant' ? { restaurant: null, isVerified: false } : {})
    };

    await db.collection('users').doc(uid).set(profile, { merge: true });

    // Optionally sign-in and return ID token if API key is configured
    const apiKey = getApiKey();
    let tokens = undefined;
    if (apiKey) {
      const resp = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
        { email, password, returnSecureToken: true }
      );
      tokens = {
        idToken: resp.data.idToken,
        refreshToken: resp.data.refreshToken,
        expiresIn: resp.data.expiresIn,
        uid
      };
    }

    res.status(201).json({
      message: 'User registered successfully with Firebase Auth',
      user: { userId: uid, email, role, firstName, lastName, phone },
      ...(tokens ? { tokens } : {})
    });
  } catch (error) {
    // Map Firebase Auth errors
    if (error.response && error.response.data && error.response.data.error) {
      const code = error.response.data.error.message;
      return res.status(400).json({ error: code });
    }
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const apiKey = getApiKey();

    if (!apiKey) {
      return res.status(500).json({
        error: 'FIREBASE_WEB_API_KEY is not configured on the server. Either configure it to enable email/password login on the backend, or perform Firebase Auth login on the client and send the ID token to this API.'
      });
    }

    // Sign in via Firebase Auth REST API
    const resp = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      { email, password, returnSecureToken: true }
    );

    const { idToken, refreshToken, expiresIn, localId: uid } = resp.data;

    // Ensure profile exists
    const userDocRef = db.collection('users').doc(uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      // Create a minimal profile if missing
      await userDocRef.set({
        email,
        role: 'user',
        firstName: '',
        lastName: '',
        phone: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true
      }, { merge: true });
    } else {
      await userDocRef.update({ lastLogin: new Date().toISOString() });
    }

    const profile = (await userDocRef.get()).data();

    res.json({
      message: 'Login successful (Firebase Auth)',
      user: { userId: uid, email, role: profile.role, firstName: profile.firstName, lastName: profile.lastName, phone: profile.phone },
      tokens: { idToken, refreshToken, expiresIn, uid }
    });
  } catch (error) {
    if (error.response && error.response.data && error.response.data.error) {
      const code = error.response.data.error.message;
      return res.status(401).json({ error: code });
    }
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const apiKey = getApiKey();
    const { refreshToken } = req.body;

    if (!apiKey) {
      return res.status(500).json({ error: 'FIREBASE_WEB_API_KEY is not configured on the server.' });
    }
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const resp = await axios.post(
      `https://securetoken.googleapis.com/v1/token?key=${apiKey}`,
      new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    res.json({
      idToken: resp.data.id_token,
      refreshToken: resp.data.refresh_token,
      expiresIn: resp.data.expires_in,
      uid: resp.data.user_id
    });
  } catch (error) {
    if (error.response && error.response.data && error.response.data.error) {
      return res.status(401).json({ error: error.response.data.error.message });
    }
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    // Optionally revoke refresh tokens for current user
    const { uid } = req.body;
    if (uid) {
      await admin.auth().revokeRefreshTokens(uid);
    }
    res.json({ message: 'Logged out (tokens revoked if uid provided)' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout
};

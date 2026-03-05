/**
 * @fileoverview Controller for user management.
 * Provides functions for user registration, profile access, and admin actions.
 * All new users are registered with role "guest" by default.
 * @module controllers/userController
 */

import { User } from '../models/User.js';
import admin from 'firebase-admin';

/**
 * Registers a new user with Firebase and MongoDB.
 * All users start with role "guest".
 *
 * @async
 * @function registerUser
 * @param {Request} req - Express request object containing idToken, username, and optional team.
 * @param {Response} res - Express response object used to send results.
 * @returns {Promise<void>} Sends JSON response with success message and user data.
 */
export const registerUser = async (req, res) => {
  const { idToken, username, team } = req.body;

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const email = decoded.email;
    const firebaseUid = decoded.uid;

    const user = await User.create({
      firebaseUid,
      username,
      email,
      role: 'guest',
      team: team || null, 
      joinedAt: new Date(),
    });

    res.status(201).json({ message: 'User registered successfully', user });
  } catch (error) {
    console.error('❌ Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
};

/**
 * Retrieves the current authenticated user's profile.
 *
 * @async
 * @function getCurrentUser
 * @param {Request} req - Express request object containing authenticated user info.
 * @param {Response} res - Express response object used to send results.
 * @returns {Promise<void>} Sends JSON response with user profile or error message.
 */
export const getCurrentUser = async (req, res) => {
  try {
    const { firebaseUid, email } = req.user;
    if (!firebaseUid || !email) {
      return res.status(400).json({ error: 'User data incomplete' });
    }

    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      _id: user._id,
      email: user.email,
      role: user.role,
      team: user.team, 
      uid: user.firebaseUid,
      joinedAt: user.joinedAt,
      updatedAt: user.updatedAt,
    });
  } catch (err) {
    console.error('❌ Error in /api/users/me:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get public user info (username, email, _id, team).
 *
 * @async
 * @function getPublicUsers
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @returns {Promise<void>} Sends JSON response with public user info.
 */
export const getPublicUsers = async (req, res) => {
  try {
    const users = await User.find({}, 'username email _id team');
    res.json(users);
  } catch (error) {
    console.error('Error retrieving public users:', error.message);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
};

/**
 * Retrieves all users (admin only).
 *
 * @async
 * @function getUsers
 * @param {Request} req - Express request object containing authenticated user info.
 * @param {Response} res - Express response object used to send results.
 * @returns {Promise<void>} Sends JSON response with list of users or error message.
 */
export const getUsers = async (req, res) => {
  try {
  const users = await User.find({}, 'username email role firebaseUid team').lean();
    console.log('Users found:', users);
    res.json(users);
  } catch (error) {
    console.error('❌ Error retrieving users:', error.message);
    res.status(500).json({ error: 'Error retrieving users' });
  }
};

/**
 * Updates a user's team.
 *
 * @async
 * @function updateUserTeam
 * @param {Request} req - Express request object containing firebaseUid in params and team in body.
 * @param {Response} res - Express response object used to send results.
 * @returns {Promise<void>} Sends JSON response with success message and updated user data.
 */
export const updateUserTeam = async (req, res) => {
  const { firebaseUid } = req.params;
  const { team } = req.body;

  try {
    const user = await User.findOneAndUpdate(
      { firebaseUid },
      { team },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User team updated successfully', user });
  } catch (error) {
    console.error('❌ Error updating user team:', error.message);
    res.status(500).json({ error: 'Failed to update user team' });
  }
};

import prisma from '../../config/database.js';
import { NotFoundError } from '../../utils/api-error.js';

/**
 * Get user profile by ID, including driver info if applicable.
 */
export const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      fullName: true,
      phoneNumber: true,
      createdAt: true,
      driver: {
        select: {
          id: true,
          vehicleType: true,
          licensePlate: true,
          rating: true,
          isActive: true,
          approvalStatus: true,
        },
      },
    },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return user;
};

/**
 * Update user profile.
 */
export const updateProfile = async (userId, data) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      role: true,
      fullName: true,
      phoneNumber: true,
    },
  });

  return user;
};

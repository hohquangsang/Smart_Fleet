import prisma from '../../config/database.js';
import { BadRequestError } from '../../utils/api-error.js';
import { ORDER_STATUS, ACTOR_TYPE } from '../../utils/constants.js';

/**
 * Valid Order Status Transition Matrix
 */
const VALID_TRANSITIONS = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.DISPATCHING, ORDER_STATUS.CANCELLED, ORDER_STATUS.EXPIRED_NO_DRIVER],
  [ORDER_STATUS.DISPATCHING]: [ORDER_STATUS.DRIVER_ACCEPTED, ORDER_STATUS.CANCELLED, ORDER_STATUS.EXPIRED_NO_DRIVER],
  [ORDER_STATUS.DRIVER_ACCEPTED]: [ORDER_STATUS.MATCHED, ORDER_STATUS.CANCELLED, ORDER_STATUS.DISPATCHING],
  [ORDER_STATUS.MATCHED]: [ORDER_STATUS.IN_TRANSIT, ORDER_STATUS.PICKED_UP, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.IN_TRANSIT]: [ORDER_STATUS.COMPLETED, ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PICKED_UP]: [ORDER_STATUS.DELIVERED, ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.COMPLETED]: [],
  [ORDER_STATUS.DELIVERED]: [],
  [ORDER_STATUS.CANCELLED]: [],
  [ORDER_STATUS.EXPIRED_NO_DRIVER]: [ORDER_STATUS.DISPATCHING], // Allowed if admin retries dispatch
};

/**
 * Transition Order Status safely through state machine.
 *
 * @param {string} orderId
 * @param {string} toStatus
 * @param {object} options
 * @param {string} options.actorType - CUSTOMER, ADMIN, DRIVER, SYSTEM
 * @param {string} [options.actorId]
 * @param {string} [options.driverId]
 * @param {string} [options.cancelReason]
 * @returns {Promise<import('@prisma/client').Order>}
 */
export const transitionOrderStatus = async (orderId, toStatus, { actorType = ACTOR_TYPE.SYSTEM, actorId = null, driverId = null, cancelReason = null } = {}) => {
  const currentOrder = await prisma.order.findUnique({ where: { id: orderId } });
  if (!currentOrder) {
    throw new BadRequestError('Order not found');
  }

  const fromStatus = currentOrder.status;

  // Skip if status is unchanged
  if (fromStatus === toStatus) {
    return currentOrder;
  }

  const allowedNext = VALID_TRANSITIONS[fromStatus] || [];
  if (!allowedNext.includes(toStatus)) {
    throw new BadRequestError(`Invalid status transition from ${fromStatus} to ${toStatus}`);
  }

  const now = new Date();
  const updateData = { status: toStatus };

  if (driverId) updateData.driverId = driverId;
  if (cancelReason) updateData.cancelReason = cancelReason;

  if (toStatus === ORDER_STATUS.DISPATCHING) updateData.dispatchedAt = now;
  if (toStatus === ORDER_STATUS.DRIVER_ACCEPTED) updateData.acceptedAt = now;
  if (toStatus === ORDER_STATUS.MATCHED) updateData.matchedAt = now;

  // Run DB update and status history logging inside a transaction
  const [updatedOrder] = await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        customer: { select: { id: true, fullName: true, phoneNumber: true, email: true } },
        driver: {
          include: {
            user: { select: { fullName: true, phoneNumber: true } },
          },
        },
      },
    }),
    prisma.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus,
        toStatus,
        actorType,
        actorId,
      },
    }),
  ]);

  return updatedOrder;
};

export default { transitionOrderStatus };

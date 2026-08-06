import * as orderService from './order.service.js';
import catchAsync from '../../utils/catch-async.js';
import { ROLES } from '../../utils/constants.js';

export const createOrder = catchAsync(async (req, res) => {
  const result = await orderService.createOrder(req.user.id, req.body);

  res.status(201).json({
    success: true,
    message: 'Order created successfully. Finding a driver...',
    data: result,
  });
});

export const getOrders = catchAsync(async (req, res) => {
  const { page, limit, status } = req.query;

  let result;
  if (req.user.role === ROLES.CUSTOMER) {
    result = await orderService.getCustomerOrders(req.user.id, { page, limit, status });
  } else if (req.user.role === ROLES.DRIVER) {
    result = await orderService.getDriverOrders(req.user.id, { page, limit, status });
  }

  res.status(200).json({
    success: true,
    data: result,
  });
});

export const getOrderById = catchAsync(async (req, res) => {
  const order = await orderService.getOrderById(req.params.id);

  res.status(200).json({
    success: true,
    data: { order },
  });
});

export const updateStatus = catchAsync(async (req, res) => {
  const order = await orderService.updateOrderStatus(
    req.user.id,
    req.params.id,
    req.body.status
  );

  res.status(200).json({
    success: true,
    message: `Order status updated to ${order.status}`,
    data: { order },
  });
});

export const cancelOrder = catchAsync(async (req, res) => {
  const order = await orderService.cancelOrder(req.user.id, req.params.id);

  res.status(200).json({
    success: true,
    message: 'Order cancelled',
    data: { order },
  });
});

import * as orderService from './order.service.js';
import catchAsync from '../../utils/catch-async.js';
import { ROLES, ACTOR_TYPE } from '../../utils/constants.js';

export const createOrder = catchAsync(async (req, res) => {
  const result = await orderService.createOrder(req.user.id, req.body);

  res.status(201).json({
    success: true,
    message: 'Order created successfully. Finding a driver...',
    data: result,
  });
});

export const dispatchOrder = catchAsync(async (req, res) => {
  const order = await orderService.dispatchOrder(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Order dispatched to online drivers',
    data: { order },
  });
});

export const acceptOrder = catchAsync(async (req, res) => {
  const order = await orderService.acceptOrder(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Order accepted by driver',
    data: { order },
  });
});

export const declineOrder = catchAsync(async (req, res) => {
  const result = await orderService.declineOrder(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

export const confirmMatchOrder = catchAsync(async (req, res) => {
  const order = await orderService.confirmMatchOrder(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Order matched and customer notified',
    data: { order },
  });
});

export const startTrip = catchAsync(async (req, res) => {
  const order = await orderService.startTrip(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Trip started — status is now ĐANG GIAO',
    data: { order },
  });
});

export const completeTrip = catchAsync(async (req, res) => {
  const order = await orderService.completeTrip(req.params.id, req.user.id, req.body);

  res.status(200).json({
    success: true,
    message: 'Trip completed successfully — status is now ĐÃ GIAO HÀNG',
    data: { order },
  });
});

export const rateOrder = catchAsync(async (req, res) => {
  const order = await orderService.rateOrder(req.params.id, req.user.id, req.body);

  res.status(200).json({
    success: true,
    message: 'Cảm ơn bạn đã đánh giá chuyến xe!',
    data: { order },
  });
});

export const updateOrderStatus = catchAsync(async (req, res) => {
  const { status } = req.body;
  let order;
  if (status === 'IN_TRANSIT') {
    order = await orderService.startTrip(req.params.id, req.user.id);
  } else if (status === 'DELIVERED' || status === 'COMPLETED') {
    order = await orderService.completeTrip(req.params.id, req.user.id, req.body);
  } else {
    order = await orderService.getOrderById(req.params.id);
  }

  res.status(200).json({
    success: true,
    message: `Trạng thái đơn hàng đã chuyển sang ${status}`,
    data: { order },
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

export const cancelOrder = catchAsync(async (req, res) => {
  const actorType = req.user.role === ROLES.ADMIN ? ACTOR_TYPE.ADMIN : ACTOR_TYPE.CUSTOMER;
  const order = await orderService.cancelOrder(req.params.id, req.user.id, actorType, req.body.reason);

  res.status(200).json({
    success: true,
    message: 'Order cancelled',
    data: { order },
  });
});

export const getAvailableDispatchOrder = catchAsync(async (req, res) => {
  const order = await orderService.getAvailableDispatchOrder(req.user.id);

  res.status(200).json({
    success: true,
    data: { order },
  });
});

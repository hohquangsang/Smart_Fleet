import * as driverService from './driver.service.js';
import catchAsync from '../../utils/catch-async.js';

export const getProfile = catchAsync(async (req, res) => {
  const driver = await driverService.getDriverProfile(req.user.id);

  res.status(200).json({
    success: true,
    data: { driver },
  });
});

export const toggleStatus = catchAsync(async (req, res) => {
  const result = await driverService.toggleStatus(req.user.id, req.body);

  res.status(200).json({
    success: true,
    message: `Driver is now ${result.status}`,
    data: result,
  });
});

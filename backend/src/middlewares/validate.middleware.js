import { BadRequestError } from '../utils/api-error.js';

/**
 * Zod validation middleware factory.
 * Validates req.body, req.query, or req.params against a Zod schema.
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {'body' | 'query' | 'params'} source - Which part of request to validate
 * @returns {Function} Express middleware
 *
 * @example
 * router.post('/orders', validate(createOrderSchema), controller);
 */
const validate = (schema, source = 'body') => {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      const firstMsg = errors[0]?.message || 'Dữ liệu không hợp lệ';
      return next(new BadRequestError(firstMsg, errors));
    }

    if (source === 'query') {
      Object.assign(req.query, result.data);
    } else {
      req[source] = result.data;
    }

    next();
  };
};

export default validate;

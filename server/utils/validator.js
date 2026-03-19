/**
 * BACKEND MODULE - Input Validator (Dev 4)
 */
function requireFields(body, fields) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || body[f] === '');
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
}

module.exports = { requireFields };
